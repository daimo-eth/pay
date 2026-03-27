// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../../src/DaimoPayUSDT0Bridger.sol";
import {
    getDAUSDT0BridgeRoutes
} from "./constants/DAUSDT0BridgeRouteConstants.sol";
import "../Constants.s.sol";
import {DEPLOY_SALT_USDT0_BRIDGER} from "../DeploySalts.sol";

contract DeployDaimoPayUSDT0Bridger is Script {
    function run() public {
        (
            uint256[] memory chainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
        ) = getDAUSDT0BridgeRoutes(block.chainid);

        // Log route details
        for (uint256 i = 0; i < bridgeRoutes.length; ++i) {
            console.log("Chain ID:", chainIds[i]);
            console.log("Dst EID:", bridgeRoutes[i].dstEid);
            console.log("App:", bridgeRoutes[i].app);
            console.log("Bridge token in:", bridgeRoutes[i].bridgeTokenIn);
            console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
            console.log("--------------------------------");
        }

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_USDT0_BRIDGER,
            abi.encodePacked(
                type(DaimoPayUSDT0Bridger).creationCode,
                abi.encode(chainIds, bridgeRoutes)
            )
        );
        console.log(
            "USDT0 bridger deployed at address:",
            address(bridger)
        );

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
