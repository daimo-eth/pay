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
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](2);

        // 1 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 600000000000000,
            flatFee: 120000000000000
        });
        // 1 -> 81457
        chainIds[1] = 81457;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            bridgeTokenOut: 0x4300000000000000000000000000000000000003,
            pctFee: 500000000000000,
            flatFee: 120000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](3);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](3);

        // 10 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 800000000000000,
            flatFee: 150000000000000
        });
        // 10 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            bridgeTokenOut: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            pctFee: 400000000000000,
            flatFee: 87000000000000000
        });
        // 10 -> 81457
        chainIds[2] = 81457;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            bridgeTokenOut: 0x4300000000000000000000000000000000000003,
            pctFee: 900000000000000,
            flatFee: 270000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](3);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](3);

        // 137 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 800000000000000,
            flatFee: 150000000000000
        });
        // 137 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063,
            bridgeTokenOut: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            pctFee: 400000000000000,
            flatFee: 87000000000000000
        });
        // 137 -> 81457
        chainIds[2] = 81457;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063,
            bridgeTokenOut: 0x4300000000000000000000000000000000000003,
            pctFee: 900000000000000,
            flatFee: 270000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        chainIds = new uint256[](5);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](5);

        // 480 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2,
            pctFee: 3000000000000000,
            flatFee: 500000000000000
        });
        // 480 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 2000000000000000,
            flatFee: 300000000000000
        });
        // 480 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619,
            pctFee: 2000000000000000,
            flatFee: 300000000000000
        });
        // 480 -> 8453
        chainIds[3] = 8453;
        bridgeRoutes[3] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 2000000000000000,
            flatFee: 300000000000000
        });
        // 480 -> 42161
        chainIds[4] = 42161;
        bridgeRoutes[4] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
            pctFee: 2000000000000000,
            flatFee: 300000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](2);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](2);

        // 8453 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4200000000000000000000000000000000000006,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 800000000000000,
            flatFee: 150000000000000
        });
        // 8453 -> 81457
        chainIds[1] = 81457;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb,
            bridgeTokenOut: 0x4300000000000000000000000000000000000003,
            pctFee: 900000000000000,
            flatFee: 270000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](3);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](3);

        // 42161 -> 480
        chainIds[0] = 480;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x82aF49447D8a07e3bd95BD0d56f35241523fBab1,
            bridgeTokenOut: 0x4200000000000000000000000000000000000006,
            pctFee: 800000000000000,
            flatFee: 150000000000000
        });
        // 42161 -> 59144
        chainIds[1] = 59144;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            bridgeTokenOut: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            pctFee: 400000000000000,
            flatFee: 80000000000000000
        });
        // 42161 -> 81457
        chainIds[2] = 81457;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            bridgeTokenOut: 0x4300000000000000000000000000000000000003,
            pctFee: 900000000000000,
            flatFee: 270000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](4);

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
        // 59144 -> 42161
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            bridgeTokenOut: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            pctFee: 500000000000000,
            flatFee: 100000000000000000
        });
        // 59144 -> 81457
        chainIds[3] = 81457;
        bridgeRoutes[3] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            bridgeTokenOut: 0x4300000000000000000000000000000000000003,
            pctFee: 900000000000000,
            flatFee: 270000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 81457
    if (sourceChainId == 81457) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](6);

        // 81457 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4300000000000000000000000000000000000003,
            bridgeTokenOut: 0x6B175474E89094C44Da98b954EedeAC495271d0F,
            pctFee: 33400000000000000,
            flatFee: 6890000000000000000
        });
        // 81457 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4300000000000000000000000000000000000003,
            bridgeTokenOut: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            pctFee: 1400000000000000,
            flatFee: 490000000000000000
        });
        // 81457 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4300000000000000000000000000000000000003,
            bridgeTokenOut: 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063,
            pctFee: 1200000000000000,
            flatFee: 450000000000000000
        });
        // 81457 -> 8453
        chainIds[3] = 8453;
        bridgeRoutes[3] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4300000000000000000000000000000000000003,
            bridgeTokenOut: 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb,
            pctFee: 1600000000000000,
            flatFee: 530000000000000000
        });
        // 81457 -> 42161
        chainIds[4] = 42161;
        bridgeRoutes[4] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4300000000000000000000000000000000000003,
            bridgeTokenOut: 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1,
            pctFee: 1800000000000000,
            flatFee: 570000000000000000
        });
        // 81457 -> 59144
        chainIds[5] = 59144;
        bridgeRoutes[5] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: 0x4300000000000000000000000000000000000003,
            bridgeTokenOut: 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5,
            pctFee: 2600000000000000,
            flatFee: 740000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAcrossBridger.AcrossBridgeRoute[](0));
}
