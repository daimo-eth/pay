// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayCCTPBridger.sol";
import "./constants/CCTPBridgeRouteConstants.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_CCTP_BRIDGER} from "./constants/DeploySalts.sol";

contract DeployDaimoPayCCTPBridger is Script {
    function run() public {
        address tokenMinter = _getTokenMinterAddress(block.chainid);
        address tokenMessenger = _getTokenMessengerAddress(block.chainid);
        console.log("tokenMinter:", tokenMinter);
        console.log("tokenMessenger:", tokenMessenger);

        (
            uint256[] memory chainIds,
            DaimoPayCCTPBridger.CCTPBridgeRoute[] memory bridgeRoutes
        ) = getCCTPBridgeRoutes(block.chainid);

        if (chainIds.length == 0) {
            revert("No CCTP bridge routes found");
        }

        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("Chain ID:", chainIds[i]);
            console.log("Domain:", bridgeRoutes[i].domain);
            console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
            console.log("--------------------------------");
        }

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_CCTP_BRIDGER,
            abi.encodePacked(
                type(DaimoPayCCTPBridger).creationCode,
                abi.encode(
                    ITokenMinter(tokenMinter),
                    ICCTPTokenMessenger(tokenMessenger),
                    chainIds,
                    bridgeRoutes
                )
            )
        );
        console.log("CCTPv1 bridger deployed at address:", address(bridger));

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
