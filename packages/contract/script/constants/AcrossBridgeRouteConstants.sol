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
    // Source chain 1
    if (sourceChainId == 1) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 1 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 150000000000000,
            flatFee: 60000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 10 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 150000000000000,
            flatFee: 60000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 137 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 250000000000000,
            flatFee: 100000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 480 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 350000000000000,
            flatFee: 150000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 8453 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 150000000000000,
            flatFee: 60000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 42161 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 150000000000000,
            flatFee: 60000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](1);

        // 59144 -> 534352
        chainIds[0] = 534352;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            pctFee: 150000000000000,
            flatFee: 60000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        chainIds = new uint256[](7);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](7);

        // 534352 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            pctFee: 8000000000000000,
            flatFee: 1650000
        });
        // 534352 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            pctFee: 500000000000000,
            flatFee: 200000
        });
        // 534352 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            pctFee: 500000000000000,
            flatFee: 200000
        });
        // 534352 -> 480
        chainIds[3] = 480;
        bridgeRoutes[3] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            pctFee: 1100000000000000,
            flatFee: 420000
        });
        // 534352 -> 8453
        chainIds[4] = 8453;
        bridgeRoutes[4] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            pctFee: 520000000000000,
            flatFee: 200000
        });
        // 534352 -> 42161
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            pctFee: 520000000000000,
            flatFee: 200000
        });
        // 534352 -> 59144
        chainIds[6] = 59144;
        bridgeRoutes[6] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            pctFee: 600000000000000,
            flatFee: 220000
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAcrossBridger.AcrossBridgeRoute[](0));
}
