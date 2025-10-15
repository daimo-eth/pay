// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/PayIntentFactory.sol";
import "./constants/Constants.s.sol";

bytes32 constant DEPLOY_SALT_PAY_INTENT_FACTORY = keccak256(
    "PayIntentFactory-deploy2"
);

contract DeployPayIntentFactory is Script {
    function run() public {
        runWithSalt(DEPLOY_SALT_PAY_INTENT_FACTORY);
    }

    // Example: run with a random salt:
    //   forge script script/DeployPayIntentFactory.s.sol:DeployPayIntentFactory \
    //     --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify \
    //     --sig "runWithRandomSalt()"
    function runWithRandomSalt() public {
        bytes32 salt = keccak256(
            abi.encode(block.number, block.timestamp, msg.sender, gasleft())
        );
        runWithSalt(salt);
    }

    function runWithSalt(bytes32 deploySalt) public {
        vm.startBroadcast();

        address intentFactory = CREATE3.deploy(
            deploySalt,
            abi.encodePacked(type(PayIntentFactory).creationCode, abi.encode())
        );

        vm.stopBroadcast();

        console.log("pay intent factory deployed at address:", intentFactory);
    }

    // Exclude from forge coverage
    function test() public {}
}
