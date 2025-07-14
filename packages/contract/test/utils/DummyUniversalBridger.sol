// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IUniversalAddressBridger} from "../../src/interfaces/IUniversalAddressBridger.sol";
import {TokenAmount} from "../../src/TokenUtils.sol";

/// @title DummyUniversalBridger
/// @notice Minimal in-memory implementation of the IUniversalAddressBridger used exclusively in Foundry tests.
///         It simply transfers `minOut` units of `outToken` from the caller to the destination address and
///         echoes the parameters via an event. No real bridging is performed.
contract DummyUniversalBridger is IUniversalAddressBridger {
    using SafeERC20 for IERC20;

    event BridgeExecuted(uint256 toChainId, address toAddr, address token, uint256 amount);

    // ---------------------------------------------------------------------
    // IUniversalAddressBridger
    // ---------------------------------------------------------------------

    function getBridgeTokenIn(uint256 /*toChainId*/, TokenAmount calldata bridgeTokenOut)
        external
        pure
        override
        returns (address bridgeTokenIn, uint256 inAmount)
    {
        bridgeTokenIn = address(bridgeTokenOut.token);
        inAmount = bridgeTokenOut.amount;
    }

    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount calldata bridgeTokenOut,
        bytes calldata /*extraData*/
    ) external override {
        bridgeTokenOut.token.safeTransferFrom(msg.sender, toAddress, bridgeTokenOut.amount);
        emit BridgeExecuted(toChainId, toAddress, address(bridgeTokenOut.token), bridgeTokenOut.amount);
    }
}
