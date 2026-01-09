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
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 1 -> 10
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 1 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 1 -> 143
        chainIds[2] = 143;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 1 -> 480
        chainIds[3] = 480;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 1 -> 999
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 1 -> 8453
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 1 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 1 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 10 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 10 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 10 -> 143
        chainIds[2] = 143;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 10 -> 480
        chainIds[3] = 480;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 10 -> 999
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 10 -> 8453
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 10 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 10 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 137 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 137 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 137 -> 143
        chainIds[2] = 143;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 137 -> 480
        chainIds[3] = 480;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 137 -> 999
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 137 -> 8453
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 137 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 137 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 143
    if (sourceChainId == 143) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 143 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 143 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 143 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 143 -> 480
        chainIds[3] = 480;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 143 -> 999
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 143 -> 8453
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 143 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 143 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 480 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 480 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 480 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 480 -> 143
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 480 -> 999
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 480 -> 8453
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 480 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 480 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 999
    if (sourceChainId == 999) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 999 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 999 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 999 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 999 -> 143
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 999 -> 480
        chainIds[4] = 480;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 999 -> 8453
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 999 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 999 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 8453 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 8453 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 8453 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 8453 -> 143
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 8453 -> 480
        chainIds[4] = 480;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 8453 -> 999
        chainIds[5] = 999;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 8453 -> 42161
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });
        // 8453 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 42161 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 42161 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 42161 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 42161 -> 143
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 42161 -> 480
        chainIds[4] = 480;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 42161 -> 999
        chainIds[5] = 999;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 42161 -> 8453
        chainIds[6] = 8453;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 42161 -> 59144
        chainIds[7] = 59144;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](8);

        // 59144 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 59144 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 2,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
        });
        // 59144 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 7,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
        });
        // 59144 -> 143
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 15,
            bridgeTokenOut: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603
        });
        // 59144 -> 480
        chainIds[4] = 480;
        bridgeRoutes[4] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 14,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
        });
        // 59144 -> 999
        chainIds[5] = 999;
        bridgeRoutes[5] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 19,
            bridgeTokenOut: 0xb88339CB7199b77E23DB6E890353E22632Ba630f
        });
        // 59144 -> 8453
        chainIds[6] = 8453;
        bridgeRoutes[6] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 59144 -> 42161
        chainIds[7] = 42161;
        bridgeRoutes[7] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 3,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](0));
}
