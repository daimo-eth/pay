// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DaimoPay.sol";
import "./constants/Constants.s.sol";
contract DeployDaimoPay is Script {
    function run() public {
        vm.startBroadcast();

        address intentFactory = CREATE3.getDeployed(
            msg.sender,
            keccak256("PayIntentFactory-deploy2")
        );
        address bridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayBridger-deploy2")
        );
        console.log("using intent factory at", intentFactory);
        console.log("using bridger at", bridger);

        address daimoPay = CREATE3.deploy(
            keccak256("DaimoPay-deploy4"),
            abi.encodePacked(
                type(DaimoPay).creationCode,
                abi.encode(intentFactory, bridger)
            )
        );

        vm.stopBroadcast();

        console.log("daimo pay deployed at address:", daimoPay);
    }

    // Exclude from forge coverage
    function test() public {}
}
