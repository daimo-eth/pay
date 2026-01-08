// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/relayer/PayBalanceReader.sol";

contract DeployPayBalanceFactory is Script {
    function run() public {
        vm.startBroadcast();

        PayBalanceFactory f = new PayBalanceFactory{salt: 0}();

        vm.stopBroadcast();

        console.log("PayBalanceFactory deployed at address:", address(f));
    }

    // Exclude from forge coverage
    function test() public {}
}
