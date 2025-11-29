// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayLayerZeroBridger.sol";

// @title LegacyMeshBridgeRouteConstants
// @notice Auto-generated constants for Legacy Mesh bridge routes

// Return all Legacy Mesh bridge routes for the given source chain.
function getStargateBridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
    )
{
    // Source chain 56
    if (sourceChainId == 56) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 56 -> 42161
        chainIds[0] = 42161;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 42161 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xe8CDF27AcD73a434D661C84887215F7598e7d0d3,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOutDecimals: 18
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}
