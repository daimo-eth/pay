// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/finalCallAdapters/HypercoreDepositAdapter.sol";
import "./constants/Constants.s.sol";
import {
    DEPLOY_SALT_HYPERCORE_DEPOSIT_ADAPTER
} from "./constants/DeploySalts.sol";

/// @title DeployHypercoreDepositAdapter
/// @notice Foundry script that deploys HypercoreDepositAdapter via CREATE2.
contract DeployHypercoreDepositAdapter is Script {
    function run() public {
        vm.startBroadcast();

        HypercoreDepositAdapter adapter = new HypercoreDepositAdapter{
            salt: DEPLOY_SALT_HYPERCORE_DEPOSIT_ADAPTER
        }(IERC20(HYPEREVM_MAINNET_USDC), HYPEREVM_MAINNET_CORE_DEPOSIT_WALLET);

        console.log("HypercoreDepositAdapter deployed at", address(adapter));

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
