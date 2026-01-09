// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import "../src/relayer/DaimoPayRelayer.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_DAIMO_PAY_RELAYER} from "./constants/DeploySalts.sol";

contract DeployDaimoPayRelayer is Script {
    function run() public {
        address owner = msg.sender;

        vm.startBroadcast();

        address daimoPayRelayer = CREATE3.deploy(
            DEPLOY_SALT_DAIMO_PAY_RELAYER,
            abi.encodePacked(
                type(DaimoPayRelayer).creationCode,
                abi.encode(owner)
            )
        );
        console.log("daimoPayRelayer deployed at address:", daimoPayRelayer);

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
