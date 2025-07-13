// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./SharedConfig.sol";
import "./UAIntentFactory.sol";
import "./UAIntent.sol";
import "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./interfaces/IUniversalAddressBridger.sol";
import "./interfaces/IUniversalAddressManager.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Escrow contract that manages Universal Addresses,
///         acting as a single source of truth for all UA intents.
contract UniversalAddressManager is ReentrancyGuard, IUniversalAddressManager {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

    /// Sentinel value used by receiverFiller to mark a transfer claimed.
    address public constant ADDR_MAX =
        0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Factory responsible for deploying deterministic UAIntent intent addresses.
    UAIntentFactory public immutable intentFactory;

    /// Dedicated contract that performs swap / contract calls on behalf of the manager.
    DaimoPayExecutor public immutable executor;

    /// Multiplexer around IDaimoPayBridger adapters.
    IUniversalAddressBridger public immutable bridger;

    /// Global per-chain configuration (pause switch, whitelists, etc.)
    SharedConfig public immutable cfg;

    /// Keys for SharedConfig
    /// @dev Minimum amount of USDC required to start an intent.
    bytes32 public constant MIN_START_USDC_KEY = keccak256("MIN_START_USDC");
    /// @dev USDC decimals
    bytes32 public constant USDC_DECIMALS_KEY = keccak256("USDC_DECIMALS");

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
        address indexed intentAddr,
        address indexed receiverAddr,
        UAIntent intent
    );
    event FastFinish(address indexed intentAddr, address indexed newRecipient);
    event Claim(address indexed intentAddr, address indexed finalRecipient);
    event IntentFinished(
        address indexed intentAddr,
        address destinationAddr,
        bool success,
        UAIntent intent
    );
    event IntentRefunded(
        address indexed intentAddr,
        address refundAddr,
        IERC20[] tokens,
        uint256[] amounts,
        UAIntent intent
    );

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(
        UAIntentFactory _intentFactory,
        IUniversalAddressBridger _bridger,
        SharedConfig _cfg
    ) {
        intentFactory = _intentFactory;
        bridger = _bridger;
        cfg = _cfg;
        executor = new DaimoPayExecutor(address(this));
    }

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Begin a cross-chain transfer on the SOURCE chain.
    function startIntent(
        UAIntent calldata intent,
        IERC20 paymentToken,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant notPaused {
        require(block.chainid != intent.toChainId, "UAM: start on dest chain");
        require(
            cfg.whitelistedStable(address(paymentToken)),
            "UAM: token not whitelisted"
        );
        require(
            bridgeTokenOut.amount >= cfg.num(MIN_START_USDC_KEY),
            "UAM: amount below min"
        );
        require(
            bridgeTokenOut.amount >= cfg.chainFee(block.chainid),
            "UAM: amount below fee"
        );

        UAIntentContract intentContract = intentFactory.createIntent(
            intent,
            address(this)
        );
        bytes32 recvSalt = _receiverSalt({
            uaAddr: address(intentContract),
            relaySalt: relaySalt,
            relayer: msg.sender,
            bridgeAmountOut: bridgeTokenOut.amount,
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
            intent: intent,
            tokenAmount: TokenAmount({
                token: paymentToken,
                amount: _computeRequiredPaymentAmount(
                    paymentToken,
                    bridgeTokenOut.amount
                )
            }),
            recipient: payable(address(executor))
        });

        // Quote bridge input requirements.
        (address bridgeTokenIn, uint256 inAmount) = bridger.getBridgeTokenIn({
            toChainId: intent.toChainId,
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
            toChainId: intent.toChainId,
            toAddress: receiverAddr,
            bridgeTokenOut: bridgeTokenOut,
            extraData: bridgeExtraData
        });

        emit Start({
            intentAddr: address(intentContract),
            receiverAddr: receiverAddr,
            intent: intent
        });
    }

    /// @notice Refund stray or double-paid tokens.
    function refundIntent(
        UAIntent calldata intent,
        IERC20[] calldata tokens
    ) external nonReentrant notPaused {
        UAIntentContract intentContract = intentFactory.createIntent(
            intent,
            address(this)
        );
        address intentAddr = address(intentContract);

        // Disallow refunding whitelisted coins above the minimum bridge amount.
        uint256 n = tokens.length;
        for (uint256 i = 0; i < n; ++i) {
            require(
                !cfg.whitelistedStable(address(tokens[i])) ||
                    tokens[i].balanceOf(address(intentAddr)) <
                    cfg.num(MIN_START_USDC_KEY),
                "UAM: refund balance not above min"
            );
        }

        uint256[] memory amounts = intentContract.sendBalances({
            intent: intent,
            tokens: tokens,
            recipient: payable(intent.refundAddress)
        });
        emit IntentRefunded(
            intentAddr,
            intent.refundAddress,
            tokens,
            amounts,
            intent
        );
    }

    // ---------------------------------------------------------------------
    // Relayer & claim flows
    // ---------------------------------------------------------------------

    /// Relayer-only DESTINATION-chain function: deliver funds early and record filling.
    function fastFinishIntent(
        UAIntent calldata intent,
        Call[] calldata calls,
        IERC20 token,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant notPaused {
        require(sourceChainId != block.chainid, "UAM: same chain finish");
        require(intent.toChainId == block.chainid, "UAM: wrong chain");

        // Calculate salt for this bridge transfer.
        address intentAddr = intentFactory.getIntentAddress(
            intent,
            address(this)
        );
        bytes32 recvSalt = _receiverSalt({
            uaAddr: intentAddr,
            relaySalt: relaySalt,
            relayer: msg.sender,
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
            intentAddr: intentAddr,
            intent: intent,
            calls: calls,
            toAmount: bridgeTokenOut.amount,
            sourceChainId: sourceChainId
        });

        emit FastFinish({intentAddr: intentAddr, newRecipient: msg.sender});
    }

    /// Complete after slow bridge lands
    function claimIntent(
        UAIntent calldata intent,
        Call[] calldata calls,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        address relayer,
        uint256 sourceChainId
    ) external nonReentrant notPaused {
        require(intent.toChainId == block.chainid, "UAM: wrong chain");

        // Calculate salt for this bridge transfer.
        address intentAddr = intentFactory.getIntentAddress(
            intent,
            address(this)
        );
        // Pass in the relayer address as a parameter instead of msg.sender
        // to allow permissionless claims. This prevents funds from being
        // locked in the receiver contract.
        bytes32 recvSalt = _receiverSalt({
            uaAddr: intentAddr,
            relaySalt: relaySalt,
            relayer: relayer,
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
            recipient = intent.toAddress;

            // Send tokens to the executor contract to run relayer-provided
            // calls in _finishIntent.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(address(executor)),
                amount: bridgedAmount
            });

            // Complete the intent and return any leftover tokens to the caller
            _finishIntent({
                intentAddr: intentAddr,
                intent: intent,
                calls: calls,
                toAmount: bridgedAmount,
                sourceChainId: sourceChainId
            });
        } else {
            // Otherwise, the relayer fastFinished the intent. Repay them.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(recipient),
                amount: bridgedAmount
            });
        }

        emit Claim({intentAddr: intentAddr, finalRecipient: recipient});
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    function _receiverSalt(
        address uaAddr,
        bytes32 relaySalt,
        address relayer,
        uint256 bridgeAmountOut,
        IERC20 bridgeToken,
        uint256 sourceChainId
    ) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encodePacked(
                    "receiver",
                    uaAddr,
                    relaySalt,
                    relayer,
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
    ) internal view returns (uint256) {
        // Get USDC decimals from the shared config
        uint256 usdcDecimals = cfg.num(USDC_DECIMALS_KEY);
        require(usdcDecimals > 0, "UAM: no USDC decimals");

        // Get payment token decimals using IERC20Metadata
        uint256 paymentTokenDecimals = IERC20Metadata(address(paymentToken))
            .decimals();

        // Convert bridgeAmountOut (USDC) to payment token amount
        // Formula: paymentTokenAmount = bridgeAmountOut * (10^paymentTokenDecimals) / (10^usdcDecimals)
        if (paymentTokenDecimals >= usdcDecimals) {
            // Payment token has more or equal decimals than USDC
            uint256 decimalDiff = paymentTokenDecimals - usdcDecimals;
            return bridgeAmountOut * (10 ** decimalDiff);
        } else {
            // Payment token has fewer decimals than USDC
            // Use ceiling division to ensure we pull enough tokens
            uint256 decimalDiff = usdcDecimals - paymentTokenDecimals;
            uint256 divisor = 10 ** decimalDiff;
            return (bridgeAmountOut + divisor - 1) / divisor;
        }
    }

    function _finishIntent(
        address intentAddr,
        UAIntent calldata intent,
        Call[] calldata calls,
        uint256 toAmount,
        uint256 sourceChainId
    ) internal {
        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary. Any surplus tokens
        // are given to the caller.
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: intent.toToken,
            amount: toAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        // Deduct chain-specific fee (if configured) and pay it to the caller to
        // offset execution gas costs.
        uint256 fee = cfg.chainFee(sourceChainId);
        require(toAmount > fee, "UAM: fee exceeds amount");

        uint256 netAmount = toAmount - fee;

        // Transfer the net amount to the intent recipient.
        bool success = TokenUtils.tryTransfer({
            token: intent.toToken,
            recipient: intent.toAddress,
            amount: netAmount
        });

        // Pay the fee to the caller (relayer / claimer) if any.
        if (fee > 0) {
            TokenUtils.transfer({
                token: intent.toToken,
                recipient: payable(msg.sender),
                amount: fee
            });
        }

        // Transfer any excess to the refund address.
        TokenUtils.transferBalance({
            token: intent.toToken,
            recipient: payable(intent.refundAddress)
        });

        emit IntentFinished({
            intentAddr: intentAddr,
            destinationAddr: intent.toAddress,
            success: success,
            intent: intent
        });
    }

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
