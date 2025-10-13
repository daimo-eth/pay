// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayLayerZeroBridger.sol";

// @title USDT0BridgeRouteConstants
// @notice Auto-generated constants for USDT0 bridge routes

// Return all USDT0 bridge routes for the given source chain.
function getUSDT0BridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
    )
{


    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}
