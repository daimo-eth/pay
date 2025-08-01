// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayCCTPBridger.sol";

// @title CCTPBridgeRouteConstants
// @notice Auto-generated constants for CCTP bridge routes

// Return all CCTP bridge routes for the given source chain.
function getCCTPBridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayCCTPBridger.CCTPBridgeRoute[] memory bridgeRoutes
    )
{


    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayCCTPBridger.CCTPBridgeRoute[](0));
}
