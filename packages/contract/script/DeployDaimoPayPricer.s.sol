// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console2.sol";

import "../src/DaimoPayPricer.sol";
import "./constants/Constants.s.sol";

contract DeployDaimoPayPricer is Script {
    function run() public {
        address DEFAULT_TRUSTED_SIGNER = msg.sender;
        uint256 DEFAULT_MAX_PRICE_AGE = 300; // 5 minutes

        address trustedSigner = vm.envOr(
            "TRUSTED_SIGNER",
            DEFAULT_TRUSTED_SIGNER
        );
        uint256 maxPriceAge = vm.envOr("MAX_PRICE_AGE", DEFAULT_MAX_PRICE_AGE);

        bytes32 salt = keccak256(bytes(
            vm.envOr("PRICER_DEPLOY_SALT", string("DaimoPayPricer-prod1"))
        ));

        vm.startBroadcast();

        address daimoPayPricer = CREATE3.deploy(
            salt,
            abi.encodePacked(
                type(DaimoPayPricer).creationCode,
                abi.encode(trustedSigner, maxPriceAge)
            )
        );
        console.log("DaimoPayPricer deployed at address:", daimoPayPricer);
        console.log("  trustedSigner:", trustedSigner);
        console.log("  maxPriceAge:", maxPriceAge);

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
