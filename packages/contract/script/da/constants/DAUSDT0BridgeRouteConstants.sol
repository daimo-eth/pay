// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../../src/DaimoPayLayerZeroBridger.sol";

// @title DAUSDT0BridgeRouteConstants
// @notice Auto-generated DA constants for USDT0 bridge routes

// Return all DA USDT0 bridge routes for the given source chain.
function getDAUSDT0BridgeRoutes(
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
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 1 -> 10 USDT
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 137 USDT
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 143 USDT
        chainIds[2] = 143;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30390,
            app: 0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 999 USDT
        chainIds[3] = 999;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30367,
            app: 0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 4217 USDT
        chainIds[4] = 4217;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 42161 USDT
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x6C96dE32CEa08842dcc4058c14d3aaAD7Fa41dee,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 10 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD,
            bridgeTokenIn: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 137 USDT
        chainIds[1] = 137;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD,
            bridgeTokenIn: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 143 USDT
        chainIds[2] = 143;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30390,
            app: 0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD,
            bridgeTokenIn: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOut: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 999 USDT
        chainIds[3] = 999;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30367,
            app: 0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD,
            bridgeTokenIn: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOut: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 4217 USDT
        chainIds[4] = 4217;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD,
            bridgeTokenIn: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOut: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 42161 USDT
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0xF03b4d9AC1D5d1E7c4cEf54C2A313b9fe051A0aD,
            bridgeTokenIn: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 137 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 143 USDT
        chainIds[2] = 143;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30390,
            app: 0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 999 USDT
        chainIds[3] = 999;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30367,
            app: 0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 4217 USDT
        chainIds[4] = 4217;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 42161 USDT
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x6BA10300f0DC58B7a1e4c0e41f5daBb7D7829e13,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 143
    if (sourceChainId == 143) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 143 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x9151434b16b9763660705744891fA906F660EcC5,
            bridgeTokenIn: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 143 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x9151434b16b9763660705744891fA906F660EcC5,
            bridgeTokenIn: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOut: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOutDecimals: 6
        });
        // 143 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x9151434b16b9763660705744891fA906F660EcC5,
            bridgeTokenIn: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 143 -> 999 USDT
        chainIds[3] = 999;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30367,
            app: 0x9151434b16b9763660705744891fA906F660EcC5,
            bridgeTokenIn: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOut: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOutDecimals: 6
        });
        // 143 -> 4217 USDT
        chainIds[4] = 4217;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x9151434b16b9763660705744891fA906F660EcC5,
            bridgeTokenIn: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOut: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOutDecimals: 6
        });
        // 143 -> 42161 USDT
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x9151434b16b9763660705744891fA906F660EcC5,
            bridgeTokenIn: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 999
    if (sourceChainId == 999) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 999 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x904861a24F30EC96ea7CFC3bE9EA4B476d237e98,
            bridgeTokenIn: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 999 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x904861a24F30EC96ea7CFC3bE9EA4B476d237e98,
            bridgeTokenIn: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOut: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOutDecimals: 6
        });
        // 999 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x904861a24F30EC96ea7CFC3bE9EA4B476d237e98,
            bridgeTokenIn: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 999 -> 143 USDT
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30390,
            app: 0x904861a24F30EC96ea7CFC3bE9EA4B476d237e98,
            bridgeTokenIn: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOut: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOutDecimals: 6
        });
        // 999 -> 4217 USDT
        chainIds[4] = 4217;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x904861a24F30EC96ea7CFC3bE9EA4B476d237e98,
            bridgeTokenIn: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOut: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOutDecimals: 6
        });
        // 999 -> 42161 USDT
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x904861a24F30EC96ea7CFC3bE9EA4B476d237e98,
            bridgeTokenIn: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 4217
    if (sourceChainId == 4217) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 4217 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff,
            bridgeTokenIn: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff,
            bridgeTokenIn: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOut: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff,
            bridgeTokenIn: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 143 USDT
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30390,
            app: 0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff,
            bridgeTokenIn: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOut: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 999 USDT
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30367,
            app: 0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff,
            bridgeTokenIn: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOut: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 42161 USDT
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0xaf37E8B6C9ED7f6318979f56Fc287d76c30847ff,
            bridgeTokenIn: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](6);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](6);

        // 42161 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0x01bFF41798a0BcF287b996046Ca68b395DbC1071,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 143 USDT
        chainIds[3] = 143;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30390,
            app: 0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0xe7cd86e13AC4309349F30B3435a9d337750fC82D,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 999 USDT
        chainIds[4] = 999;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30367,
            app: 0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 4217 USDT
        chainIds[5] = 4217;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x14E4A1B13bf7F943c8ff7C51fb60FA964A298D92,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0x20C00000000000000000000014f22CA97301EB73,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}
