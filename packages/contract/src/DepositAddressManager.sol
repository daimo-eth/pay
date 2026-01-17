// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";
import "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./DepositAddressFactory.sol";
import "./DepositAddress.sol";
import "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./SwapMath.sol";
import "./interfaces/IDaimoPayBridger.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Central escrow contract that manages the lifecycle of Deposit
///         Addresses
contract DepositAddressManager is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

    /// Sentinel value used to mark a transfer claimed.
    address public constant ADDR_MAX =
        0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Factory responsible for deploying deterministic Deposit Addresses.
    DepositAddressFactory public depositAddressFactory;

    /// Dedicated contract that performs swap / contract calls on behalf of the
    /// manager.
    DaimoPayExecutor public executor;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// Authorized relayer addresses.
    mapping(address relayer => bool authorized) public relayerAuthorized;

    /// On the source chain, record receiver addresses that have been used.
    mapping(address receiver => bool used) public receiverUsed;

    /// On the destination chain, map receiver address to status:
    /// - address(0) = not finished.
    /// - Relayer address = fast-finished, awaiting claim to repay relayer.
    /// - ADDR_MAX = claimed. any additional funds received are refunded.
    mapping(address receiver => address recipient) public receiverToRecipient;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event RelayerAuthorized(address indexed relayer, bool authorized);

    event Start(
        address indexed depositAddress,
        address indexed receiverAddress,
        DepositAddressRoute route,
        DepositAddressIntent intent,
        address paymentToken,
        uint256 paymentAmount
    );
    event FastFinish(
        address indexed depositAddress,
        address indexed receiverAddress,
        address indexed newRecipient,
        DepositAddressRoute route,
        DepositAddressIntent intent,
        uint256 outputAmount
    );
    event Claim(
        address indexed depositAddress,
        address indexed receiverAddress,
        address indexed finalRecipient,
        DepositAddressRoute route,
        DepositAddressIntent intent,
        uint256 outputAmount
    );
    event SameChainFinish(
        address indexed depositAddress,
        DepositAddressRoute route,
        address paymentToken,
        uint256 paymentAmount,
        uint256 outputAmount
    );
    event Refund(
        address indexed depositAddress,
        DepositAddressRoute route,
        address refundAddress,
        IERC20[] tokens,
        uint256[] amounts
    );

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Only allow designated relayers to call certain functions.
    modifier onlyRelayer() {
        require(relayerAuthorized[msg.sender], "DAM: not relayer");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor & Initializer
    // ---------------------------------------------------------------------

    /// @dev Disable initializers on the implementation contract.
    constructor() {
        _disableInitializers();
    }

    // Accept native asset deposits (for swaps).
    receive() external payable {}

    /// @notice Initialize the contract.
    function initialize(
        address _owner,
        DepositAddressFactory _depositAddressFactory
    ) external initializer {
        __ReentrancyGuard_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        depositAddressFactory = _depositAddressFactory;
        executor = new DaimoPayExecutor(address(this));
    }

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Initiates a cross-chain transfer by pulling funds from the
    ///         Universal Address vault, executing swaps if needed, and
    ///         initiating a bridge to the destination chain.
    /// @dev Must be called on the source chain. Creates a deterministic
    ///      receiver address on the destination chain and bridges the
    ///      specified token amount to it.
    /// @param route           The cross-chain route containing destination
    ///                        chain, recipient, and token details
    /// @param paymentToken    The token the user paid the intent.
    /// @param bridgeTokenOut  The token and amount to be bridged to the
    ///                        destination chain
    /// @param relaySalt       Unique salt provided by the relayer to generate
    ///                        a unique receiver address
    /// @param calls           Optional swap calls to convert payment token to
    ///                        required bridge input token
    /// @param bridgeExtraData Additional data required by the specific bridge
    ///                        implementation
    function startIntent(
        DepositAddressRoute calldata route,
        IERC20 paymentToken,
        TokenAmount calldata bridgeTokenOut,
        PriceData calldata paymentTokenPrice,
        PriceData calldata bridgeTokenInPrice,
        bytes32 relaySalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant onlyRelayer {
        require(block.chainid != route.toChainId, "DAM: start on dest chain");
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(!isRouteExpired(route), "DAM: expired");

        bool paymentTokenPriceValid = route.pricer.validatePrice(
            paymentTokenPrice
        );
        bool bridgeTokenInPriceValid = route.pricer.validatePrice(
            bridgeTokenInPrice
        );
        require(paymentTokenPriceValid, "DAM: payment price invalid");
        require(bridgeTokenInPriceValid, "DAM: bridge price invalid");

        // Deploy (or fetch) deposit address vault
        DepositAddress vault = depositAddressFactory.createDepositAddress(
            route
        );

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: block.chainid
        });
        (address receiverAddress, ) = computeReceiverAddress(intent);

        // Generate a unique receiver address for each bridge transfer. Without
        // this check, a malicious relayer could reuse the same receiver address
        // to claim multiple bridge transfers, double-paying themselves.
        require(!receiverUsed[receiverAddress], "DAM: receiver used");
        receiverUsed[receiverAddress] = true;

        // Quote bridge input requirements.
        (address bridgeTokenIn, uint256 inAmount) = route
            .bridger
            .getBridgeTokenIn({
                toChainId: route.toChainId,
                bridgeTokenOut: bridgeTokenOut
            });
        require(
            bridgeTokenIn == address(bridgeTokenInPrice.token),
            "DAM: bridge token mismatch"
        );

        // Send payment token to executor
        uint256 paymentAmount = vault.sendBalance({
            route: route,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Validate the inAmount is above the minimum output required by the
        // swap.
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: bridgeTokenInPrice,
            sellAmount: paymentAmount,
            maxSlippage: route.maxStartSlippageBps
        });
        require(inAmount >= minSwapOutput.amount, "DAM: bridge input low");

        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary.
        // The executor contract checks that the output is sufficient. Any
        // surplus tokens are given to the relayer.
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: IERC20(bridgeTokenIn),
            amount: inAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        // Approve bridger and initiate bridging
        IERC20(bridgeTokenIn).forceApprove({
            spender: address(route.bridger),
            value: inAmount
        });
        route.bridger.sendToChain({
            toChainId: route.toChainId,
            toAddress: receiverAddress,
            bridgeTokenOut: bridgeTokenOut,
            // Refund to the vault so that startIntent can be retried
            refundAddress: address(vault),
            extraData: bridgeExtraData
        });

        emit Start({
            depositAddress: address(vault),
            receiverAddress: receiverAddress,
            route: route,
            intent: intent,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount
        });
    }

    /// @notice Send funds that are already on the destination chain.
    ///
    /// @param route        The DepositAddressRoute for the intent
    /// @param paymentToken Token to be used to pay the intent
    /// @param toAmount     The amount of `toToken` to deliver to the recipient
    /// @param calls        Arbitrary swap calls to be executed by the executor
    ///                     Can be empty when assets are already `toToken`
    function sameChainFinishIntent(
        DepositAddressRoute calldata route,
        IERC20 paymentToken,
        PriceData calldata paymentTokenPrice,
        PriceData calldata toTokenPrice,
        uint256 toAmount,
        Call[] calldata calls
    ) external nonReentrant onlyRelayer {
        require(route.toChainId == block.chainid, "DAM: wrong chain");
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(!isRouteExpired(route), "DAM: expired");

        bool paymentTokenPriceValid = route.pricer.validatePrice(
            paymentTokenPrice
        );
        bool toTokenPriceValid = route.pricer.validatePrice(toTokenPrice);
        require(paymentTokenPriceValid, "DAM: payment price invalid");
        require(toTokenPriceValid, "DAM: toToken price invalid");

        // Deploy (or fetch) the Deposit Address for this route.
        DepositAddress vault = depositAddressFactory.createDepositAddress(
            route
        );

        // Pull specified token balances from the vault into the executor.
        uint256 paymentAmount = vault.sendBalance({
            route: route,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Validate the toAmount is above the minimum output required by the
        // swap.
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: toTokenPrice,
            sellAmount: paymentAmount,
            maxSlippage: route.maxSameChainFinishSlippageBps
        });
        require(toAmount >= minSwapOutput.amount, "DAM: toAmount low");

        // Finish the intent: send exactly toAmount to user, surplus to relayer
        _finishIntent({
            route: route,
            calls: calls,
            outputAmount: toAmount,
            surplusRecipient: payable(msg.sender)
        });

        emit SameChainFinish({
            depositAddress: address(vault),
            route: route,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount,
            outputAmount: toAmount
        });
    }

    /// @notice Allows a relayer to deliver funds early on the destination chain
    ///         before the bridge transfer completes.
    /// @dev Must be called on the destination chain. The relayer sends their
    ///      own funds to complete the intent atomically before calling fastFinish,
    ///      and is recorded as the recipient for the eventual bridged tokens.
    /// @param route           The DepositAddressRoute for the intent
    /// @param calls           Arbitrary swap calls to be executed by the executor
    /// @param token           The token sent by the relayer
    /// @param bridgeTokenOut  The token and amount expected from the bridge
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    /// @param toAmount        The amount of toToken to deliver to the recipient.
    ///                        Must be >= the minimum computed from price data.
    function fastFinishIntent(
        DepositAddressRoute calldata route,
        Call[] calldata calls,
        IERC20 token,
        PriceData calldata bridgeTokenOutPrice,
        PriceData calldata toTokenPrice,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId,
        uint256 toAmount
    ) external nonReentrant onlyRelayer {
        require(sourceChainId != block.chainid, "DAM: same chain finish");
        require(route.toChainId == block.chainid, "DAM: wrong chain");
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(!isRouteExpired(route), "DAM: expired");

        bool bridgeTokenOutPriceValid = route.pricer.validatePrice(
            bridgeTokenOutPrice
        );
        bool toTokenPriceValid = route.pricer.validatePrice(toTokenPrice);
        require(
            bridgeTokenOutPriceValid,
            "DAM: bridge token out price invalid"
        );
        require(toTokenPriceValid, "DAM: toToken price invalid");

        // Calculate salt for this bridge transfer.
        address depositAddress = depositAddressFactory.getDepositAddress(route);
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: sourceChainId
        });
        (address receiverAddress, ) = computeReceiverAddress(intent);

        // Check that the salt hasn't already been fast finished or claimed.
        require(
            receiverToRecipient[receiverAddress] == address(0),
            "DAM: already finished"
        );
        // Record relayer as new recipient when the bridged tokens arrive
        receiverToRecipient[receiverAddress] = msg.sender;

        // Validate toAmount is above the minimum output required by price data
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: bridgeTokenOutPrice,
            buyTokenPrice: toTokenPrice,
            sellAmount: bridgeTokenOut.amount,
            maxSlippage: route.maxFastFinishSlippageBps
        });
        require(toAmount >= minSwapOutput.amount, "DAM: toAmount low");

        // Transfer relayer's tokens to the executor for the swap
        TokenUtils.transferBalance({
            token: token,
            recipient: payable(address(executor))
        });

        // Finish the intent: send exactly toAmount to user, surplus to relayer
        _finishIntent({
            route: route,
            calls: calls,
            outputAmount: toAmount,
            surplusRecipient: payable(msg.sender)
        });

        emit FastFinish({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            newRecipient: msg.sender,
            route: route,
            intent: intent,
            outputAmount: toAmount
        });
    }

    /// @notice Completes an intent after bridged tokens arrive on the destination
    ///         chain, either repaying a relayer or fulfilling the intent directly.
    /// @param route           The DepositAddressRoute for the intent
    /// @param calls           Arbitrary swap from bridgeTokenOut to toToken
    /// @param bridgeTokenOut  The token and amount that was bridged
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    /// @param toAmount        The amount of toToken to deliver to the recipient
    ///                        when no fast finish occurred. Must be >= minimum
    ///                        computed from price data.
    function claimIntent(
        DepositAddressRoute calldata route,
        Call[] calldata calls,
        TokenAmount calldata bridgeTokenOut,
        PriceData calldata bridgeTokenOutPrice,
        PriceData calldata toTokenPrice,
        bytes32 relaySalt,
        uint256 sourceChainId,
        uint256 toAmount
    ) external nonReentrant onlyRelayer {
        require(route.toChainId == block.chainid, "DAM: wrong chain");
        require(route.escrow == address(this), "DAM: wrong escrow");

        // Calculate salt for this bridge transfer.
        address depositAddress = depositAddressFactory.getDepositAddress(route);
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: sourceChainId
        });
        (address receiverAddress, bytes32 recvSalt) = computeReceiverAddress(
            intent
        );

        // Check the recipient for this intent.
        address recipient = receiverToRecipient[receiverAddress];
        require(recipient != ADDR_MAX, "DAM: already claimed");
        // Mark intent as claimed
        receiverToRecipient[receiverAddress] = ADDR_MAX;

        // Deploy DepositAddressReceiver if necessary then sweep tokens.
        DepositAddressReceiver receiver;
        if (receiverAddress.code.length == 0) {
            receiver = new DepositAddressReceiver{salt: recvSalt}();
            require(receiverAddress == address(receiver), "DAM: receiver");
        } else {
            receiver = DepositAddressReceiver(payable(receiverAddress));
        }

        // Pull bridged tokens from the deterministic receiver into this contract.
        uint256 bridgedAmount = receiver.pull(bridgeTokenOut.token);

        // Check that sufficient amount was bridged.
        require(
            bridgedAmount >= bridgeTokenOut.amount,
            "DAM: insufficient bridge"
        );

        uint256 outputAmount = 0;
        if (recipient == address(0)) {
            // Validate prices
            bool bridgeTokenOutPriceValid = route.pricer.validatePrice(
                bridgeTokenOutPrice
            );
            bool toTokenPriceValid = route.pricer.validatePrice(toTokenPrice);
            require(
                bridgeTokenOutPriceValid,
                "DAM: bridge token out price invalid"
            );
            require(toTokenPriceValid, "DAM: toToken price invalid");

            // No relayer showed up, so just complete the intent. Update the
            // recipient to the route's recipient.
            recipient = route.toAddress;

            // Validate toAmount is above the minimum output required by price data
            TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
                sellTokenPrice: bridgeTokenOutPrice,
                buyTokenPrice: toTokenPrice,
                sellAmount: bridgedAmount,
                maxSlippage: route.maxFastFinishSlippageBps
            });
            require(toAmount >= minSwapOutput.amount, "DAM: toAmount low");

            // Send tokens to the executor contract to run relayer-provided
            // calls in _finishIntent.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(address(executor)),
                amount: bridgedAmount
            });

            // Finish the intent: send exactly toAmount to user, surplus to relayer
            _finishIntent({
                route: route,
                calls: calls,
                outputAmount: toAmount,
                surplusRecipient: payable(msg.sender)
            });
            outputAmount = toAmount;
        } else {
            // Otherwise, the relayer fastFinished the intent. Repay them.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(recipient),
                amount: bridgedAmount
            });
            outputAmount = bridgedAmount;
        }

        emit Claim({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            finalRecipient: recipient,
            route: route,
            intent: intent,
            outputAmount: outputAmount
        });
    }

    /// @notice Refunds tokens from a Deposit Address vault to its designated
    ///         refund address after the deposit address has expired.
    /// @param route The Deposit Address route containing the refund address
    /// @param tokens The tokens to refund from the vault
    /// @dev Refunds are only allowed after the deposit address expires
    function refundIntent(
        DepositAddressRoute calldata route,
        IERC20[] calldata tokens
    ) external nonReentrant {
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(isRouteExpired(route), "DAM: not expired");

        // Deploy (or fetch) the Deposit Address for this route
        DepositAddress vault = depositAddressFactory.createDepositAddress(
            route
        );

        // Send refund to the designated refund address
        uint256[] memory amounts = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; ++i) {
            amounts[i] = vault.sendBalance({
                route: route,
                token: tokens[i],
                recipient: payable(route.refundAddress)
            });
        }

        emit Refund({
            depositAddress: address(vault),
            route: route,
            refundAddress: route.refundAddress,
            tokens: tokens,
            amounts: amounts
        });
    }

    /// @notice Computes a deterministic DepositAddressReceiver address.
    /// @param intent The bridge intent
    /// @return addr The computed address for the DepositAddressReceiver contract
    /// @return recvSalt The CREATE2 salt used to deploy the DepositAddressReceiver
    function computeReceiverAddress(
        DepositAddressIntent memory intent
    ) public view returns (address payable addr, bytes32 recvSalt) {
        recvSalt = keccak256(abi.encode(intent));
        bytes memory initCode = type(DepositAddressReceiver).creationCode;
        addr = payable(Create2.computeAddress(recvSalt, keccak256(initCode)));
    }

    /// @notice Checks if a Deposit Address route has expired.
    /// @param route The Deposit Address route to check
    /// @return true if the route has expired, false otherwise
    function isRouteExpired(
        DepositAddressRoute calldata route
    ) public view returns (bool) {
        return block.timestamp >= route.expiresAt;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Internal helper that completes an intent by executing swaps,
    ///      delivering an exact amount of toToken to the recipient, and sending
    ///      any surplus to the specified address.
    ///      Precondition: input tokens must already be in PayExecutor.
    ///      Use this for fastFinish/sameChainFinish where relayer gets surplus.
    /// @param route            The DepositAddressRoute containing recipient details
    /// @param calls            Arbitrary swap calls to be executed by the executor
    /// @param outputAmount     The exact amount of target token to deliver to the
    ///                         recipient
    /// @param surplusRecipient The address to receive any surplus tokens from the
    ///                         swap
    function _finishIntent(
        DepositAddressRoute calldata route,
        Call[] calldata calls,
        uint256 outputAmount,
        address payable surplusRecipient
    ) internal {
        // Run arbitrary calls provided by the relayer to create toToken.
        // Send exactly outputAmount to the recipient, surplus to surplusRecipient.
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: route.toToken,
            amount: outputAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(route.toAddress),
            surplusRecipient: surplusRecipient
        });
    }

    // ---------------------------------------------------------------------
    // UUPS upgrade authorization
    // ---------------------------------------------------------------------

    /// @dev Restrict upgrades to the contract owner.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // ---------------------------------------------------------------------
    // Admin functions
    // ---------------------------------------------------------------------

    /// @notice Set the authorized relayer address.
    /// @param relayer The address of the new relayer
    /// @param authorized Whether the relayer is authorized
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        relayerAuthorized[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }

    // ---------------------------------------------------------------------
    // Storage gap for upgradeability
    // ---------------------------------------------------------------------

    uint256[50] private __gap;
}

// ---------------------------------------------------------------------
// Minimal deterministic receiver
// ---------------------------------------------------------------------

/// @notice Minimal deterministic contract that receives bridged tokens and
///         allows the Deposit Address Manager to sweep them.
/// @dev Deployed via CREATE2 using a salt that encodes bridge transfer
///      parameters into the deployment address, creating predictable addresses
///      that are unique to each bridge transfer. Only the deploying manager
///      can pull funds from this contract.
contract DepositAddressReceiver {
    using SafeERC20 for IERC20;

    /// @notice Address allowed to pull funds from this contract
    address payable public immutable depositAddressManager;

    constructor() {
        depositAddressManager = payable(msg.sender);

        // Emit event for any ETH that arrived before deployment
        if (address(this).balance > 0) {
            emit NativeTransfer(
                address(0),
                address(this),
                address(this).balance
            );
        }
    }

    // Accept native asset deposits.
    receive() external payable {
        emit NativeTransfer(msg.sender, address(this), msg.value);
    }

    /// @notice Sweep entire balance of `token` (ERC20 or native when
    ///         token == IERC20(address(0))) to the deployer address.
    /// @return amount The amount of tokens pulled
    function pull(IERC20 token) external returns (uint256) {
        require(msg.sender == depositAddressManager, "BR: not authorized");
        return
            TokenUtils.transferBalance({
                token: token,
                recipient: depositAddressManager
            });
    }
}
