// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayHopBridger.sol";
import "./Constants.s.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "../DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "../DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "../DeployDaimoPayCCTPV2Bridger.s.sol";

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

    // Source chain 56
    if (sourceChainId == 56) {
        hopChainId = 42161;
        hopCoinAddr = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
        hopCoinDecimals = getUSDCDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_AXELAR_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }


    // Source chain 480
    if (sourceChainId == 480) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getUSDCDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }


    // Source chain 42220
    if (sourceChainId == 42220) {
        hopChainId = 42161;
        hopCoinAddr = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
        hopCoinDecimals = getUSDCDecimals(hopCoinAddr);
        hopBridgerSalt = DEPLOY_SALT_AXELAR_BRIDGER;
        return (hopChainId, hopCoinAddr, hopCoinDecimals, hopBridgerSalt);
    }


    // Source chain 534352
    if (sourceChainId == 534352) {
        hopChainId = 42161;
        hopCoinAddr = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
        hopCoinDecimals = getUSDCDecimals(hopCoinAddr);
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
    // Source chain 56
    if (sourceChainId == 56) {
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);


        // 56 -> 480
        destChainIds[0] = 480;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getUSDCDecimals(0x79A02482A880bCE3F13e09Da970dC34db4CD24d1)
        });

        // 56 -> 534352
        destChainIds[1] = 534352;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getUSDCDecimals(0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4)
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
            coinAddr: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            coinDecimals: getUSDCDecimals(0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3)
        });

        // 480 -> 42220
        destChainIds[1] = 42220;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            coinDecimals: getUSDCDecimals(0xEB466342C4d449BC9f53A865D5Cb90586f405215)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);


        // 42220 -> 480
        destChainIds[0] = 480;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 480,
            coinAddr: 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1,
            coinDecimals: getUSDCDecimals(0x79A02482A880bCE3F13e09Da970dC34db4CD24d1)
        });

        // 42220 -> 534352
        destChainIds[1] = 534352;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 534352,
            coinAddr: 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4,
            coinDecimals: getUSDCDecimals(0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4)
        });

        return (destChainIds, finalChainCoins);
    }

    // Source chain 534352
    if (sourceChainId == 534352) {
        destChainIds = new uint256[](2);
        finalChainCoins = new DaimoPayHopBridger.FinalChainCoin[](2);


        // 534352 -> 56
        destChainIds[0] = 56;
        finalChainCoins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 56,
            coinAddr: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            coinDecimals: getUSDCDecimals(0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3)
        });

        // 534352 -> 42220
        destChainIds[1] = 42220;
        finalChainCoins[1] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: 42220,
            coinAddr: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            coinDecimals: getUSDCDecimals(0xEB466342C4d449BC9f53A865D5Cb90586f405215)
        });

        return (destChainIds, finalChainCoins);
    }

    return (new uint256[](0), new DaimoPayHopBridger.FinalChainCoin[](0));
}
