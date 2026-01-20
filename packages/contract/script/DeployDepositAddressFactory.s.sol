// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DepositAddressFactory.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_DA_FACTORY} from "./constants/DeploySalts.sol";

/// @title DeployDepositAddressFactory
/// @notice Foundry script that deploys DepositAddressFactory via CREATE3.
contract DeployDepositAddressFactory is Script {
    function run() public {
        vm.startBroadcast();

        address daFactory = CREATE3.deploy(
            DEPLOY_SALT_DA_FACTORY,
            abi.encodePacked(
                type(DepositAddressFactory).creationCode,
                abi.encode()
            )
        );
        console.log("DepositAddressFactory deployed at", daFactory);

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
