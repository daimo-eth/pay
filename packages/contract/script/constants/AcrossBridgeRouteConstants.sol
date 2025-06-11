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
    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](2);

        // 10 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            pctFee: 150000000000000,
            flatFee: 53000
        });
        // 10 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            bridgeTokenOut: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            pctFee: 400000000000000,
            flatFee: 87000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](2);

        // 137 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            pctFee: 250000000000000,
            flatFee: 92000
        });
        // 137 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063,
            bridgeTokenOut: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            pctFee: 400000000000000,
            flatFee: 87000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](2);

        // 480 -> 10
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            pctFee: 350000000000000,
            flatFee: 135000
        });
        // 480 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            pctFee: 350000000000000,
            flatFee: 135000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](2);

        // 59144 -> 10
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            bridgeTokenOut: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            pctFee: 500000000000000,
            flatFee: 95000000000000000
        });
        // 59144 -> 137
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            bridgeTokenOut: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063,
            pctFee: 400000000000000,
            flatFee: 77000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAcrossBridger.AcrossBridgeRoute[](0));
}
