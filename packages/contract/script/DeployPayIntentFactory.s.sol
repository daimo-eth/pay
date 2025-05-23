// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/PayIntentFactory.sol";
import "./constants/Constants.s.sol";

contract DeployPayIntentFactory is Script {
    function run() public {
        vm.startBroadcast();

        address intentFactory = CREATE3.deploy(
            keccak256("PayIntentFactory-deploy2"),
            abi.encodePacked(type(PayIntentFactory).creationCode, abi.encode())
        );

        vm.stopBroadcast();

        console.log("pay intent factory deployed at address:", intentFactory);
    }

    // Exclude from forge coverage
    function test() public {}
}
