// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import "./DaimoPayBridger.sol";
import "./DaimoPayExecutor.sol";
import "./PayIntentFactory.sol";
import "./TokenUtils.sol";

// A Daimo Pay transfer has 4 steps:
// 1. Alice sends (tokenIn, amountIn) to the intent address on chain A. This is
//    a simple erc20 transfer.
// 2. Relayer swaps tokenIn to bridgeTokenIn and initiates the bridge using
//    startIntent. The intent commits to a destination bridgeTokenOut, and the
//    bridger guarantees this amount will show up on chain B (or reverts if the
//    amount of bridgeTokenIn is insufficient).
// 3. Relayer immediately calls fastFinishIntent on chain B, paying Bob.
// 4. Finally, the slow bridge transfer arrives on chain B later, and the
//    relayer can call claimIntent.
// For simplicity, a same-chain Daimo Pay transfer follows the same steps.
// Instead of swap+bridge, startIntent only swaps and verifies correct output.
// FastFinish remains optional but is unnecessary. Claim completes the intent.

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Enables fast cross-chain transfers with optimistic intents.
/// WARNING: Never approve tokens directly to this contract. Never transfer
/// tokens to this contract as a standalone transaction. Such tokens can be
/// stolen by anyone. Instead:
/// - Users should only interact by sending funds to an intent address.
/// - Relayers should transfer funds and call this contract atomically via their
///   own contracts.
///
/// @dev Allows optimistic fast intents. Alice initiates a transfer by calling
/// `startIntent` on chain A. After the bridging delay (e.g. 10+ min for CCTP),
/// funds arrive at the intent address deployed on chain B. Bob (or anyone) can
/// call `claimIntent` on chain B to finish her intent.
///
/// Alternatively, immediately after the first call, a relayer can call
/// `fastFinishIntent` to finish Alice's intent immediately. Later, when the
/// funds arrive from the bridge, the relayer will call `claimIntent` to get
/// repaid for their fast-finish.
contract DaimoPay is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address constant ADDR_MAX = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Efficiently generates + deploys CREATE2 intent addresses.
    PayIntentFactory public immutable intentFactory;
    /// Contract that executes arbitrary contract calls on behalf of the
    /// DaimoPay escrow contract.
    DaimoPayExecutor public immutable executor;

    /// On the source chain, record intents that have been sent.
    mapping(address intentAddr => bool) public intentSent;
    /// On the destination chain, record the status of intents:
    /// - address(0) = not finished.
    /// - Relayer address = fast-finished, awaiting claim to repay relayer.
    /// - ADDR_MAX = claimed. any additional funds received are refunded.
    mapping(address intentAddr => address) public intentToRecipient;

    /// Intent initiated on chain A
    event Start(address indexed intentAddr, PayIntent intent);

    /// Intent completed ~immediately on chain B
    event FastFinish(address indexed intentAddr, address indexed newRecipient);

    /// Intent settled later, once the underlying bridge transfer completes.
    /// Record the final recipient of the claim:
    /// - If fast finished, the relayer.
    /// - Otherwise, the original recipient (Bob).
    event Claim(address indexed intentAddr, address indexed finalRecipient);

    /// When the intent is completed, emit this event. `success=false` indicates
    /// that the final call reverted, and funds were refunded to refundAddr.
    event IntentFinished(
        address indexed intentAddr,
        address indexed destinationAddr,
        bool indexed success,
        PayIntent intent
    );

    /// When a double-paid intent is refunded, emit this event
    event IntentRefunded(
        address indexed intentAddr,
        address indexed refundAddr,
        IERC20[] tokens,
        uint256[] amounts,
        PayIntent intent
    );

    constructor(PayIntentFactory _intentFactory) {
        intentFactory = _intentFactory;
        executor = new DaimoPayExecutor(address(this));
    }

    /// Starts an intent, bridging to the destination chain if necessary.
    function startIntent(
        PayIntent calldata intent,
        IERC20[] calldata paymentTokens,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) public nonReentrant {
        require(
            block.timestamp < intent.expirationTimestamp,
            "DP: intent expired"
        );

        PayIntentContract intentContract = intentFactory.createIntent(intent);

        // Ensure we don't reuse a nonce in the case where Alice is sending to
        // same destination with the same nonce multiple times.
        require(!intentSent[address(intentContract)], "DP: already sent");
        // Can't call startIntent if the intent has already been claimed.
        require(
            intentToRecipient[address(intentContract)] != ADDR_MAX,
            "DP: already claimed"
        );
        // Mark the intent as sent
        intentSent[address(intentContract)] = true;

        // Transfer from intent contract to the executor contract to run
        // relayer-provided calls.
        intentContract.sendTokens({
            intent: intent,
            tokens: paymentTokens,
            recipient: payable(address(executor))
        });

        if (intent.toChainId == block.chainid) {
            // Same chain. Swap the tokens to one of the bridgeTokenOutOptions
            // and send them back to the intent contract for later claimIntent.

            // Run arbitrary calls provided by the relayer. These will generally
            // approve the swap contract and swap if necessary.
            // The executor contract checks that at least one of the
            // bridgeTokenOutOptions is present. Any surplus tokens are given
            // to the caller.
            executor.execute({
                calls: calls,
                expectedOutput: intent.bridgeTokenOutOptions,
                recipient: payable(address(intentContract)),
                surplusRecipient: payable(msg.sender)
            });
        } else {
            // Different chains. Get the input token and amount required to
            // initiate bridging
            IDaimoPayBridger bridger = intent.bridger;
            (address bridgeTokenIn, uint256 inAmount) = bridger
                .getBridgeTokenIn({
                    toChainId: intent.toChainId,
                    bridgeTokenOutOptions: intent.bridgeTokenOutOptions
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
            IERC20(bridgeTokenIn).forceApprove({
                spender: address(bridger),
                value: inAmount
            });
            bridger.sendToChain({
                toChainId: intent.toChainId,
                toAddress: address(intentContract),
                bridgeTokenOutOptions: intent.bridgeTokenOutOptions,
                refundAddress: address(intentContract),
                extraData: bridgeExtraData
            });
        }

        emit Start({intentAddr: address(intentContract), intent: intent});
    }

    /// The relayer calls this function to complete an intent immediately on
    /// the destination chain.
    ///
    /// The relayer must call this function and transfer the necessary tokens to
    /// this contract in the same transaction. This function executes arbitrary
    /// calls specified by the relayer, e.g. to convert the transferred tokens
    /// into the required amount of finalCallToken.
    ///
    /// Later, when the slower bridge transfer arrives, the relayer will be able
    /// to claim the bridged tokens.
    function fastFinishIntent(
        PayIntent calldata intent,
        Call[] calldata calls,
        IERC20[] calldata tokens
    ) public nonReentrant {
        require(intent.toChainId == block.chainid, "DP: wrong chain");
        require(
            block.timestamp < intent.expirationTimestamp,
            "DP: intent expired"
        );

        // Calculate intent address
        address intentAddr = intentFactory.getIntentAddress(intent);

        // Optimistic fast finish is only for transfers which haven't already
        // been fastFinished or claimed.
        require(
            intentToRecipient[intentAddr] == address(0),
            "DP: already finished"
        );
        // Record relayer as new recipient when the bridged tokens arrive
        intentToRecipient[intentAddr] = msg.sender;

        // Transfer tokens to the executor contract to run relayer-provided
        // calls in _finishIntent.
        uint256 n = tokens.length;
        for (uint256 i = 0; i < n; ++i) {
            TokenUtils.transferBalance({
                token: tokens[i],
                recipient: payable(address(executor))
            });
        }

        // Finish the intent and return any leftover tokens to the caller
        _finishIntent({intentAddr: intentAddr, intent: intent, calls: calls});

        emit FastFinish({intentAddr: intentAddr, newRecipient: msg.sender});
    }

    /// Completes an intent, claiming funds. The bridge transfer must already
    /// have been completed--tokens are already in the intent contract.
    ///
    /// If FastFinish happened for this intent, then the recipient is the
    /// relayer who fastFinished the intent. Otherwise, the recipient remains
    /// the original address.
    function claimIntent(
        PayIntent calldata intent,
        Call[] calldata calls
    ) public nonReentrant {
        require(intent.toChainId == block.chainid, "DP: wrong chain");
        require(
            block.timestamp < intent.expirationTimestamp,
            "DP: intent expired"
        );

        PayIntentContract intentContract = intentFactory.createIntent(intent);

        // Check the recipient for this intent.
        address recipient = intentToRecipient[address(intentContract)];
        // If intent is double-paid after it has already been claimed, then
        // the recipient should call refundIntent to get their funds back.
        require(recipient != ADDR_MAX, "DP: already claimed");
        // Mark intent as claimed
        intentToRecipient[address(intentContract)] = ADDR_MAX;

        if (recipient == address(0)) {
            // No relayer showed up, so just complete the intent.
            recipient = intent.finalCall.to;

            // Send tokens from the intent contract to the executor contract
            // to run relayer-provided calls in _finishIntent.
            // The intent contract will check that sufficient bridge tokens
            // were received.
            intentContract.checkBalanceAndSendTokens({
                intent: intent,
                tokenAmounts: intent.bridgeTokenOutOptions,
                recipient: payable(address(executor))
            });

            // Complete the intent and return any leftover tokens to the caller
            _finishIntent({
                intentAddr: address(intentContract),
                intent: intent,
                calls: calls
            });
        } else {
            // Otherwise, the relayer fastFinished the intent. Repay them.
            // The intent contract will check that sufficient bridge tokens
            // were received.
            intentContract.checkBalanceAndSendTokens({
                intent: intent,
                tokenAmounts: intent.bridgeTokenOutOptions,
                recipient: payable(recipient)
            });
        }

        emit Claim({
            intentAddr: address(intentContract),
            finalRecipient: recipient
        });
    }

    /// Refund a double-paid intent. On the source chain, refund only if the
    /// intent has already been started. On the destination chain, refund only
    /// if the intent has already been claimed.
    function refundIntent(
        PayIntent calldata intent,
        IERC20[] calldata tokens
    ) public nonReentrant {
        PayIntentContract intentContract = intentFactory.createIntent(intent);
        address intentAddr = address(intentContract);

        bool expired = block.timestamp >= intent.expirationTimestamp;

        if (intent.toChainId == block.chainid) {
            // Refund only if already claimed or the intent has expired.
            bool claimed = intentToRecipient[address(intentContract)] ==
                ADDR_MAX;
            require(claimed || expired, "DP: not claimed");
        } else {
            // Refund only if already started or the intent has expired.
            require(intentSent[intentAddr] || expired, "DP: not started");
        }

        // Send tokens directly from intent contract to the refund address.
        uint256[] memory amounts = intentContract.sendTokens({
            intent: intent,
            tokens: tokens,
            recipient: payable(intent.refundAddress)
        });

        emit IntentRefunded({
            intentAddr: intentAddr,
            refundAddr: intent.refundAddress,
            tokens: tokens,
            amounts: amounts,
            intent: intent
        });
    }

    /// Execute the calls provided by the relayer and check that there is
    /// sufficient finalCallToken. Then, if the intent has a finalCall, make
    /// the intent call. Otherwise, transfer the token to the final address.
    /// Any surplus tokens are given to the caller.
    /// This function assumes that tokens are already transferred to the
    /// executor contract before being called.
    function _finishIntent(
        address intentAddr,
        PayIntent calldata intent,
        Call[] calldata calls
    ) internal {
        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary. Any surplus tokens
        // are given to the caller.
        TokenAmount[] memory finalCallAmount = new TokenAmount[](1);
        finalCallAmount[0] = intent.finalCallToken;
        executor.execute({
            calls: calls,
            expectedOutput: finalCallAmount,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        bool success;
        if (intent.finalCall.data.length > 0) {
            // If the intent is a call, make the call
            success = TokenUtils.tryTransfer({
                token: intent.finalCallToken.token,
                recipient: payable(address(executor)),
                amount: intent.finalCallToken.amount
            });
            if (success) {
                success = executor.executeFinalCall({
                    finalCall: intent.finalCall,
                    finalCallToken: intent.finalCallToken,
                    refundAddr: payable(intent.refundAddress)
                });
            }
        } else {
            // If the final call is a transfer, transfer the token.
            success = TokenUtils.tryTransfer({
                token: intent.finalCallToken.token,
                recipient: payable(intent.finalCall.to),
                amount: intent.finalCallToken.amount
            });
        }
        // Transfer any excess to the refund address.
        TokenUtils.transferBalance({
            token: intent.finalCallToken.token,
            recipient: payable(intent.refundAddress)
        });

        emit IntentFinished({
            intentAddr: intentAddr,
            destinationAddr: intent.finalCall.to,
            success: success,
            intent: intent
        });
    }

    receive() external payable {}
}
