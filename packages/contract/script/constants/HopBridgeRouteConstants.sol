// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayHopBridger.sol";
import "./Constants.s.sol";
import {
    DEPLOY_SALT_ACROSS_BRIDGER,
    DEPLOY_SALT_AXELAR_BRIDGER,
    DEPLOY_SALT_CCTP_V2_BRIDGER,
    DEPLOY_SALT_LEGACY_MESH_BRIDGER,
    DEPLOY_SALT_STARGATE_BRIDGER
} from "./DeploySalts.sol";

// @title HopBridgeRouteConstants
// @notice Auto-generated constants for Hop bridge routes

// Return hop chain config for the given source chain.
function getHopChain(
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
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_STARGATE_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 100
    if (sourceChainId == 100) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_STARGATE_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 143
    if (sourceChainId == 143) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 999
    if (sourceChainId == 999) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        hopChainId = 42161;
        hopCoinAddr = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_LEGACY_MESH_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getHopCoinDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_STARGATE_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }

    return (0, address(0), 0, 0);
}

// Return all Hop bridge routes for the given source chain as final coin specs.
function getHopBridgeRoutes(
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

        // 10 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(
                0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
            )
        });

        // 10 -> 100
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: getHopCoinDecimals(
                0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0
            )
        });

        // 10 -> 42220
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 10 -> 534352
        destChainIds[3] = 534352;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(
                0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        destChainIds = new uint256[](6);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](6);

        // 56 -> 10
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: getHopCoinDecimals(
                0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
            )
        });

        // 56 -> 143
        destChainIds[1] = 143;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: getHopCoinDecimals(
                0x754704Bc059F8C67012fEd69BC8A327a5aafb603
            )
        });

        // 56 -> 480
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getHopCoinDecimals(
                0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
            )
        });

        // 56 -> 999
        destChainIds[3] = 999;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: getHopCoinDecimals(
                0xb88339CB7199b77E23DB6E890353E22632Ba630f
            )
        });

        // 56 -> 42220
        destChainIds[4] = 42220;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 56 -> 59144
        destChainIds[5] = 59144;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: getHopCoinDecimals(
                0x176211869cA2b568f2A7D4EE941E073a821EE1ff
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 100
    if (sourceChainId == 100) {
        destChainIds = new uint256[](6);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](6);

        // 100 -> 10
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: getHopCoinDecimals(
                0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
            )
        });

        // 100 -> 143
        destChainIds[1] = 143;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: getHopCoinDecimals(
                0x754704Bc059F8C67012fEd69BC8A327a5aafb603
            )
        });

        // 100 -> 480
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getHopCoinDecimals(
                0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
            )
        });

        // 100 -> 999
        destChainIds[3] = 999;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: getHopCoinDecimals(
                0xb88339CB7199b77E23DB6E890353E22632Ba630f
            )
        });

        // 100 -> 42220
        destChainIds[4] = 42220;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 100 -> 59144
        destChainIds[5] = 59144;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: getHopCoinDecimals(
                0x176211869cA2b568f2A7D4EE941E073a821EE1ff
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        destChainIds = new uint256[](1);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](1);

        // 137 -> 42220
        destChainIds[0] = 42220;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 143
    if (sourceChainId == 143) {
        destChainIds = new uint256[](4);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](4);

        // 143 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(
                0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
            )
        });

        // 143 -> 100
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: getHopCoinDecimals(
                0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0
            )
        });

        // 143 -> 42220
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 143 -> 534352
        destChainIds[3] = 534352;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(
                0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        destChainIds = new uint256[](4);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](4);

        // 480 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(
                0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
            )
        });

        // 480 -> 100
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: getHopCoinDecimals(
                0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0
            )
        });

        // 480 -> 42220
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 480 -> 534352
        destChainIds[3] = 534352;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(
                0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 999
    if (sourceChainId == 999) {
        destChainIds = new uint256[](4);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](4);

        // 999 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(
                0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
            )
        });

        // 999 -> 100
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: getHopCoinDecimals(
                0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0
            )
        });

        // 999 -> 42220
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 999 -> 534352
        destChainIds[3] = 534352;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(
                0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        destChainIds = new uint256[](10);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](10);

        // 42220 -> 10
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: getHopCoinDecimals(
                0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
            )
        });

        // 42220 -> 56
        destChainIds[1] = 56;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(
                0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
            )
        });

        // 42220 -> 100
        destChainIds[2] = 100;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: getHopCoinDecimals(
                0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0
            )
        });

        // 42220 -> 137
        destChainIds[3] = 137;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 137,
            coinAddr: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            coinDecimals: getHopCoinDecimals(
                0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359
            )
        });

        // 42220 -> 143
        destChainIds[4] = 143;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: getHopCoinDecimals(
                0x754704Bc059F8C67012fEd69BC8A327a5aafb603
            )
        });

        // 42220 -> 480
        destChainIds[5] = 480;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getHopCoinDecimals(
                0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
            )
        });

        // 42220 -> 999
        destChainIds[6] = 999;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: getHopCoinDecimals(
                0xb88339CB7199b77E23DB6E890353E22632Ba630f
            )
        });

        // 42220 -> 8453
        destChainIds[7] = 8453;
        finalChainCoins[7] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 8453,
            coinAddr: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            coinDecimals: getHopCoinDecimals(
                0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
            )
        });

        // 42220 -> 59144
        destChainIds[8] = 59144;
        finalChainCoins[8] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: getHopCoinDecimals(
                0x176211869cA2b568f2A7D4EE941E073a821EE1ff
            )
        });

        // 42220 -> 534352
        destChainIds[9] = 534352;
        finalChainCoins[9] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(
                0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        destChainIds = new uint256[](4);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](4);

        // 59144 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(
                0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d
            )
        });

        // 59144 -> 100
        destChainIds[1] = 100;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 100,
            coinAddr: 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0,
            coinDecimals: getHopCoinDecimals(
                0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0
            )
        });

        // 59144 -> 42220
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 59144 -> 534352
        destChainIds[3] = 534352;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(
                0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4
            )
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        destChainIds = new uint256[](6);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](6);

        // 534352 -> 10
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: getHopCoinDecimals(
                0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85
            )
        });

        // 534352 -> 143
        destChainIds[1] = 143;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 143,
            coinAddr: 0x754704Bc059F8C67012fEd69BC8A327a5aafb603,
            coinDecimals: getHopCoinDecimals(
                0x754704Bc059F8C67012fEd69BC8A327a5aafb603
            )
        });

        // 534352 -> 480
        destChainIds[2] = 480;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getHopCoinDecimals(
                0x79A02482A880bCE3F13e09Da970dC34db4CD24d1
            )
        });

        // 534352 -> 999
        destChainIds[3] = 999;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 999,
            coinAddr: 0xb88339CB7199b77E23DB6E890353E22632Ba630f,
            coinDecimals: getHopCoinDecimals(
                0xb88339CB7199b77E23DB6E890353E22632Ba630f
            )
        });

        // 534352 -> 42220
        destChainIds[4] = 42220;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(
                0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
            )
        });

        // 534352 -> 59144
        destChainIds[5] = 59144;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: getHopCoinDecimals(
                0x176211869cA2b568f2A7D4EE941E073a821EE1ff
            )
        });

        return (destChainIds, finalChainCoins);
    }

    return (new uint256[](0), new DaimoPayHopBridger.FinalChainCoin[](0));
}
