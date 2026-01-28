// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayAxelarBridger.sol";

// @title AxelarBridgeRouteConstants
// @notice Auto-generated constants for Axelar bridge routes

// Return all Axelar bridge routes for the given source chain.
// Configures bridged tokens to be sent to the provided axelarReceiver
// address on the destination chain.
function getAxelarBridgeRoutes(
    uint256 sourceChainId,
    address axelarReceiver
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayAxelarBridger.AxelarBridgeRoute[] memory bridgeRoutes
    )
{


    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAxelarBridger.AxelarBridgeRoute[](0));
}
