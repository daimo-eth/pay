// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IUniversalAddressBridger} from "../../src/interfaces/IUniversalAddressBridger.sol";
import {TokenAmount} from "../../src/TokenUtils.sol";
import {IDaimoPayBridger} from "../../src/interfaces/IDaimoPayBridger.sol";

/// @title DummyTronBridger
/// @notice Tron-compatible bridger that uses raw transfers (no SafeERC20)
///         to handle TRC20-USDT's false return value quirk.
contract DummyTronBridger is IUniversalAddressBridger {
    // ---------------------------------------------------------------------
    // IUniversalAddressBridger
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
        // Use raw transferFrom (no SafeERC20) for TRC20-USDT compatibility
        uint256 balanceBefore = bridgeTokenOut.token.balanceOf(address(0xdead));

        // Raw call - ignore return value
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = address(bridgeTokenOut.token).call(
            abi.encodeWithSelector(
                IERC20.transferFrom.selector,
                msg.sender,
                address(0xdead),
                bridgeTokenOut.amount
            )
        );
        require(success, "DummyTronBridger: transferFrom call failed");

        // Verify via balance diff
        uint256 balanceAfter = bridgeTokenOut.token.balanceOf(address(0xdead));
        require(
            balanceAfter >= balanceBefore + bridgeTokenOut.amount,
            "DummyTronBridger: transfer failed"
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
