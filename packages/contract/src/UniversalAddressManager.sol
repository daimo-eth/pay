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
/// @notice Escrow contract that manages Universal Addresses,
///         acting as a single source of truth for all UA intents.
contract UniversalAddressManager is Initializable, OwnableUpgradeable, ReentrancyGuardUpgradeable, UUPSUpgradeable, IUniversalAddressManager {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

    /// Sentinel value used by receiverFiller to mark a transfer claimed.
    address public constant ADDR_MAX =
        0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Factory responsible for deploying deterministic Universal Addresses.
    UniversalAddressFactory public universalAddressFactory;

    /// Dedicated contract that performs swap / contract calls on behalf of the manager.
    DaimoPayExecutor public executor;

    /// Multiplexer around IDaimoPayBridger adapters.
    IUniversalAddressBridger public bridger;

    /// Global per-chain configuration (pause switch, whitelists, etc.)
    SharedConfig public cfg;

    /// Keys for SharedConfig
    /// @dev Minimum amount of the bridge-out token required to start an intent.
    bytes32 public constant MIN_START_TOKEN_OUT_KEY =
        keccak256("MIN_START_TOKEN_OUT");

    /// @dev IMPORTANT: For this version of the protocol, all bridge-out tokens
    ///      are assumed to have 6 decimals. This will be made configurable
    ///      in a future release.
    uint256 public constant TOKEN_OUT_DECIMALS = 6;

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Reverts when the global pause switch in SharedConfig is enabled.
    modifier notPaused() {
        require(!cfg.paused(), "UAM: paused");
        _;
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// On the source chain, record receiver addresses that have been used.
    mapping(bytes32 salt => bool used) public saltUsed;

    /// On the destination chain, map receiver address to status:
    /// - address(0) = not finished.
    /// - Relayer address = fast-finished, awaiting claim to repay relayer.
    /// - ADDR_MAX = claimed. any additional funds received are refunded.
    mapping(bytes32 salt => address recipient) public saltToRecipient;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Start(
        address indexed universalAddress,
        address indexed receiverAddr,
        UniversalAddressRoute route
    );
    event FastFinish(
        address indexed universalAddress,
        address indexed newRecipient
    );
    event Claim(
        address indexed universalAddress,
        address indexed finalRecipient
    );
    event IntentFinished(
        address indexed universalAddress,
        address destinationAddr,
        bool success,
        UniversalAddressRoute route
    );
    event IntentRefunded(
        address indexed universalAddress,
        address refundAddr,
        IERC20 token,
        uint256 amount,
        UniversalAddressRoute route
    );

    // ---------------------------------------------------------------------
    // Constructor & Initializer
    // ---------------------------------------------------------------------

    /// @dev Disable initializers on the implementation contract.
    constructor() {
        _disableInitializers();
    }

    /// @notice Initialize the contract.
    function initialize(
        UniversalAddressFactory _universalAddressFactory,
        IUniversalAddressBridger _bridger,
        SharedConfig _cfg
    ) public initializer {
        __ReentrancyGuard_init();
        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        universalAddressFactory = _universalAddressFactory;
        bridger = _bridger;
        cfg = _cfg;
        executor = new DaimoPayExecutor(address(this));
    }

    // ---------------------------------------------------------------------
    // UUPS upgrade authorization
    // ---------------------------------------------------------------------

    /// @dev Restrict upgrades to the contract owner.
    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyOwner
    {}

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Begin a cross-chain transfer on the SOURCE chain.
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
        require(
            outAmount >= cfg.num(MIN_START_TOKEN_OUT_KEY),
            "UAM: amount < min"
        );

        UniversalAddress intentContract = universalAddressFactory
            .createUniversalAddress(route);
        bytes32 recvSalt = _receiverSalt({
            universalAddress: address(intentContract),
            relaySalt: relaySalt,
            bridgeAmountOut: outAmount,
            bridgeToken: bridgeTokenOut.token,
            sourceChainId: block.chainid
        });

        // A salt is used to generate a unique receiver address for each bridge transfer.
        // The receiver address is a CREATE2 address that encodes the bridging parameters.
        // Without this check, a malicious relayer could reuse the same receiver address
        // to claim multiple bridge transfers, effectively double-paying themselves.
        require(!saltUsed[recvSalt], "UAM: salt used");
        saltUsed[recvSalt] = true;

        // Send payment token to executor
        intentContract.sendAmount({
            route: route,
            tokenAmount: _computeRequiredPaymentAmount(paymentToken, outAmount),
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
        // surplus tokens are given to the caller.
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
        address receiverAddr = _computeReceiverAddress(recvSalt);
        IERC20(bridgeTokenIn).forceApprove({
            spender: address(bridger),
            value: inAmount
        });
        bridger.sendToChain({
            toChainId: route.toChainId,
            toAddress: receiverAddr,
            bridgeTokenOut: bridgeTokenOut,
            extraData: bridgeExtraData
        });

        emit Start({
            universalAddress: address(intentContract),
            receiverAddr: receiverAddr,
            route: route
        });
    }

    /// @notice Refund unsupported tokens.
    function refundIntent(
        UniversalAddressRoute calldata route,
        IERC20 token
    ) external nonReentrant notPaused {
        require(route.escrow == address(this), "UAM: wrong escrow");

        UniversalAddress intentContract = universalAddressFactory
            .createUniversalAddress(route);
        address universalAddress = address(intentContract);

        // Disallow refunding whitelisted coins
        require(!cfg.whitelistedStable(address(token)), "UAM: whitelisted");

        uint256 amount = TokenUtils.getBalanceOf(token, universalAddress);
        require(amount > 0, "UAM: no balance");

        intentContract.sendAmount({
            route: route,
            tokenAmount: TokenAmount({token: token, amount: amount}),
            recipient: payable(route.refundAddress)
        });

        emit IntentRefunded({
            universalAddress: universalAddress,
            refundAddr: route.refundAddress,
            token: token,
            amount: amount,
            route: route
        });
    }

    // ---------------------------------------------------------------------
    // Relayer & claim flows
    // ---------------------------------------------------------------------

    /// @notice Complete an intent by sweeping funds that are already held by
    ///         the Universal Address on the destination chain (e.g. tokens
    ///         were bridged directly to the UA instead of the BridgeReceiver).
    ///         The caller (typically a relayer) may provide optional swap
    ///         calls so that the swept assets end up as `route.toToken`.
    ///         Any surplus after delivering the required `toToken` amount is
    ///         sent to the caller, and the caller also receives the standard
    ///         chain-fee rebate.
    ///
    /// @param route            The UniversalAddressRoute for the intent.
    /// @param paymentToken     Token to be used to pay the chain fee.
    /// @param calls            Arbitrary swap calls to be executed by the
    ///                         executor. Can be empty when assets are already
    ///                         `toToken`.
    function sameChainFinishIntent(
        UniversalAddressRoute calldata route,
        IERC20 paymentToken,
        Call[] calldata calls
    ) external nonReentrant notPaused {
        // Must be executed on the destination chain
        require(route.toChainId == block.chainid, "UAM: wrong chain");
        require(route.escrow == address(this), "UAM: wrong escrow");

        // Deploy (or fetch) the Universal Address for this route.
        UniversalAddress intentContract = universalAddressFactory
            .createUniversalAddress(route);
        address universalAddress = address(intentContract);

        // Pull specified token balances from the UA vault into the executor.
        uint256 bal = TokenUtils.getBalanceOf({
            token: paymentToken,
            addr: universalAddress
        });
        if (bal > 0) {
            intentContract.sendAmount({
                route: route,
                tokenAmount: TokenAmount({token: paymentToken, amount: bal}),
                recipient: payable(address(executor))
            });
        }

        // Execute optional swap logic so that we end up with route.toToken.
        // Calculate minimum expected output in route.toToken units. We assume
        // stable-coins are roughly pegged 1:1, so we simply scale balances to
        // the destination token’s decimals.
        uint256 minToAmount = 0;
        uint8 destDecimals = IERC20Metadata(address(route.toToken)).decimals();
        uint256 bal2 = TokenUtils.getBalanceOf({
            token: paymentToken,
            addr: address(executor)
        });
        if (paymentToken == route.toToken) {
            minToAmount += bal2;
        } else if (bal2 > 0) {
            uint8 srcDec = IERC20Metadata(address(paymentToken)).decimals();
            if (srcDec >= destDecimals) {
                minToAmount += bal2 * (10 ** (srcDec - destDecimals));
            } else {
                minToAmount += bal2 / (10 ** (destDecimals - srcDec));
            }
        }

        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: route.toToken,
            amount: minToAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        uint256 toAmount = route.toToken.balanceOf(address(this));
        require(toAmount >= minToAmount, "UAM: insufficient toToken");

        // Transfer to final beneficiary.
        bool success = TokenUtils.tryTransfer({
            token: route.toToken,
            recipient: route.toAddress,
            amount: toAmount
        });

        // Refund any leftover balance to refund address.
        TokenUtils.transferBalance({
            token: route.toToken,
            recipient: payable(route.refundAddress)
        });

        emit IntentFinished({
            universalAddress: universalAddress,
            destinationAddr: route.toAddress,
            success: success,
            route: route
        });
    }

    /// Relayer-only DESTINATION-chain function: deliver funds early and record filling.
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
        bytes32 recvSalt = _receiverSalt({
            universalAddress: universalAddress,
            relaySalt: relaySalt,
            bridgeAmountOut: bridgeTokenOut.amount,
            bridgeToken: bridgeTokenOut.token,
            sourceChainId: sourceChainId
        });

        // Check that the salt hasn't already been fast finished or claimed.
        require(
            saltToRecipient[recvSalt] == address(0),
            "UAM: already finished"
        );
        // Record relayer as new recipient when the bridged tokens arrive
        saltToRecipient[recvSalt] = msg.sender;

        TokenUtils.transferBalance({
            token: token,
            recipient: payable(address(executor))
        });

        // Finish the intent and return any leftover tokens to the caller
        _finishIntent({
            universalAddress: universalAddress,
            route: route,
            calls: calls,
            toAmount: bridgeTokenOut.amount
        });

        emit FastFinish({
            universalAddress: universalAddress,
            newRecipient: msg.sender
        });
    }

    /// Complete after slow bridge lands
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
        // Pass in the relayer address as a parameter instead of msg.sender
        // to allow permissionless claims. This prevents funds from being
        // locked in the receiver contract.
        bytes32 recvSalt = _receiverSalt({
            universalAddress: universalAddress,
            relaySalt: relaySalt,
            bridgeAmountOut: bridgeTokenOut.amount,
            bridgeToken: bridgeTokenOut.token,
            sourceChainId: sourceChainId
        });

        // Check the recipient for this intent.
        address recipient = saltToRecipient[recvSalt];
        require(recipient != ADDR_MAX, "UAM: already claimed");
        // Mark intent as claimed
        saltToRecipient[recvSalt] = ADDR_MAX;

        // Deploy BridgeReceiver if necessary then sweep tokens.
        address payable receiverAddr = _computeReceiverAddress(recvSalt);
        if (receiverAddr.code.length == 0) {
            new BridgeReceiver{salt: recvSalt}();
        }

        // Pull bridged tokens from the deterministic receiver into this contract.
        BridgeReceiver(receiverAddr).pull(bridgeTokenOut.token);

        // Check that sufficient amount was bridged.
        uint256 bridgedAmount = bridgeTokenOut.token.balanceOf(address(this));
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

            // Complete the intent and return any leftover tokens to the caller
            _finishIntent({
                universalAddress: universalAddress,
                route: route,
                calls: calls,
                toAmount: bridgedAmount
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
            finalRecipient: recipient
        });
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _receiverSalt(
        address universalAddress,
        bytes32 relaySalt,
        uint256 bridgeAmountOut,
        IERC20 bridgeToken,
        uint256 sourceChainId
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "receiver",
                    universalAddress,
                    relaySalt,
                    bridgeAmountOut,
                    bridgeToken,
                    sourceChainId
                )
            );
    }

    function _computeReceiverAddress(
        bytes32 recvSalt
    ) internal view returns (address payable addr) {
        bytes memory initCode = type(BridgeReceiver).creationCode;
        addr = payable(Create2.computeAddress(recvSalt, keccak256(initCode)));
    }

    function _computeRequiredPaymentAmount(
        IERC20 paymentToken,
        uint256 bridgeAmountOut
    ) internal view returns (TokenAmount memory) {
        // Get payment token decimals using IERC20Metadata
        uint256 paymentTokenDecimals = IERC20Metadata(address(paymentToken))
            .decimals();

        // Convert bridgeAmountOut to payment token amount.
        // The amount is provided in the bridge-out token's base units, so we
        // adjust for any decimal differences between it and the payment token.
        // Formula: paymentTokenAmount = bridgeAmountOut * (10^paymentTokenDecimals) / (10^tokenOutDecimals)
        uint256 amount;
        if (paymentTokenDecimals >= TOKEN_OUT_DECIMALS) {
            // Payment token has more or equal decimals than bridge-out token
            uint256 decimalDiff = paymentTokenDecimals - TOKEN_OUT_DECIMALS;
            amount = bridgeAmountOut * (10 ** decimalDiff);
        } else {
            // Payment token has fewer decimals than bridge-out token
            // Use ceiling division to ensure we pull enough tokens
            uint256 decimalDiff = TOKEN_OUT_DECIMALS - paymentTokenDecimals;
            uint256 divisor = 10 ** decimalDiff;
            amount = (bridgeAmountOut + divisor - 1) / divisor;
        }
        return TokenAmount({token: paymentToken, amount: amount});
    }

    function _finishIntent(
        address universalAddress,
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        uint256 toAmount
    ) internal {
        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary. Any surplus tokens
        // are given to the caller.
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: route.toToken,
            amount: toAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        // Forward the entire amount to the final beneficiary.
        bool success = TokenUtils.tryTransfer({
            token: route.toToken,
            recipient: route.toAddress,
            amount: toAmount
        });

        // Transfer any excess to the refund address.
        TokenUtils.transferBalance({
            token: route.toToken,
            recipient: payable(route.refundAddress)
        });

        emit IntentFinished({
            universalAddress: universalAddress,
            destinationAddr: route.toAddress,
            success: success,
            route: route
        });
    }

    // ---------------------------------------------------------------------
    // Storage gap for upgradeability
    // ---------------------------------------------------------------------

    uint256[50] private __gap;

    // Accept native asset deposits (for swaps).
    receive() external payable {}
}

// ---------------------------------------------------------------------
// Minimal deterministic receiver
// ---------------------------------------------------------------------

contract BridgeReceiver {
    using SafeERC20 for IERC20;

    /// @notice Address allowed to pull funds from this contract (the deployer/manager).
    address payable public immutable ua;

    constructor() {
        ua = payable(msg.sender);
    }

    /// @notice Sweep entire balance of `token` (ERC20 or native when token == IERC20(address(0))) to the deployer address.
    function pull(IERC20 token) external {
        require(msg.sender == ua, "BR: not authorized");
        TokenUtils.transferBalance({token: token, recipient: ua});
    }

    // Accept native asset deposits.
    receive() external payable {}
}
