// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayAcrossBridger.sol";

// @title AcrossBridgeRouteConstants
// @notice Auto-generated constants for Across bridge routes

// Return all Across bridge routes for the given source chain.
function getAcrossBridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayAcrossBridger.AcrossBridgeRoute[] memory bridgeRoutes
    )
{


    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAcrossBridger.AcrossBridgeRoute[](0));
}
