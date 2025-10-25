// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "./DaimoPayLayerZeroBridger.sol";
import {IOFT, SendParam} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice USDT0 (OFT) bridger
/// @dev Relies on OFT enforced options; pays fees in native; no extraData needed.
contract DaimoPayUSDT0Bridger is DaimoPayLayerZeroBridger {
    constructor(
        uint256[] memory ids,
        LZBridgeRoute[] memory routes
    ) DaimoPayLayerZeroBridger(ids, routes) {}

    /// @inheritdoc DaimoPayLayerZeroBridger
    function _computeAccounting(
        uint256 /*toChainId*/,
        address /*toAddress*/,
        LZBridgeRoute memory /*r*/,
        uint256 desiredOutLD,
        bytes memory /*extraData*/
    ) internal pure override returns (Accounting memory a) {
        // Plain OFT path: exact-out, no transfer bps.
        a.inAmountLD = desiredOutLD; // pull from user
        a.sendAmountLD = desiredOutLD; // send via OFT
        a.minAmountLD = desiredOutLD; // strict out guarantee
        a.extraOptions = bytes(""); // rely on enforced options
        a.composeMsg = bytes(""); // none
        a.oftCmd = bytes(""); // none
    }
}
