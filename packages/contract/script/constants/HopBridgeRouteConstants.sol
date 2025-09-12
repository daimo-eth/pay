// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

// @title HopBridgeRouteConstants
// @notice Auto-generated constants for Hop bridge routes

// Return all Hop bridge routes for the given source chain.
function getHopBridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory destChainIds,
        uint32[] memory hopChainIds
    )
{
    // Source chain 56
    if (sourceChainId == 56) {
        destChainIds = new uint256[](2);
        hopChainIds = new uint32[](2);

        // 56 -> 480
        destChainIds[0] = 480;
        hopChainIds[0] = 42161;
        // 56 -> 534352
        destChainIds[1] = 534352;
        hopChainIds[1] = 42161;

        return (destChainIds, hopChainIds);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        destChainIds = new uint256[](2);
        hopChainIds = new uint32[](2);

        // 480 -> 56
        destChainIds[0] = 56;
        hopChainIds[0] = 42161;
        // 480 -> 42220
        destChainIds[1] = 42220;
        hopChainIds[1] = 42161;

        return (destChainIds, hopChainIds);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        destChainIds = new uint256[](2);
        hopChainIds = new uint32[](2);

        // 42220 -> 480
        destChainIds[0] = 480;
        hopChainIds[0] = 42161;
        // 42220 -> 534352
        destChainIds[1] = 534352;
        hopChainIds[1] = 42161;

        return (destChainIds, hopChainIds);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        destChainIds = new uint256[](2);
        hopChainIds = new uint32[](2);

        // 534352 -> 56
        destChainIds[0] = 56;
        hopChainIds[0] = 42161;
        // 534352 -> 42220
        destChainIds[1] = 42220;
        hopChainIds[1] = 42161;

        return (destChainIds, hopChainIds);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new uint32[](0));
}
