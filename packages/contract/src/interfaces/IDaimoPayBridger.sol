// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../TokenUtils.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Bridges assets. Specifically, it lets any relayer initiate a bridge
/// transaction to another chain.
interface IDaimoPayBridger {
    /// Emitted when a bridge transaction is initiated
    event BridgeInitiated(
        address fromAddress,
        address fromToken,
        uint256 fromAmount,
        uint256 toChainId,
        address toAddress,
        address toToken,
        uint256 toAmount,
        address refundAddress
    );

    /// Determine the input token and amount required to achieve one of the
    /// given output options on a given chain.
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] memory bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount);

    /// Initiate a bridge. Guarantee that one of the bridge token options
    /// (bridgeTokenOut, outAmount) shows up at toAddress on toChainId.
    /// Otherwise, revert.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        address refundAddress,
        bytes calldata extraData
    ) external;
}
