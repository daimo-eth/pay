// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DaimoPayExecutor.sol";
import "./constants/Constants.s.sol";
import {
    DEPLOY_SALT_DA_EXECUTOR,
    DEPLOY_SALT_DA_MANAGER
} from "./constants/DeploySalts.sol";

/// @title DeployDAExecutor
/// @notice Foundry script that deploys DaimoPayExecutor via CREATE3.
/// @dev The escrow address (DepositAddressManager proxy) is computed
///      deterministically from its CREATE3 salt, so the executor can be
///      deployed before or after the manager.
contract DeployDAExecutor is Script {
    function run() public {
        vm.startBroadcast();

        // Compute escrow address from CREATE3 salt
        address escrow = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_DA_MANAGER
        );
        console.log("using escrow (DepositAddressManager) at", escrow);

        address executor = CREATE3.deploy(
            DEPLOY_SALT_DA_EXECUTOR,
            abi.encodePacked(
                type(DaimoPayExecutor).creationCode,
                abi.encode(escrow)
            )
        );
        console.log("DaimoPayExecutor deployed at", executor);

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
