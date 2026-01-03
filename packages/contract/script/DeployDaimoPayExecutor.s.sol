// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DaimoPayExecutor.sol";
import "./constants/Constants.s.sol";
import {
    DEPLOY_SALT_DAIMO_PAY,
    DEPLOY_SALT_EXECUTOR
} from "./constants/DeploySalts.sol";

contract DeployDaimoPayExecutor is Script {
    function run() public {
        vm.startBroadcast();

        // Predict where DaimoPay will be deployed using CREATE3 salt
        address predictedDaimoPay = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_DAIMO_PAY
        );
        console.log("predicted daimo pay address:", predictedDaimoPay);

        address executor = CREATE3.deploy(
            DEPLOY_SALT_EXECUTOR,
            abi.encodePacked(
                type(DaimoPayExecutor).creationCode,
                abi.encode(predictedDaimoPay)
            )
        );

        vm.stopBroadcast();

        console.log("daimo pay executor deployed at address:", executor);
    }

    // Exclude from forge coverage
    function test() public {}
}
