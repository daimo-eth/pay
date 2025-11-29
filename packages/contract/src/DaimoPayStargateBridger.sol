// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "./DaimoPayLayerZeroBridger.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import {
    IStargate,
    MessagingFee,
    OFTReceipt
} from "@stargatefinance/stg-evm-v2/src/interfaces/IStargate.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Stargate V2 bridger for same-asset cross-chain transfers.
/// @dev Stargate V2 uses the IOFT interface. Supports both Taxi (immediate) and
/// Bus (batched) modes. Relies on enforced options; pays fees in native.
contract DaimoPayStargateBridger is DaimoPayLayerZeroBridger {
    using SafeERC20 for IERC20;

    /// @notice Maximum iterations for finding the input amount.
    uint256 private constant MAX_ITERATIONS = 10;

    constructor(
        uint256[] memory ids,
        LZBridgeRoute[] memory routes
    ) DaimoPayLayerZeroBridger(ids, routes) {}

    /// @inheritdoc DaimoPayLayerZeroBridger
    /// @dev Iteratively finds the input amount that produces at least
    /// desiredOutLD after Stargate fees. Takes 4 iterations for $100k.
    function _computeAccounting(
        uint256 /*toChainId*/,
        address toAddress,
        LZBridgeRoute memory route,
        uint256 desiredOutLD,
        bytes memory /*extraData*/
    ) internal view override returns (Accounting memory a) {
        // Iteratively find the input amount that produces at least desiredOutLD.
        // Start with the desired output and increase until we meet the target.
        uint256 amountLD = desiredOutLD;

        for (uint256 i = 0; i < MAX_ITERATIONS; ++i) {
            SendParam memory sp = SendParam({
                dstEid: route.dstEid,
                to: _toB32(toAddress),
                amountLD: amountLD,
                minAmountLD: 0,
                extraOptions: new bytes(0),
                composeMsg: new bytes(0),
                oftCmd: "" // Empty for taxi mode
            });

            (, , OFTReceipt memory receipt) = IStargate(route.app).quoteOFT({
                _sendParam: sp
            });

            if (receipt.amountReceivedLD >= desiredOutLD) {
                a.sendAmountLD = amountLD;
                a.minAmountLD = desiredOutLD;
                a.extraOptions = bytes("");
                a.composeMsg = bytes("");
                a.oftCmd = bytes("");
                return a;
            }

            // Increase input by the deficit
            amountLD += desiredOutLD - receipt.amountReceivedLD;
        }

        revert("DPSB: could not find input amount");
    }

    /// @inheritdoc DaimoPayLayerZeroBridger
    /// @dev Override this function because Stargate V2 uses the IStargate
    /// interface instead of IOFT.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        address refundAddress,
        bytes calldata extraData
    ) public override {
        require(toChainId != block.chainid, "DPSB: same chain");
        (
            LZBridgeRoute memory route,
            uint256 desiredOutLD
        ) = _resolveRouteAndOut(toChainId, bridgeTokenOutOptions);

        Accounting memory accounting = _computeAccounting(
            toChainId,
            toAddress,
            route,
            desiredOutLD,
            extraData
        );

        // Build OFT params from the accounting policy.
        SendParam memory sp = SendParam({
            dstEid: route.dstEid,
            to: _toB32(toAddress),
            amountLD: accounting.sendAmountLD,
            minAmountLD: accounting.minAmountLD,
            extraOptions: accounting.extraOptions,
            composeMsg: accounting.composeMsg,
            oftCmd: accounting.oftCmd
        });

        // always pay fees in native (no ZRO)
        MessagingFee memory fee = IOFT(route.app).quoteSend({
            _sendParam: sp,
            _payInLzToken: false
        });
        require(
            address(this).balance >= fee.nativeFee,
            "DPSB: insufficient native fee"
        );

        // Custody + approve exactly what the accounting says.
        IERC20(route.bridgeTokenIn).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: accounting.sendAmountLD
        });
        IERC20(route.bridgeTokenIn).forceApprove({
            spender: route.app,
            value: accounting.sendAmountLD
        });

        // Use Stargate's custom sendToken function to send the tokens.
        IStargate(route.app).sendToken{value: fee.nativeFee}({
            _sendParam: sp,
            _fee: fee,
            _refundAddress: refundAddress
        });

        if (address(this).balance > 0) {
            // native coin refund
            (bool success, ) = tx.origin.call{value: address(this).balance}("");
            require(success, "DPSB: native refund failed");
        }

        emit BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: route.bridgeTokenIn,
            fromAmount: accounting.sendAmountLD,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: route.bridgeTokenOut,
            toAmount: desiredOutLD,
            refundAddress: refundAddress
        });
    }
}
