// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayLayerZeroBridger.sol";

// @title StargateBridgeRouteConstants
// @notice Auto-generated constants for Stargate bridge routes

// Return all Stargate bridge routes for the given source chain.
function getStargateBridgeRoutes(
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

        // 1 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xc026395860Db2d07ee33e05fE50ed7bD583189C7,
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        chainIds = new uint256[](5);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](5);

        // 56 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 8453
        chainIds[2] = 8453;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30184,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 42161
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 534352
        chainIds[4] = 534352;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 137 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4,
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 8453 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x27a16dc786820B16E5c9028b75B99F6f604b5d26,
            bridgeTokenIn: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
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
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 534352 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}
