// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {
    IDepositAddressBridger
} from "../../src/interfaces/IDepositAddressBridger.sol";
import {TokenAmount} from "../../src/TokenUtils.sol";
import {IDaimoPayBridger} from "../../src/interfaces/IDaimoPayBridger.sol";

/// @title DummyDepositAddressBridger
/// @notice Minimal in-memory implementation of the IDepositAddressBridger used exclusively in Foundry tests.
///         It simply transfers `minOut` units of `outToken` from the caller to the destination address and
///         echoes the parameters via an event. No real bridging is performed.
contract DummyDepositAddressBridger is IDepositAddressBridger {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // IDepositAddressBridger
    // ---------------------------------------------------------------------

    function getBridgeTokenIn(
        uint256 /*toChainId*/,
        TokenAmount calldata stableOut,
        address bridgerAdapter
    ) external pure override returns (address bridgeTokenIn, uint256 inAmount) {
        bridgeTokenIn = address(stableOut.token);
        inAmount = stableOut.amount;
    }

    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount calldata stableOut,
        address bridgerAdapter,
        address refundAddress,
        bytes calldata /* extraData */
    ) external override {
        // Burn the tokens, simulating a slow bridge
        stableOut.token.safeTransferFrom(
            msg.sender,
            address(0xdead),
            stableOut.amount
        );

        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: address(stableOut.token),
            fromAmount: stableOut.amount,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: address(stableOut.token),
            toAmount: stableOut.amount,
            refundAddress: refundAddress
        });
    }
}
