// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import {CREATE3Factory} from "../vendor/create3/CREATE3Factory.sol";
import {DEPLOY_SALT_CREATE3_FACTORY} from "./constants/DeploySalts.sol";

contract DeployScript is Script {
    function run() public returns (CREATE3Factory factory) {
        vm.startBroadcast();

        factory = new CREATE3Factory{salt: DEPLOY_SALT_CREATE3_FACTORY}();

        console.log("CREATE3Factory deployed to:", address(factory));

        vm.stopBroadcast();
    }
}
