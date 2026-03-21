// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../../src/DaimoPayLayerZeroBridger.sol";

// @title DAStargateBridgeRouteConstants
// @notice Auto-generated DA constants for Stargate bridge routes (USDC + USDT)

// Return all DA Stargate USDC bridge routes for the given source chain.
function getDAStargateUSDCBridgeRoutes(
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
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 1 -> 56 USDC
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xc026395860Db2d07ee33e05fE50ed7bD583189C7,
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 1 -> 100 USDC
        chainIds[1] = 100;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0xc026395860Db2d07ee33e05fE50ed7bD583189C7,
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 4217 USDC
        chainIds[2] = 4217;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0xc026395860Db2d07ee33e05fE50ed7bD583189C7,
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 534352 USDC
        chainIds[3] = 534352;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0xc026395860Db2d07ee33e05fE50ed7bD583189C7,
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);

        // 10 -> 4217 USDC
        chainIds[0] = 4217;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0,
            bridgeTokenIn: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        chainIds = new uint256[](7);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](7);

        // 56 -> 1 USDC
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 100 USDC
        chainIds[1] = 100;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 137 USDC
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 4217 USDC
        chainIds[3] = 4217;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 8453 USDC
        chainIds[4] = 8453;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30184,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 42161 USDC
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 534352 USDC
        chainIds[6] = 534352;
        bridgeRoutes[6] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0x962Bd449E630b0d928f308Ce63f1A21F02576057,
            bridgeTokenIn: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 100
    if (sourceChainId == 100) {
        chainIds = new uint256[](7);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](7);

        // 100 -> 1 USDC
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOutDecimals: 6
        });
        // 100 -> 56 USDC
        chainIds[1] = 56;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 100 -> 137 USDC
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOutDecimals: 6
        });
        // 100 -> 4217 USDC
        chainIds[3] = 4217;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 100 -> 8453 USDC
        chainIds[4] = 8453;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30184,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOutDecimals: 6
        });
        // 100 -> 42161 USDC
        chainIds[5] = 42161;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOutDecimals: 6
        });
        // 100 -> 534352 USDC
        chainIds[6] = 534352;
        bridgeRoutes[6] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0xB1EeAD6959cb5bB9B20417d6689922523B2B86C3,
            bridgeTokenIn: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 137 -> 56 USDC
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4,
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 137 -> 100 USDC
        chainIds[1] = 100;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4,
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 4217 USDC
        chainIds[2] = 4217;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4,
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 534352 USDC
        chainIds[3] = 534352;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0x9Aa02D4Fae7F58b8E8f34c66E756cC734DAc7fe4,
            bridgeTokenIn: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 4217
    if (sourceChainId == 4217) {
        chainIds = new uint256[](8);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](8);

        // 4217 -> 1 USDC
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 10 USDC
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 56 USDC
        chainIds[2] = 56;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 4217 -> 100 USDC
        chainIds[3] = 100;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 137 USDC
        chainIds[4] = 137;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 8453 USDC
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30184,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 42161 USDC
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOutDecimals: 6
        });
        // 4217 -> 534352 USDC
        chainIds[7] = 534352;
        bridgeRoutes[7] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0x8c76e2F6C5ceDA9AA7772e7efF30280226c44392,
            bridgeTokenIn: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 8453 -> 56 USDC
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x27a16dc786820B16E5c9028b75B99F6f604b5d26,
            bridgeTokenIn: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 8453 -> 100 USDC
        chainIds[1] = 100;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0x27a16dc786820B16E5c9028b75B99F6f604b5d26,
            bridgeTokenIn: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 8453 -> 4217 USDC
        chainIds[2] = 4217;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x27a16dc786820B16E5c9028b75B99F6f604b5d26,
            bridgeTokenIn: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 8453 -> 534352 USDC
        chainIds[3] = 534352;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0x27a16dc786820B16E5c9028b75B99F6f604b5d26,
            bridgeTokenIn: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 42161 -> 56 USDC
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xe8CDF27AcD73a434D661C84887215F7598e7d0d3,
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 42161 -> 100 USDC
        chainIds[1] = 100;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0xe8CDF27AcD73a434D661C84887215F7598e7d0d3,
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 4217 USDC
        chainIds[2] = 4217;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0xe8CDF27AcD73a434D661C84887215F7598e7d0d3,
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 534352 USDC
        chainIds[3] = 534352;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30214,
            app: 0xe8CDF27AcD73a434D661C84887215F7598e7d0d3,
            bridgeTokenIn: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOut: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        chainIds = new uint256[](7);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](7);

        // 534352 -> 1 USDC
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOutDecimals: 6
        });
        // 534352 -> 56 USDC
        chainIds[1] = 56;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            bridgeTokenOutDecimals: 18
        });
        // 534352 -> 100 USDC
        chainIds[2] = 100;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30145,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            bridgeTokenOutDecimals: 6
        });
        // 534352 -> 137 USDC
        chainIds[3] = 137;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            bridgeTokenOutDecimals: 6
        });
        // 534352 -> 4217 USDC
        chainIds[4] = 4217;
        bridgeRoutes[4] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30410,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x20C000000000000000000000b9537d11c60E8b50,
            bridgeTokenOutDecimals: 6
        });
        // 534352 -> 8453 USDC
        chainIds[5] = 8453;
        bridgeRoutes[5] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30184,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            bridgeTokenOutDecimals: 6
        });
        // 534352 -> 42161 USDC
        chainIds[6] = 42161;
        bridgeRoutes[6] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x3Fc69CC4A842838bCDC9499178740226062b14E4,
            bridgeTokenIn: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            bridgeTokenOut: 0xaf88d065e77c8cC2239327C5EDb3A432268e5831,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}

// Return all DA Stargate USDT bridge routes for the given source chain.
function getDAStargateUSDTBridgeRoutes(
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
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 1 -> 10 USDT
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x933597a323Eb81cAe705C5bC29985172fd5A3973,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 56 USDT
        chainIds[1] = 56;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x933597a323Eb81cAe705C5bC29985172fd5A3973,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOutDecimals: 18
        });
        // 1 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x933597a323Eb81cAe705C5bC29985172fd5A3973,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 1 -> 42161 USDT
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x933597a323Eb81cAe705C5bC29985172fd5A3973,
            bridgeTokenIn: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 10 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x19cFCE47eD54a88614648DC3f19A5980097007dD,
            bridgeTokenIn: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 56 USDT
        chainIds[1] = 56;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0x19cFCE47eD54a88614648DC3f19A5980097007dD,
            bridgeTokenIn: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOut: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOutDecimals: 18
        });
        // 10 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x19cFCE47eD54a88614648DC3f19A5980097007dD,
            bridgeTokenIn: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 10 -> 42161 USDT
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x19cFCE47eD54a88614648DC3f19A5980097007dD,
            bridgeTokenIn: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 56 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0x138EB30f73BC423c6455C53df6D89CB01d9eBc63,
            bridgeTokenIn: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0x138EB30f73BC423c6455C53df6D89CB01d9eBc63,
            bridgeTokenIn: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOut: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 137 USDT
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0x138EB30f73BC423c6455C53df6D89CB01d9eBc63,
            bridgeTokenIn: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });
        // 56 -> 42161 USDT
        chainIds[3] = 42161;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0x138EB30f73BC423c6455C53df6D89CB01d9eBc63,
            bridgeTokenIn: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](3);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](3);

        // 137 -> 10 USDT
        chainIds[0] = 10;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0xd47b03ee6d86Cf251ee7860FB2ACf9f91B9fD4d7,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOutDecimals: 6
        });
        // 137 -> 56 USDT
        chainIds[1] = 56;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xd47b03ee6d86Cf251ee7860FB2ACf9f91B9fD4d7,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOutDecimals: 18
        });
        // 137 -> 42161 USDT
        chainIds[2] = 42161;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30110,
            app: 0xd47b03ee6d86Cf251ee7860FB2ACf9f91B9fD4d7,
            bridgeTokenIn: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOut: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](4);
        bridgeRoutes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](4);

        // 42161 -> 1 USDT
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30101,
            app: 0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0xdAC17F958D2ee523a2206206994597C13D831ec7,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 10 USDT
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111,
            app: 0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58,
            bridgeTokenOutDecimals: 6
        });
        // 42161 -> 56 USDT
        chainIds[2] = 56;
        bridgeRoutes[2] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30102,
            app: 0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0x55d398326f99059fF775485246999027B3197955,
            bridgeTokenOutDecimals: 18
        });
        // 42161 -> 137 USDT
        chainIds[3] = 137;
        bridgeRoutes[3] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30109,
            app: 0xcE8CcA271Ebc0533920C83d39F417ED6A0abB7D0,
            bridgeTokenIn: 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9,
            bridgeTokenOut: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F,
            bridgeTokenOutDecimals: 6
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayLayerZeroBridger.LZBridgeRoute[](0));
}
