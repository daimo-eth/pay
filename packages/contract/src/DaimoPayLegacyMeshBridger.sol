// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "./DaimoPayLayerZeroBridger.sol";
import {IOFT} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

interface IUsdtOFT is IOFT {
    function feeBps() external view returns (uint16);
}

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice USDT₮0 Legacy Mesh Bridger
/// @dev No extraData needed; relies on enforced options on the destination.
contract DaimoPayLegacyMeshBridger is DaimoPayLayerZeroBridger {
    constructor(
        uint256[] memory ids,
        LZBridgeRoute[] memory routes
    ) DaimoPayLayerZeroBridger(ids, routes) {}

    /// @inheritdoc DaimoPayLayerZeroBridger
    function _computeAccounting(
        uint256 /*toChainId*/,
        address /*toAddress*/,
        LZBridgeRoute memory route,
        uint256 desiredOutLD,
        bytes memory /*extraData*/
    ) internal view override returns (Accounting memory a) {
        // Legacy Mesh takes feeBps on amountLD -> gross up to preserve exact-out
        uint16 bps = IUsdtOFT(route.app).feeBps();
        require(bps < 10_000, "bad fee");
        uint256 denom = 10_000 - bps;
        uint256 gross = (desiredOutLD * 10_000 + denom - 1) / denom; // ceil div

        a.inAmountLD = gross; // pull from user
        a.sendAmountLD = gross; // send via OFT
        a.minAmountLD = desiredOutLD; // exact-out guarantee
        a.extraOptions = bytes(""); // rely on enforced options (empty is OK)
        a.composeMsg = bytes(""); // no compose
        a.oftCmd = bytes(""); // none
        a.payInZRO = false; // pay fees in native
    }
}
