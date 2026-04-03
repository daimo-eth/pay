// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../../src/DaimoPayHopBridger.sol";
import {
    DEPLOY_SALT_CCTP_V2_BRIDGER,
    DEPLOY_SALT_LEGACY_MESH_BRIDGER,
    DEPLOY_SALT_STARGATE_USDC_BRIDGER,
    DEPLOY_SALT_STARGATE_USDT_BRIDGER,
    DEPLOY_SALT_USDT0_BRIDGER
} from "../../DeploySalts.sol";

// @title DAHopBridgeRouteConstants
// @notice Auto-generated DA constants for Hop bridge routes

// Return DA hop chain config for the given source chain.
function getDAHopChain(
    uint256 sourceChainId
)
    pure
    returns (
        uint256 hopChainId,
        address hopCoinAddr,
        uint256 hopCoinDecimals,
        bytes32 hopBridgerSalt
    )
{

    // Source chain 10
    if (sourceChainId == 10) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_STARGATE_USDC_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 100
    if (sourceChainId == 100) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_STARGATE_USDC_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 143
    if (sourceChainId == 143) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 999
    if (sourceChainId == 999) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 4217
    if (sourceChainId == 4217) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_STARGATE_USDC_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 4326
    if (sourceChainId == 4326) {
        hopChainId = 42161;
        hopCoinAddr = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_USDT0_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        hopChainId = 42161;
        hopCoinAddr = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_LEGACY_MESH_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = 6;
        hopBridgerSalt = DEPLOY_SALT_STARGATE_USDC_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    return (0, address(0), 0, 0);
}

// Return all DA Hop bridge routes for the given source chain as final coin specs.
function getDAHopBridgeRoutes(
    uint256 sourceChainId
)
    pure
    returns (
        uint256[] memory destChainIds,
        DaimoPayHopBridger.FinalChainCoin[] memory finalChainCoins
    )
{
    // Source chain 10
    if (sourceChainId == 10) {
        destChainIds = new uint256[](4);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](4);

        // 10 -> 56 USDC
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 10 -> 100 USDC
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 10 -> 42220 USDT
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 10 -> 534352 USDC
        destChainIds[3] = 534352;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        destChainIds = new uint256[](7);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](7);

        // 56 -> 10 USDC
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: 6
        });

        // 56 -> 143 USDC
        destChainIds[1] = 143;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: 6
        });

        // 56 -> 480 USDC
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: 6
        });

        // 56 -> 999 USDC
        destChainIds[3] = 999;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: 6
        });

        // 56 -> 4326 USDT
        destChainIds[4] = 4326;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 56 -> 42220 USDT
        destChainIds[5] = 42220;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 56 -> 59144 USDC
        destChainIds[6] = 59144;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 100
    if (sourceChainId == 100) {
        destChainIds = new uint256[](7);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](7);

        // 100 -> 10 USDC
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: 6
        });

        // 100 -> 143 USDC
        destChainIds[1] = 143;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: 6
        });

        // 100 -> 480 USDC
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: 6
        });

        // 100 -> 999 USDC
        destChainIds[3] = 999;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: 6
        });

        // 100 -> 4326 USDT
        destChainIds[4] = 4326;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 100 -> 42220 USDT
        destChainIds[5] = 42220;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 100 -> 59144 USDC
        destChainIds[6] = 59144;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        destChainIds = new uint256[](1);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](1);

        // 137 -> 42220 USDT
        destChainIds[0] = 42220;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 143
    if (sourceChainId == 143) {
        destChainIds = new uint256[](5);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](5);

        // 143 -> 56 USDC
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 143 -> 100 USDC
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 143 -> 4217 USDC
        destChainIds[2] = 4217;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4217,
            coinAddr: 0x20C000000000000000000000b9537d11c60E8b50,
            coinDecimals: 6
        });

        // 143 -> 42220 USDT
        destChainIds[3] = 42220;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 143 -> 534352 USDC
        destChainIds[4] = 534352;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        destChainIds = new uint256[](6);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](6);

        // 480 -> 56 USDC
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 480 -> 100 USDC
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 480 -> 4217 USDC
        destChainIds[2] = 4217;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4217,
            coinAddr: 0x20C000000000000000000000b9537d11c60E8b50,
            coinDecimals: 6
        });

        // 480 -> 4326 USDT
        destChainIds[3] = 4326;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 480 -> 42220 USDT
        destChainIds[4] = 42220;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 480 -> 534352 USDC
        destChainIds[5] = 534352;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 999
    if (sourceChainId == 999) {
        destChainIds = new uint256[](5);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](5);

        // 999 -> 56 USDC
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 999 -> 100 USDC
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 999 -> 4217 USDC
        destChainIds[2] = 4217;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4217,
            coinAddr: 0x20C000000000000000000000b9537d11c60E8b50,
            coinDecimals: 6
        });

        // 999 -> 42220 USDT
        destChainIds[3] = 42220;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 999 -> 534352 USDC
        destChainIds[4] = 534352;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 4217
    if (sourceChainId == 4217) {
        destChainIds = new uint256[](6);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](6);

        // 4217 -> 143 USDC
        destChainIds[0] = 143;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: 6
        });

        // 4217 -> 480 USDC
        destChainIds[1] = 480;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: 6
        });

        // 4217 -> 999 USDC
        destChainIds[2] = 999;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: 6
        });

        // 4217 -> 4326 USDT
        destChainIds[3] = 4326;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 4217 -> 42220 USDT
        destChainIds[4] = 42220;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 4217 -> 59144 USDC
        destChainIds[5] = 59144;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 4326
    if (sourceChainId == 4326) {
        destChainIds = new uint256[](8);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](8);

        // 4326 -> 56 USDC
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 4326 -> 100 USDC
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 4326 -> 480 USDC
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: 6
        });

        // 4326 -> 4217 USDC
        destChainIds[3] = 4217;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4217,
            coinAddr: 0x20C000000000000000000000b9537d11c60E8b50,
            coinDecimals: 6
        });

        // 4326 -> 8453 USDC
        destChainIds[4] = 8453;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 8453,
            coinAddr: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            coinDecimals: 6
        });

        // 4326 -> 42220 USDT
        destChainIds[5] = 42220;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 4326 -> 59144 USDC
        destChainIds[6] = 59144;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: 6
        });

        // 4326 -> 534352 USDC
        destChainIds[7] = 534352;
        finalChainCoins[7] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);

        // 8453 -> 4326 USDT
        destChainIds[0] = 4326;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 8453 -> 42220 USDT
        destChainIds[1] = 42220;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        destChainIds = new uint256[](12);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](12);

        // 42220 -> 10 USDC
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: 6
        });

        // 42220 -> 56 USDC
        destChainIds[1] = 56;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 42220 -> 100 USDC
        destChainIds[2] = 100;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 42220 -> 137 USDC
        destChainIds[3] = 137;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 137,
            coinAddr: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            coinDecimals: 6
        });

        // 42220 -> 143 USDC
        destChainIds[4] = 143;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: 6
        });

        // 42220 -> 480 USDC
        destChainIds[5] = 480;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: 6
        });

        // 42220 -> 999 USDC
        destChainIds[6] = 999;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: 6
        });

        // 42220 -> 4217 USDC
        destChainIds[7] = 4217;
        finalChainCoins[7] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4217,
            coinAddr: 0x20C000000000000000000000b9537d11c60E8b50,
            coinDecimals: 6
        });

        // 42220 -> 4326 USDT
        destChainIds[8] = 4326;
        finalChainCoins[8] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 42220 -> 8453 USDC
        destChainIds[9] = 8453;
        finalChainCoins[9] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 8453,
            coinAddr: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            coinDecimals: 6
        });

        // 42220 -> 59144 USDC
        destChainIds[10] = 59144;
        finalChainCoins[10] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: 6
        });

        // 42220 -> 534352 USDC
        destChainIds[11] = 534352;
        finalChainCoins[11] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        destChainIds = new uint256[](6);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](6);

        // 59144 -> 56 USDC
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: 18
        });

        // 59144 -> 100 USDC
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: 6
        });

        // 59144 -> 4217 USDC
        destChainIds[2] = 4217;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4217,
            coinAddr: 0x20C000000000000000000000b9537d11c60E8b50,
            coinDecimals: 6
        });

        // 59144 -> 4326 USDT
        destChainIds[3] = 4326;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 59144 -> 42220 USDT
        destChainIds[4] = 42220;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 59144 -> 534352 USDC
        destChainIds[5] = 534352;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        destChainIds = new uint256[](7);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](7);

        // 534352 -> 10 USDC
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: 6
        });

        // 534352 -> 143 USDC
        destChainIds[1] = 143;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: 6
        });

        // 534352 -> 480 USDC
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: 6
        });

        // 534352 -> 999 USDC
        destChainIds[3] = 999;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: 6
        });

        // 534352 -> 4326 USDT
        destChainIds[4] = 4326;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 4326,
            coinAddr: 0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb,
            coinDecimals: 6
        });

        // 534352 -> 42220 USDT
        destChainIds[5] = 42220;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: 6
        });

        // 534352 -> 59144 USDC
        destChainIds[6] = 59144;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: 6
        });

        return (destChainIds, finalChainCoins);
    }

    return (new uint256[](0), new DaimoPayHopBridger.FinalChainCoin[](0));
}
