// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DepositAddressManager.sol";
import "../src/DepositAddressFactory.sol";
import "../src/DaimoPayExecutor.sol";
import "./constants/Constants.s.sol";
import {
    DEPLOY_SALT_DA_EXECUTOR,
    DEPLOY_SALT_DA_FACTORY,
    DEPLOY_SALT_DA_MANAGER
} from "./constants/DeploySalts.sol";

/// @title DeployDepositAddressManager
/// @notice Foundry script that deploys DepositAddressManager via CREATE3.
/// @dev The executor and factory addresses are computed deterministically from
///      their CREATE3 salts, so they must be deployed first.
contract DeployDepositAddressManager is Script {
    function run() public {
        vm.startBroadcast();

        // Compute executor address from CREATE3 salt
        address executor = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_DA_EXECUTOR
        );
        console.log("using executor at", executor);

        // Compute factory address from CREATE3 salt
        address daFactory = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_DA_FACTORY
        );
        console.log("using factory at", daFactory);

        // Deploy DepositAddressManager directly (not upgradeable)
        address daManager = CREATE3.deploy(
            DEPLOY_SALT_DA_MANAGER,
            abi.encodePacked(
                type(DepositAddressManager).creationCode,
                abi.encode(
                    msg.sender,
                    DepositAddressFactory(daFactory),
                    DaimoPayExecutor(payable(executor))
                )
            )
        );
        console.log("DepositAddressManager deployed at", daManager);
        console.log("DepositAddressManager owner", msg.sender);

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
