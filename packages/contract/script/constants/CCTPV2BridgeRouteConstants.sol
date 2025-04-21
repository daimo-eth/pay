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
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](2);

        // 1 -> 8453
        chainIds[0] = 8453;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });
        // 1 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](2);

        // 8453 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 8453 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 11,
            bridgeTokenOut: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](2);

        // 59144 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
        });
        // 59144 -> 8453
        chainIds[1] = 8453;
        bridgeRoutes[1] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: 6,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](0));
}
