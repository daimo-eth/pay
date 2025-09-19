// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/PayRefundFactory.sol";

contract DeployPayRefundFactory is Script {
    function run() public {
        vm.startBroadcast();

        // Deploy with CREATE2 salt 0
        PayRefundFactory factory = new PayRefundFactory{salt: 0}();

        vm.stopBroadcast();

        console.log(
            "pay refund factory deployed at address:",
            address(factory)
        );
    }

    // Exclude from forge coverage
    function test() public {}
}
