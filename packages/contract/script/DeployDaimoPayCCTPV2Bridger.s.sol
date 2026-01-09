// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayCCTPV2Bridger.sol";
import "./constants/CCTPV2BridgeRouteConstants.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "./constants/DeploySalts.sol";

contract DeployDaimoPayCCTPV2Bridger is Script {
    function run() public {
        address tokenMinterV2 = _getTokenMinterV2Address(block.chainid);
        address tokenMessengerV2 = _getTokenMessengerV2Address(block.chainid);
        console.log("tokenMinterV2:", tokenMinterV2);
        console.log("tokenMessengerV2:", tokenMessengerV2);

        (
            uint256[] memory chainIds,
            DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory bridgeRoutes
        ) = getCCTPV2BridgeRoutes(block.chainid);

        if (chainIds.length == 0) {
            revert("No CCTP V2 bridge routes found");
        }

        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("Chain ID:", chainIds[i]);
            console.log("Domain:", bridgeRoutes[i].domain);
            console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
            console.log("--------------------------------");
        }

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_CCTP_V2_BRIDGER,
            abi.encodePacked(
                type(DaimoPayCCTPV2Bridger).creationCode,
                abi.encode(
                    ITokenMinterV2(tokenMinterV2),
                    ICCTPTokenMessengerV2(tokenMessengerV2),
                    chainIds,
                    bridgeRoutes
                )
            )
        );
        console.log("CCTPv2 bridger deployed at address:", address(bridger));

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
