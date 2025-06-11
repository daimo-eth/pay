// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayCCTPV2Bridger.sol";

// @title CCTPV2BridgeRouteConstants
// @notice Auto-generated constants for CCTP V2 bridge routes

// Return all CCTP V2 bridge routes for the given source chain.
function getCCTPV2BridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory bridgeRoutes
    )
{
    // Source chain 1
    if (sourceChainId == 1) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](4);

        // 1 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 1 -> 8453
        chainIds[1] = 8453;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 1 -> 42161
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 1 -> 59144
        chainIds[3] = 59144;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](4);

        // 480 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 480 -> 8453
        chainIds[1] = 8453;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 480 -> 42161
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 480 -> 59144
        chainIds[3] = 59144;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](4);

        // 8453 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 8453 -> 480
        chainIds[1] = 480;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 8453 -> 42161
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 8453 -> 59144
        chainIds[3] = 59144;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](4);

        // 42161 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 42161 -> 480
        chainIds[1] = 480;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 42161 -> 8453
        chainIds[2] = 8453;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 42161 -> 59144
        chainIds[3] = 59144;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](4);

        // 59144 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 59144 -> 480
        chainIds[1] = 480;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 59144 -> 8453
        chainIds[2] = 8453;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 59144 -> 42161
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](0));
}
