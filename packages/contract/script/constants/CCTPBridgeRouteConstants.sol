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
    // Source chain 1
    if (sourceChainId == 1) {
        chainIds = new uint256[](3);
        bridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](3);

        // 1 -> 10
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 1 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 1 -> 42161
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](4);

        // 10 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 10 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 10 -> 8453
        chainIds[2] = 8453;
        bridgeRoutes[2] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 10 -> 42161
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](4);

        // 137 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 137 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 137 -> 8453
        chainIds[2] = 8453;
        bridgeRoutes[2] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 137 -> 42161
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](3);
        bridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](3);

        // 8453 -> 10
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 8453 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 8453 -> 42161
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](4);

        // 42161 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 42161 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 42161 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 42161 -> 8453
        chainIds[3] = 8453;
        bridgeRoutes[3] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayCCTPBridger.CCTPBridgeRoute[](0));
}
