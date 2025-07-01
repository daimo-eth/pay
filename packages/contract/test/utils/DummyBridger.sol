// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import {IDaimoPayBridger, TokenAmount} from "../../src/interfaces/IDaimoPayBridger.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @title DummyBridger
/// @notice mock DaimoPayBridger for testing
contract DummyBridger is IDaimoPayBridger {
    event Send(uint256 toChainId, address toAddress, address token, uint256 amount, bytes extraData);

    function getBridgeTokenIn(uint256, TokenAmount[] memory outs)
        external
        pure
        override
        returns (address bridgeTokenIn, uint256 inAmount)
    {
        // for testing we assume the first element is the required token/amount
        bridgeTokenIn = address(outs[0].token);
        inAmount = outs[0].amount;
    }

    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        bytes calldata extraData
    ) external override {
        emit Send(
            toChainId, toAddress, address(bridgeTokenOutOptions[0].token), bridgeTokenOutOptions[0].amount, extraData
        );

        emit BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: address(bridgeTokenOutOptions[0].token),
            fromAmount: bridgeTokenOutOptions[0].amount,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: address(bridgeTokenOutOptions[0].token),
            toAmount: bridgeTokenOutOptions[0].amount
        });
    }
}
