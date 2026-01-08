// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IDepositAddressBridger} from "../../src/interfaces/IDepositAddressBridger.sol";
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

    mapping(uint256 chainId => address stableOut) public chainIdToStableOut;

    function getBridgeTokenIn(
        uint256 /*toChainId*/,
        TokenAmount calldata bridgeTokenOut
    ) external pure override returns (address bridgeTokenIn, uint256 inAmount) {
        bridgeTokenIn = address(bridgeTokenOut.token);
        inAmount = bridgeTokenOut.amount;
    }

    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount calldata bridgeTokenOut,
        address refundAddress,
        bytes calldata /* extraData */
    ) external override {
        // Burn the tokens, simulating a slow bridge
        bridgeTokenOut.token.safeTransferFrom(
            msg.sender,
            address(0xdead),
            bridgeTokenOut.amount
        );

        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: address(bridgeTokenOut.token),
            fromAmount: bridgeTokenOut.amount,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: address(bridgeTokenOut.token),
            toAmount: bridgeTokenOut.amount,
            refundAddress: refundAddress
        });
    }
}
