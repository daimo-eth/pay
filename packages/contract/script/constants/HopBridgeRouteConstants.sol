// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayHopBridger.sol";
import "./Constants.s.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "../DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "../DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "../DeployDaimoPayCCTPV2Bridger.s.sol";
import {DEPLOY_SALT_LEGACY_MESH_BRIDGER} from "../DeployDaimoPayLegacyMeshBridger.s.sol";
import {DEPLOY_SALT_STARGATE_BRIDGER} from "../DeployDaimoPayStargateBridger.s.sol";

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


    // Source chain 137
    if (sourceChainId == 137) {
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
        hopBridgerSalt = DEPLOY_SALT_ACROSS_BRIDGER;
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
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);


        // 10 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
        });

        // 10 -> 42220
        destChainIds[1] = 42220;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        destChainIds = new uint256[](4);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](4);


        // 56 -> 10
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: getHopCoinDecimals(0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85)
        });

        // 56 -> 480
        destChainIds[1] = 480;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getHopCoinDecimals(0x79A02482A880bCE3F13e09Da970dC34db4CD24d1)
        });

        // 56 -> 42220
        destChainIds[2] = 42220;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        });

        // 56 -> 59144
        destChainIds[3] = 59144;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: getHopCoinDecimals(0x176211869cA2b568f2A7D4EE941E073a821EE1ff)
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
            coinDecimals: getHopCoinDecimals(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 480
    if (sourceChainId == 480) {
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);


        // 480 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
        });

        // 480 -> 42220
        destChainIds[1] = 42220;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        destChainIds = new uint256[](7);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](7);


        // 42220 -> 10
        destChainIds[0] = 10;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 10,
            coinAddr: 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85,
            coinDecimals: getHopCoinDecimals(0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85)
        });

        // 42220 -> 56
        destChainIds[1] = 56;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
        });

        // 42220 -> 137
        destChainIds[2] = 137;
        finalChainCoins[2] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 137,
            coinAddr: 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359,
            coinDecimals: getHopCoinDecimals(0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359)
        });

        // 42220 -> 480
        destChainIds[3] = 480;
        finalChainCoins[3] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getHopCoinDecimals(0x79A02482A880bCE3F13e09Da970dC34db4CD24d1)
        });

        // 42220 -> 8453
        destChainIds[4] = 8453;
        finalChainCoins[4] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 8453,
            coinAddr: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913,
            coinDecimals: getHopCoinDecimals(0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
        });

        // 42220 -> 59144
        destChainIds[5] = 59144;
        finalChainCoins[5] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 59144,
            coinAddr: 0x176211869cA2b568f2A7D4EE941E073a821EE1ff,
            coinDecimals: getHopCoinDecimals(0x176211869cA2b568f2A7D4EE941E073a821EE1ff)
        });

        // 42220 -> 534352
        destChainIds[6] = 534352;
        finalChainCoins[6] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getHopCoinDecimals(0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);


        // 59144 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d,
            coinDecimals: getHopCoinDecimals(0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d)
        });

        // 59144 -> 42220
        destChainIds[1] = 42220;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        destChainIds = new uint256[](1);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](1);


        // 534352 -> 42220
        destChainIds[0] = 42220;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e,
            coinDecimals: getHopCoinDecimals(0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e)
        });

        return (destChainIds, finalChainCoins);
    }

    return (new uint256[](0), new DaimoPayHopBridger.FinalChainCoin[](0));
}
