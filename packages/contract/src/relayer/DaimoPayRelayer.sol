// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "../DaimoPay.sol";
import "../TokenUtils.sol";
import "../UniversalAddress.sol";
import "../interfaces/IUniversalAddressManager.sol";

/// @author Daimo, Inc
/// @notice Reference relayer contract. This is a private, untrusted relayer.
contract DaimoPayRelayer is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant RELAYER_EOA_ROLE = keccak256("RELAYER_EOA_ROLE");

    // Enabled only within transactions. Otherwise zero.
    bytes32 private approvedSwapAndTipHash;

    // For gas efficiency, set to 1 to disable swapAndTip.
    bytes32 private constant NO_APPROVED_HASH = bytes32(uint256(1));

    /// @param requiredTokenIn (token, amount) the swap must receive as input
    /// @param suppliedAmountIn amount the user actually sent
    /// @param requiredTokenOut (token, amount) the swap is expected to output
    /// @param maxPreTip ceiling on input-side tip
    /// @param maxPostTip ceiling on output-side tip
    /// @param innerSwap the swap that will be executed
    struct SwapAndTipParams {
        TokenAmount requiredTokenIn;
        uint256 suppliedAmountIn;
        TokenAmount requiredTokenOut;
        uint256 maxPreTip;
        uint256 maxPostTip;
        Call innerSwap;
        address payable refundAddress;
    }

    event SwapAndTip(
        address indexed caller,
        address indexed requiredTokenIn,
        address indexed requiredTokenOut,
        uint256 suppliedAmountIn,
        uint256 swapAmountOut,
        uint256 maxPreTip,
        uint256 maxPostTip,
        uint256 preTip,
        uint256 postTip
    );

    event OverPaymentRefunded(
        address indexed refundAddress,
        address indexed token,
        uint256 amount
    );

    constructor(address admin) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(RELAYER_EOA_ROLE, admin);
        approvedSwapAndTipHash = NO_APPROVED_HASH;
    }

    /// Add a new address that can trigger the relayer.
    /// We use multiple relayer EOAs to avoid nonce contention.
    function grantRelayerEOARole(
        address relayer
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(RELAYER_EOA_ROLE, relayer);
    }

    /// Withdraws an amount of tokens from the contract to the admin.
    function withdrawAmount(
        IERC20 token,
        uint256 amount
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        TokenUtils.transfer(token, payable(msg.sender), amount);
    }

    /// Withdraws the full balance of a token from the relayer to the admin.
    function withdrawBalance(
        IERC20 token
    ) public onlyRole(DEFAULT_ADMIN_ROLE) returns (uint256) {
        return TokenUtils.transferBalance(token, payable(msg.sender));
    }

    /// Perform a user-funded token swap, optionally topped-up (“tipped”)
    /// by the relayer, and deliver a guaranteed output amount to the caller.
    /// ─────────────────────────────────────────────────────────────────
    /// - If the caller sent *less* than the swap’s required input
    ///   (`requiredTokenIn.amount`), the relayer contributes up to
    ///   `maxPreTip` of the same token so the swap can still succeed.
    ///
    /// - If the caller sent *more* than the swap’s required input
    ///   (`requiredTokenIn.amount`), the relayer refunds the surplus to
    ///   `refundAddress` if set and emits the `OverPaymentRefunded` event.
    ///
    /// - The inner swap (arbitrary calldata in `innerSwap`) executes with
    ///   **exactly** `requiredTokenIn.amount` input.
    ///
    /// - After the swap, if the output is still short of
    ///   `requiredTokenOut.amount`, the relayer tops-up (“post-tip”) up to
    ///   `maxPostTip` of the output token.
    ///
    /// - The function finally transfers `requiredTokenOut.amount`
    ///   to `msg.sender`, and emits the `SwapAndTip` event.
    function swapAndTip(SwapAndTipParams calldata p) external payable {
        _checkSwapAndTipHash(p);

        //////////////////////////////////////////////////////////////
        // PRE-SWAP
        //////////////////////////////////////////////////////////////

        uint256 preSwapBalance = TokenUtils.getBalanceOf({
            token: p.requiredTokenOut.token,
            addr: address(this)
        });
        uint256 preTipAmount = _collectSwapInput(p);
        _refundOverPayment(p);

        //////////////////////////////////////////////////////////////
        // SWAP
        //////////////////////////////////////////////////////////////

        uint256 postSwapBalance = _executeSwap(p);
        uint256 swapAmountOut = postSwapBalance - preSwapBalance;
        // If the tokens are the same, then the pre-tip amount counts towards
        // the swap output
        if (p.requiredTokenIn.token == p.requiredTokenOut.token) {
            swapAmountOut += preTipAmount;
        }

        //////////////////////////////////////////////////////////////
        // POST-SWAP
        //////////////////////////////////////////////////////////////

        uint256 postTipAmount = _tipAndTransferOutput(
            p,
            postSwapBalance,
            swapAmountOut
        );

        emit SwapAndTip({
            caller: msg.sender,
            requiredTokenIn: address(p.requiredTokenIn.token),
            requiredTokenOut: address(p.requiredTokenOut.token),
            suppliedAmountIn: p.suppliedAmountIn,
            swapAmountOut: swapAmountOut,
            maxPreTip: p.maxPreTip,
            maxPostTip: p.maxPostTip,
            preTip: preTipAmount,
            postTip: postTipAmount
        });
    }

    /// Check that this exact swapAndTip call was approved and then nullify the
    /// hash. The hash is single-use.
    function _checkSwapAndTipHash(SwapAndTipParams calldata p) private {
        require(
            keccak256(abi.encode(p)) == approvedSwapAndTipHash,
            "DPR: wrong hash"
        );
        // Nullify the hash. The hash is single-use.
        approvedSwapAndTipHash = NO_APPROVED_HASH;
    }

    /// Collect the swap input tokens from the caller and approve the swapper
    function _collectSwapInput(
        SwapAndTipParams calldata p
    ) private returns (uint256 preTipAmount) {
        if (address(p.requiredTokenIn.token) == address(0)) {
            preTipAmount = _collectNativeSwapInput(p);
        } else {
            preTipAmount = _collectERC20SwapInput(p);
        }
    }

    function _collectNativeSwapInput(
        SwapAndTipParams calldata p
    ) private returns (uint256 preTipAmount) {
        require(
            address(p.requiredTokenIn.token) == address(0),
            "DPR: not native token"
        );

        // The caller should've supplied the exact amount in msg.value
        require(p.suppliedAmountIn == msg.value, "DPR: wrong msg.value");

        // Check that the tip doesn't exceed maxPreTip
        if (p.suppliedAmountIn < p.requiredTokenIn.amount) {
            preTipAmount = p.requiredTokenIn.amount - p.suppliedAmountIn;
            require(preTipAmount <= p.maxPreTip, "DPR: excessive pre tip");

            // Ensure the relayer has enough balance to cover the tip
            uint256 balance = TokenUtils.getBalanceOf({
                token: p.requiredTokenIn.token,
                addr: address(this)
            });
            require(
                balance >= p.requiredTokenIn.amount,
                "DPR: balance less than required input"
            );
        }

        // Inner swap should not require more than the required input amount
        require(
            p.innerSwap.value <= p.requiredTokenIn.amount,
            "DPR: wrong inner swap value"
        );
    }

    function _collectERC20SwapInput(
        SwapAndTipParams calldata p
    ) private returns (uint256 preTipAmount) {
        require(
            address(p.requiredTokenIn.token) != address(0),
            "DPR: not ERC20 token"
        );

        // Pull the tokens the user supplied
        TokenUtils.transferFrom({
            token: p.requiredTokenIn.token,
            from: msg.sender,
            to: address(this),
            amount: p.suppliedAmountIn
        });

        // Check that the tip doesn't exceed maxPreTip
        if (p.suppliedAmountIn < p.requiredTokenIn.amount) {
            preTipAmount = p.requiredTokenIn.amount - p.suppliedAmountIn;
            require(preTipAmount <= p.maxPreTip, "DPR: excessive pre tip");

            // Ensure the relayer has enough balance to cover the tip
            uint256 balance = TokenUtils.getBalanceOf({
                token: p.requiredTokenIn.token,
                addr: address(this)
            });
            require(
                balance >= p.requiredTokenIn.amount,
                "DPR: balance less than required input"
            );
        }

        // Approve the swapper for the full required amount. The difference
        // is tipped by the contract.
        if (p.innerSwap.to != address(0)) {
            p.requiredTokenIn.token.forceApprove({
                spender: p.innerSwap.to,
                value: p.requiredTokenIn.amount
            });
        }
    }

    function _refundOverPayment(SwapAndTipParams calldata p) private {
        // No refund address
        if (p.refundAddress == address(0)) return;
        // No overpayment happened
        if (p.suppliedAmountIn <= p.requiredTokenIn.amount) return;

        uint256 overpay = p.suppliedAmountIn - p.requiredTokenIn.amount;
        TokenUtils.transfer({
            token: p.requiredTokenIn.token,
            recipient: p.refundAddress,
            amount: overpay
        });

        emit OverPaymentRefunded({
            refundAddress: p.refundAddress,
            token: address(p.requiredTokenIn.token),
            amount: overpay
        });
    }

    // Execute the swapAndTip inner swap
    function _executeSwap(
        SwapAndTipParams calldata p
    ) private returns (uint256 postSwapBalance) {
        // Zero address indicates no inner swap
        if (p.innerSwap.to != address(0)) {
            (bool success, ) = p.innerSwap.to.call{value: p.innerSwap.value}(
                p.innerSwap.data
            );
            require(success, "DPR: inner swap failed");
        }

        postSwapBalance = TokenUtils.getBalanceOf({
            token: p.requiredTokenOut.token,
            addr: address(this)
        });
    }

    function _tipAndTransferOutput(
        SwapAndTipParams calldata p,
        uint256 postSwapBalance,
        uint256 swapAmountOut
    ) private returns (uint256 postTipAmount) {
        // If the swap output is less than required, check that the tip doesn't
        // exceed maxPostTip
        if (swapAmountOut < p.requiredTokenOut.amount) {
            postTipAmount = p.requiredTokenOut.amount - swapAmountOut;
            require(postTipAmount <= p.maxPostTip, "DPR: excessive post tip");

            // Ensure the relayer has enough balance to cover the tip
            require(
                postSwapBalance >= p.requiredTokenOut.amount,
                "DPR: balance less than required output"
            );
        }

        // Transfer the required output tokens to the caller, tipping the
        // shortfall if needed. If there are surplus tokens from the swap, keep
        // them.
        TokenUtils.transfer({
            token: p.requiredTokenOut.token,
            recipient: payable(msg.sender),
            amount: p.requiredTokenOut.amount
        });
    }

    /// Starts a new intent.
    function startIntent(
        Call[] calldata preCalls,
        DaimoPay dp,
        PayIntent calldata intent,
        IERC20[] calldata paymentTokens,
        Call[] calldata startCalls,
        bytes calldata bridgeExtraData,
        Call[] calldata postCalls,
        bytes32 swapAndTipHash
    ) public payable onlyRole(RELAYER_EOA_ROLE) {
        approvedSwapAndTipHash = swapAndTipHash;

        // Make pre-start calls
        for (uint256 i = 0; i < preCalls.length; ++i) {
            Call calldata call = preCalls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPR: preCall failed");
        }

        dp.startIntent({
            intent: intent,
            paymentTokens: paymentTokens,
            calls: startCalls,
            bridgeExtraData: bridgeExtraData
        });

        // Make post-start calls
        for (uint256 i = 0; i < postCalls.length; ++i) {
            Call calldata call = postCalls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPR: postCall failed");
        }

        approvedSwapAndTipHash = NO_APPROVED_HASH;
    }

    function fastFinish(
        DaimoPay dp,
        PayIntent calldata intent,
        TokenAmount calldata tokenIn,
        Call[] calldata calls
    ) public onlyRole(RELAYER_EOA_ROLE) {
        TokenUtils.transfer({
            token: tokenIn.token,
            recipient: payable(address(dp)),
            amount: tokenIn.amount
        });

        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = tokenIn.token;
        dp.fastFinishIntent({intent: intent, calls: calls, tokens: tokens});
    }

    function claimAndKeep(
        Call[] calldata preCalls,
        DaimoPay dp,
        PayIntent calldata intent,
        Call[] calldata claimCalls,
        Call[] calldata postCalls,
        bytes32 swapAndTipHash
    ) public onlyRole(RELAYER_EOA_ROLE) {
        approvedSwapAndTipHash = swapAndTipHash;

        // Make pre-claim calls
        for (uint256 i = 0; i < preCalls.length; ++i) {
            Call calldata call = preCalls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPR: preCall failed");
        }

        dp.claimIntent({intent: intent, calls: claimCalls});

        // Make post-claim calls
        for (uint256 i = 0; i < postCalls.length; ++i) {
            Call calldata call = postCalls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPR: postCall failed");
        }

        approvedSwapAndTipHash = NO_APPROVED_HASH;
    }

    function uaFastFinish(
        Call[] calldata preCalls,
        IUniversalAddressManager manager,
        UniversalAddressRoute calldata route,
        TokenAmount calldata tokenIn,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        Call[] calldata calls,
        uint256 sourceChainId
    ) public payable onlyRole(RELAYER_EOA_ROLE) {
        // Execute any pre-calls provided by the relayer. These can be used
        // to perform swaps or other setup before finishing the UA intent.
        for (uint256 i = 0; i < preCalls.length; ++i) {
            Call calldata c = preCalls[i];
            (bool success, ) = c.to.call{value: c.value}(c.data);
            require(success, "DPR: preCall failed");
        }

        bool isNative = address(tokenIn.token) == address(0);

        if (isNative) {
            // Ensure the caller supplied the correct native value
            require(msg.value == tokenIn.amount, "DPR: wrong msg.value");
        } else {
            // ERC20 path – approve the manager for the token amount
            TokenUtils.approve({
                token: tokenIn.token,
                spender: address(manager),
                amount: tokenIn.amount
            });
        }

        // Transfer the input tokens to the manager so that it can immediately
        // forward them to the executor inside fastFinishIntent.
        TokenUtils.transfer({
            token: tokenIn.token,
            recipient: payable(address(manager)),
            amount: tokenIn.amount
        });

        // Call fastFinishIntent on the UniversalAddressManager.
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: tokenIn.token,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: sourceChainId
        });

        // Reset the allowance back to zero for cleanliness/security.
        if (!isNative) {
            TokenUtils.approve({
                token: tokenIn.token,
                spender: address(manager),
                amount: 0
            });
        }
    }

    receive() external payable {}
}
