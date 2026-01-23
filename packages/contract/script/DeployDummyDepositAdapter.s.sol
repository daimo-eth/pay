// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/finalCallAdapters/DummyDepositAdapter.sol";

/// @title DeployDummyDepositAdapter
/// @notice Foundry script that deploys DummyDepositAdapter via CREATE2.
contract DeployDummyDepositAdapter is Script {
    function run() public {
        vm.startBroadcast();

        DummyDepositAdapter adapter = new DummyDepositAdapter{
            salt: "DummyDepositAdapter"
        }();

        console.log("DummyDepositAdapter deployed at", address(adapter));

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
