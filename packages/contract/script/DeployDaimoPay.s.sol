// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DaimoPay.sol";
import "./constants/Constants.s.sol";
import {
    DEPLOY_SALT_DAIMO_PAY,
    DEPLOY_SALT_PAY_INTENT_FACTORY
} from "./constants/DeploySalts.sol";

contract DeployDaimoPay is Script {
    function run() public {
        vm.startBroadcast();

        address intentFactory = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_PAY_INTENT_FACTORY
        );
        console.log("using intent factory at", intentFactory);

        address daimoPay = CREATE3.deploy(
            DEPLOY_SALT_DAIMO_PAY,
            abi.encodePacked(
                type(DaimoPay).creationCode,
                abi.encode(intentFactory)
            )
        );

        vm.stopBroadcast();

        console.log("daimo pay deployed at address:", daimoPay);
    }

    // Exclude from forge coverage
    function test() public {}
}
