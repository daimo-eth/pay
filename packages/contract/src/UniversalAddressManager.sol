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

import "./SharedConfig.sol";
import "./UniversalAddressFactory.sol";
import "./UniversalAddress.sol";
import "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./interfaces/IUniversalAddressBridger.sol";
import "./interfaces/IUniversalAddressManager.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Central escrow contract that orchestrates cross-chain Universal
///         Address intents, managing the complete lifecycle.
/// @dev Coordinates with Universal Address vault contracts and bridgers to
///      enable seamless cross-chain stablecoin transfers. Supports relayer
///      optimistic fast-finish with later settlement when bridge transfers
///      arrive. Creates deterministic receiver addresses to prevent
///      double-spending attacks. Assumes all whitelisted payment tokens,
///      bridge-out tokens, and route toTokens are 1:1 value stablecoins.
contract UniversalAddressManager is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    IUniversalAddressManager
{
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

    /// Sentinel value used to mark a transfer claimed.
    address public constant ADDR_MAX =
        0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Factory responsible for deploying deterministic Universal Addresses.
    UniversalAddressFactory public universalAddressFactory;

    /// Dedicated contract that performs swap / contract calls on behalf of the
    /// manager.
    DaimoPayExecutor public executor;

    /// Multiplexer around IDaimoPayBridger adapters.
    IUniversalAddressBridger public bridger;

    /// Global per-chain configuration (pause switch, whitelists, etc.)
    SharedConfig public cfg;

    /// Config key: If the UA vault balance is below this amount, the relayer
    /// must call startIntent or sameChainFinishIntent with the full balance
    /// of the UA vault. Otherwise, the relayer can use a partial amount.
    /// Denominated in units of the bridge-out token.
    /// Set to a value (e.g. $1000) that all supported bridges can handle in a
    /// single transaction.
    bytes32 public constant PARTIAL_START_THRESHOLD_KEY =
        keccak256("PARTIAL_START_THRESHOLD");

    /// IMPORTANT: For this version of the protocol, all bridge-out tokens
    ///            are required to have 6 decimals.
    uint256 public constant TOKEN_OUT_DECIMALS = 6;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

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

    event Start(
        address indexed universalAddress,
        address indexed receiverAddress,
        UniversalAddressRoute route,
        UABridgeIntent intent,
        address paymentToken,
        uint256 paymentAmount
    );
    event FastFinish(
        address indexed universalAddress,
        address indexed receiverAddress,
        address indexed newRecipient,
        UniversalAddressRoute route,
        UABridgeIntent intent
    );
    event Claim(
        address indexed universalAddress,
        address indexed receiverAddress,
        address indexed finalRecipient,
        UniversalAddressRoute route,
        UABridgeIntent intent
    );
    event SameChainFinish(
        address indexed universalAddress,
        UniversalAddressRoute route,
        address paymentToken,
        uint256 paymentAmount,
        uint256 toAmount
    );
    event Refund(
        address indexed universalAddress,
        UniversalAddressRoute route,
        address refundToken,
        uint256 refundAmount
    );

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Reverts when the global pause switch in SharedConfig is enabled.
    modifier notPaused() {
        require(!cfg.paused(), "UAM: paused");
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
        UniversalAddressFactory _universalAddressFactory,
        IUniversalAddressBridger _bridger,
        SharedConfig _cfg
    ) external initializer {
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        universalAddressFactory = _universalAddressFactory;
        bridger = _bridger;
        cfg = _cfg;
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
    /// @param paymentToken    The whitelisted stablecoin used to fund the
    ///                        intent.
    /// @param bridgeTokenOut  The token and amount to be bridged to the
    ///                        destination chain
    /// @param relaySalt       Unique salt provided by the relayer to generate
    ///                        a unique receiver address
    /// @param calls           Optional swap calls to convert payment token to
    ///                        required bridge input token
    /// @param bridgeExtraData Additional data required by the specific bridge
    ///                        implementation
    function startIntent(
        UniversalAddressRoute calldata route,
        IERC20 paymentToken,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant notPaused {
        require(block.chainid != route.toChainId, "UAM: start on dest chain");
        require(cfg.whitelistedStable(address(paymentToken)), "UAM: whitelist");
        require(route.escrow == address(this), "UAM: wrong escrow");

        uint256 outAmount = bridgeTokenOut.amount;

        // Deploy (or fetch) UA vault.
        UniversalAddress uaContract = universalAddressFactory
            .createUniversalAddress(route);

        // Check that the relayer-specified bridge-out token amount is valid.
        _enforcePartialStartThreshold({
            paymentToken: paymentToken,
            targetToken: bridgeTokenOut.token,
            targetAmount: outAmount,
            vaultAddr: address(uaContract)
        });

        UABridgeIntent memory intent = UABridgeIntent({
            universalAddress: address(uaContract),
            relaySalt: relaySalt,
            bridgeAmountOut: outAmount,
            bridgeToken: bridgeTokenOut.token,
            sourceChainId: block.chainid
        });
        (address receiverAddress, ) = computeReceiverAddress(intent);

        // Generate a unique receiver address for each bridge transfer. Without
        // this check, a malicious relayer could reuse the same receiver address
        // to claim multiple bridge transfers, double-paying themselves.
        require(!receiverUsed[receiverAddress], "UAM: receiver used");
        receiverUsed[receiverAddress] = true;

        // Send payment token to executor
        TokenAmount memory payTokenAmount = _convertStablecoinAmount({
            token: paymentToken,
            tokenDecimals: IERC20Metadata(address(paymentToken)).decimals(),
            otherAmount: outAmount,
            otherDecimals: TOKEN_OUT_DECIMALS,
            roundUp: true
        });
        uaContract.sendAmount({
            route: route,
            tokenAmount: payTokenAmount,
            recipient: payable(address(executor))
        });

        // Quote bridge input requirements.
        (address bridgeTokenIn, uint256 inAmount) = bridger.getBridgeTokenIn({
            toChainId: route.toChainId,
            bridgeTokenOut: bridgeTokenOut
        });

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
            spender: address(bridger),
            value: inAmount
        });
        bridger.sendToChain({
            toChainId: route.toChainId,
            toAddress: receiverAddress,
            bridgeTokenOut: bridgeTokenOut,
            // Refund to the UA vault so that startIntent can be retried
            refundAddress: address(uaContract),
            extraData: bridgeExtraData
        });

        emit Start({
            universalAddress: address(uaContract),
            receiverAddress: receiverAddress,
            route: route,
            intent: intent,
            paymentToken: address(paymentToken),
            paymentAmount: payTokenAmount.amount
        });
    }

    /// @notice Refunds tokens from a Universal Address vault to its
    ///         designated refund address.
    /// @param route The Universal Address route containing the refund address
    /// @param token The token to refund from the vault
    /// @dev We only allow refunds in two cases:
    ///      - The token is not whitelisted.
    ///      - The token is whitelisted, but the UA's destination chain is not
    ///        supported by the bridger.
    function refundIntent(
        UniversalAddressRoute calldata route,
        IERC20 token
    ) external nonReentrant notPaused {
        // Disallow refunding whitelisted coins if they're bridged to a
        // supported chain. For unsupported destination chains, we allow
        // refunding all coins.
        require(
            !cfg.whitelistedStable(address(token)) ||
                bridger.chainIdToStableOut(route.toChainId) == address(0),
            "UAM: refund denied"
        );
        require(route.escrow == address(this), "UAM: wrong escrow");

        // Get refundable balance
        UniversalAddress uaContract = universalAddressFactory
            .createUniversalAddress(route);
        address universalAddress = address(uaContract);
        uint256 amount = TokenUtils.getBalanceOf(token, universalAddress);
        require(amount > 0, "UAM: no balance");

        // Send refund
        uaContract.sendAmount({
            route: route,
            tokenAmount: TokenAmount({token: token, amount: amount}),
            recipient: payable(route.refundAddress)
        });

        emit Refund({
            universalAddress: universalAddress,
            route: route,
            refundToken: address(token),
            refundAmount: amount
        });
    }

    /// @notice Send funds that are already on the destination chain.
    /// @dev The relayer can provide optional swap calls to convert assets
    ///      to `route.toToken`, 1:1. Any surplus is sent to the caller.
    ///
    /// @param route        The UniversalAddressRoute for the intent
    /// @param paymentToken Token to be used to pay the intent
    /// @param toAmount     The amount of `toToken` to deliver to the UA
    /// @param calls        Arbitrary swap calls to be executed by the executor
    ///                     Can be empty when assets are already `toToken`
    function sameChainFinishIntent(
        UniversalAddressRoute calldata route,
        IERC20 paymentToken,
        uint256 toAmount,
        Call[] calldata calls
    ) external nonReentrant notPaused {
        // Must be executed on the destination chain
        require(route.toChainId == block.chainid, "UAM: wrong chain");
        require(cfg.whitelistedStable(address(paymentToken)), "UAM: whitelist");
        require(route.escrow == address(this), "UAM: wrong escrow");

        // Deploy (or fetch) the Universal Address for this route.
        UniversalAddress uaContract = universalAddressFactory
            .createUniversalAddress(route);
        address universalAddress = address(uaContract);

        // Check that the relayer-specified toAmount is valid.
        _enforcePartialStartThreshold({
            paymentToken: paymentToken,
            targetToken: route.toToken,
            targetAmount: toAmount,
            vaultAddr: universalAddress
        });

        // Compute the required amount of paymentToken to pay for the toAmount
        TokenAmount memory reqPaymentAmount = _convertStablecoinAmount({
            token: paymentToken,
            tokenDecimals: IERC20Metadata(address(paymentToken)).decimals(),
            otherAmount: toAmount,
            otherDecimals: IERC20Metadata(address(route.toToken)).decimals(),
            roundUp: true
        });

        // Pull specified token balances from the UA vault into the executor.
        uaContract.sendAmount({
            route: route,
            tokenAmount: reqPaymentAmount,
            recipient: payable(address(executor))
        });

        // Finish the intent and return any leftover tokens to the caller
        _finishIntent({route: route, calls: calls, toAmount: toAmount});

        emit SameChainFinish({
            universalAddress: universalAddress,
            route: route,
            paymentToken: address(paymentToken),
            paymentAmount: reqPaymentAmount.amount,
            toAmount: toAmount
        });
    }

    /// @notice Allows a relayer to deliver funds early on the destination chain
    ///         before the bridge transfer completes.
    /// @dev Must be called on the destination chain. The relayer sends their
    ///      own funds to complete the intent atomically before calling fastFinish,
    ///      and is recorded as the recipient for the eventual bridged tokens.
    /// @param route           The UniversalAddressRoute for the intent
    /// @param calls           Arbitrary swap calls to be executed by the executor
    /// @param token           The token sent by the relayer
    /// @param bridgeTokenOut  The token and amount expected from the bridge
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    function fastFinishIntent(
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        IERC20 token,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant notPaused {
        require(sourceChainId != block.chainid, "UAM: same chain finish");
        require(route.toChainId == block.chainid, "UAM: wrong chain");
        require(route.escrow == address(this), "UAM: wrong escrow");

        // Calculate salt for this bridge transfer.
        address universalAddress = universalAddressFactory.getUniversalAddress(
            route
        );
        UABridgeIntent memory intent = UABridgeIntent({
            universalAddress: universalAddress,
            relaySalt: relaySalt,
            bridgeAmountOut: bridgeTokenOut.amount,
            bridgeToken: bridgeTokenOut.token,
            sourceChainId: sourceChainId
        });
        (address receiverAddress, ) = computeReceiverAddress(intent);

        // Check that the salt hasn't already been fast finished or claimed.
        require(
            receiverToRecipient[receiverAddress] == address(0),
            "UAM: already finished"
        );
        // Record relayer as new recipient when the bridged tokens arrive
        receiverToRecipient[receiverAddress] = msg.sender;

        // Finish the intent and return any leftover tokens to the caller
        TokenUtils.transferBalance({
            token: token,
            recipient: payable(address(executor))
        });
        TokenAmount memory toTokenAmount = _convertStablecoinAmount({
            token: route.toToken,
            tokenDecimals: IERC20Metadata(address(route.toToken)).decimals(),
            otherAmount: bridgeTokenOut.amount,
            otherDecimals: TOKEN_OUT_DECIMALS,
            roundUp: true
        });
        _finishIntent({
            route: route,
            calls: calls,
            toAmount: toTokenAmount.amount
        });

        emit FastFinish({
            universalAddress: universalAddress,
            receiverAddress: receiverAddress,
            newRecipient: msg.sender,
            route: route,
            intent: intent
        });
    }

    /// @notice Completes an intent after bridged tokens arrive on the destination
    ///         chain, either repaying a relayer or fulfilling the intent directly.
    /// @param route           The UniversalAddressRoute for the intent
    /// @param calls           Arbitrary swap from bridgeTokenOut to toToken
    /// @param bridgeTokenOut  The token and amount that was bridged
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    function claimIntent(
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant notPaused {
        require(route.toChainId == block.chainid, "UAM: wrong chain");
        require(route.escrow == address(this), "UAM: wrong escrow");

        // Calculate salt for this bridge transfer.
        address universalAddress = universalAddressFactory.getUniversalAddress(
            route
        );
        UABridgeIntent memory intent = UABridgeIntent({
            universalAddress: universalAddress,
            relaySalt: relaySalt,
            bridgeAmountOut: bridgeTokenOut.amount,
            bridgeToken: bridgeTokenOut.token,
            sourceChainId: sourceChainId
        });
        (address receiverAddress, bytes32 recvSalt) = computeReceiverAddress(
            intent
        );

        // Check the recipient for this intent.
        address recipient = receiverToRecipient[receiverAddress];
        require(recipient != ADDR_MAX, "UAM: already claimed");
        // Mark intent as claimed
        receiverToRecipient[receiverAddress] = ADDR_MAX;

        // Deploy BridgeReceiver if necessary then sweep tokens.
        BridgeReceiver receiver;
        if (receiverAddress.code.length == 0) {
            receiver = new BridgeReceiver{salt: recvSalt}();
            require(receiverAddress == address(receiver), "UAM: receiver");
        } else {
            receiver = BridgeReceiver(payable(receiverAddress));
        }

        // Pull bridged tokens from the deterministic receiver into this contract.
        uint256 bridgedAmount = receiver.pull(bridgeTokenOut.token);

        // Check that sufficient amount was bridged.
        require(
            bridgedAmount >= bridgeTokenOut.amount,
            "UAM: insufficient bridge"
        );

        if (recipient == address(0)) {
            // No relayer showed up, so just complete the intent. Update the recipient to the intent recipient.
            recipient = route.toAddress;

            // Send tokens to the executor contract to run relayer-provided
            // calls in _finishIntent.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(address(executor)),
                amount: bridgedAmount
            });

            // Finish the intent and return any leftover tokens to the caller
            _finishIntent({
                route: route,
                calls: calls,
                toAmount: _convertStablecoinAmount({
                    token: route.toToken,
                    tokenDecimals: IERC20Metadata(address(route.toToken))
                        .decimals(),
                    otherAmount: bridgedAmount,
                    otherDecimals: TOKEN_OUT_DECIMALS,
                    roundUp: true
                }).amount
            });
        } else {
            // Otherwise, the relayer fastFinished the intent. Repay them.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(recipient),
                amount: bridgedAmount
            });
        }

        emit Claim({
            universalAddress: universalAddress,
            receiverAddress: receiverAddress,
            finalRecipient: recipient,
            route: route,
            intent: intent
        });
    }

    /// @notice Computes a deterministic BridgeReceiver address.
    /// @param intent The bridge intent
    /// @return addr The computed address for the BridgeReceiver contract
    /// @return recvSalt The CREATE2 salt used to deploy the BridgeReceiver
    function computeReceiverAddress(
        UABridgeIntent memory intent
    ) public view returns (address payable addr, bytes32 recvSalt) {
        recvSalt = keccak256(abi.encode(intent));
        bytes memory initCode = type(BridgeReceiver).creationCode;
        addr = payable(Create2.computeAddress(recvSalt, keccak256(initCode)));
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Internal helper that completes an intent by executing swaps,
    ///      delivering toToken to the recipient, and handling any surplus.
    ///      Precondition: input tokens must already be in PayExecutor.
    /// @param route            The UniversalAddressRoute containing
    ///                         recipient details
    /// @param calls            Arbitrary swap calls to be executed by the
    ///                         executor
    /// @param toAmount         The amount of target token to deliver to the
    ///                         recipient
    function _finishIntent(
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        uint256 toAmount
    ) internal {
        // Run arbitrary calls provided by the relayer to create toToken.
        IERC20 toToken = route.toToken;
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({token: toToken, amount: toAmount});
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        // Forward the entire amount to the final beneficiary.
        TokenUtils.transfer({
            token: toToken,
            amount: toAmount,
            recipient: payable(route.toAddress)
        });

        // Transfer any excess to the refund address.
        TokenUtils.transferBalance({
            token: toToken,
            recipient: payable(route.refundAddress)
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
    // Shared validation helpers
    // ---------------------------------------------------------------------

    /// @dev Enforce that the full UA vault balance is used if the vault
    ///      balance is below the PARTIAL_START_THRESHOLD. Otherwise, the
    ///      relayer can use a partial amount at least as large as the
    ///      threshold.
    /// @param paymentToken   Token that currently resides in the UA vault
    /// @param targetToken    Token (bridge out or destination toToken) that the
    ///                       relayer will ultimately deliver
    /// @param targetAmount   Amount the relayer intends to bridge/deliver, in
    ///                       targetToken units
    /// @param vaultAddr      Address of the UniversalAddress vault for this
    ///                       route – used to read current balance
    function _enforcePartialStartThreshold(
        IERC20 paymentToken,
        IERC20 targetToken,
        uint256 targetAmount,
        address vaultAddr
    ) internal view {
        uint256 partialStartThreshold = cfg.num(PARTIAL_START_THRESHOLD_KEY);

        // Current vault balance in paymentToken units
        uint256 vaultBalance = TokenUtils.getBalanceOf({
            token: paymentToken,
            addr: vaultAddr
        });

        // Convert vault balance to targetToken decimals for apples-to-apples
        // comparison with targetAmount.
        uint256 vaultBalanceTargetDecimals = _convertStablecoinAmount({
            token: targetToken,
            tokenDecimals: TOKEN_OUT_DECIMALS,
            otherAmount: vaultBalance,
            otherDecimals: IERC20Metadata(address(paymentToken)).decimals(),
            roundUp: false
        }).amount;

        if (vaultBalanceTargetDecimals <= partialStartThreshold) {
            // Vault balance fits within the threshold – must use the entire
            // balance.
            require(
                targetAmount == vaultBalanceTargetDecimals,
                "UAM: amount != balance"
            );
        } else {
            // Vault balance exceeds the threshold – must use at least the
            // threshold.
            require(
                targetAmount >= partialStartThreshold,
                "UAM: amount < threshold"
            );
        }
    }

    /// @dev Computes an equivalent, 1:1 stablecoin amount. Converts decimals.
    /// @param token The token to convert the amount to
    /// @param tokenDecimals The decimals of the token to convert to
    /// @param otherAmount The amount of the other token
    /// @param otherDecimals The decimals of the other token
    /// @param roundUp Whether to round up the result
    /// @return The converted amount
    function _convertStablecoinAmount(
        IERC20 token,
        uint256 tokenDecimals,
        uint256 otherAmount,
        uint256 otherDecimals,
        bool roundUp
    ) internal pure returns (TokenAmount memory) {
        // Convert otherAmount to token amount.
        // Formula: tokenAmount = otherAmount * (10^tokenDecimals) / (10^otherDecimals)
        uint256 amount;
        if (tokenDecimals >= otherDecimals) {
            // Token has more or equal decimals than other token
            uint256 decimalDiff = tokenDecimals - otherDecimals;
            amount = otherAmount * (10 ** decimalDiff);
        } else {
            // Token has fewer decimals than other token
            // Use ceiling division to round up.
            uint256 decimalDiff = otherDecimals - tokenDecimals;
            uint256 divisor = 10 ** decimalDiff;
            if (roundUp) {
                amount = (otherAmount + divisor - 1) / divisor;
            } else {
                amount = otherAmount / divisor;
            }
        }
        return TokenAmount({token: token, amount: amount});
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
///         allows the Universal Address Manager to sweep them.
/// @dev Deployed via CREATE2 using a salt that encodes bridge transfer
///      parameters into the deployment address, creating predictable addresses
///      that are unique to each bridge transfer. Only the deploying manager
///      can pull funds from this contract.
contract BridgeReceiver {
    using SafeERC20 for IERC20;

    /// @notice Address allowed to pull funds from this contract
    ///         (in UA protocol, it's the Universal Address Manager contract above).
    address payable public immutable universalAddressManager;

    constructor() {
        universalAddressManager = payable(msg.sender);

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
        require(msg.sender == universalAddressManager, "BR: not authorized");
        return
            TokenUtils.transferBalance({
                token: token,
                recipient: universalAddressManager
            });
    }
}
