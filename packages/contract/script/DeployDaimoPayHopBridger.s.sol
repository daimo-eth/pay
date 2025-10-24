// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/DaimoPayHopBridger.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "./DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "./DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "./DeployDaimoPayCCTPV2Bridger.s.sol";
import {getHopChain, getHopBridgeRoutes} from "./constants/HopBridgeRouteConstants.sol";

bytes32 constant DEPLOY_SALT_HOP_BRIDGER = keccak256(
    "DaimoPayHopBridger-deploy5"
);

contract DeployDaimoPayHopBridger is Script {
    function run() public {
        // Discover hop configuration and final coin specs via codegen tables
        (
            uint256 hopChainId,
            address hopCoinAddr,
            uint256 hopCoinDecimals,
            bytes32 hopBridgerSalt
        ) = getHopChain(block.chainid);
        // No hops from this chain = don't deploy HopChainBridger.
        if (hopChainId == 0) return;

        address firstHopBridger = CREATE3.getDeployed(
            msg.sender,
            hopBridgerSalt
        );

        // Retrieve final chain coin specs
        (
            uint256[] memory finalChains,
            DaimoPayHopBridger.FinalChainCoin[] memory finalChainCoins
        ) = getHopBridgeRoutes(block.chainid);
        require(
            finalChains.length == finalChainCoins.length,
            "DPHB: length mismatch"
        );

        vm.startBroadcast();
        address deployedHopBridger = CREATE3.deploy(
            DEPLOY_SALT_HOP_BRIDGER,
            abi.encodePacked(
                type(DaimoPayHopBridger).creationCode,
                abi.encode(
                    hopChainId,
                    hopCoinAddr,
                    hopCoinDecimals,
                    firstHopBridger,
                    finalChainCoins
                )
            )
        );
        vm.stopBroadcast();

        console.log("hop bridger deployed:", deployedHopBridger);
    }

    // Exclude from forge coverage
    function test() public {}
}
