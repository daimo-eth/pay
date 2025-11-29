// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayLayerZeroBridger.sol";

// @title LegacyMeshBridgeRouteConstants
// @notice Auto-generated constants for Legacy Mesh bridge routes

// Return all Legacy Mesh bridge routes for the given source chain.
function getLegacyMeshBridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
    )
{
    // Source chain 1
    if (sourceChainId == 1) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 1 -> 42220
        chainIds[0] = 42220;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30125,
            app: 0x1F748c76dE468e9D11bd340fA9D5CBADf315dFB0,
            bridgeTokenOut: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 42161 -> 42220
        chainIds[0] = 42220;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30125,
            app: 0x77652D5aba086137b595875263FC200182919B92,
            bridgeTokenOut: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](2);

        // 42220 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0xf10E161027410128E63E75D0200Fb6d34b2db243,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenIn: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            bridgeTokenOutDecimals: 6
        });
        // 42220 -> 42161
        chainIds[1] = 42161;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0xf10E161027410128E63E75D0200Fb6d34b2db243,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenIn: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}
