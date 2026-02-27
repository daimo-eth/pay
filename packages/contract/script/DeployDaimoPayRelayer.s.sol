// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import "../src/relayer/DaimoPayRelayer.sol";
import "./constants/Constants.s.sol";

contract DeployDaimoPayRelayer is Script {
    function run() public {
        address owner = msg.sender;

        bytes32 salt = keccak256(bytes(
            vm.envOr("RELAYER_DEPLOY_SALT", string("DaimoPayRelayer-prod4"))
        ));

        vm.startBroadcast();

        address daimoPayRelayer = CREATE3.deploy(
            salt,
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
