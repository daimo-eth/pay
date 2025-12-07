// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DaimoPayStargateBridger.sol";
import "./constants/StargateBridgeRouteConstants.sol";
import "./constants/Constants.s.sol";

bytes32 constant DEPLOY_SALT_STARGATE_BRIDGER = keccak256(
    "DaimoPayStargateBridger-deploy5"
);

contract DeployDaimoPayStargateBridger is Script {
    function run() public {
        (
            uint256[] memory chainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
        ) = getStargateBridgeRoutes(block.chainid);

        // Log route details
        for (uint256 i = 0; i < bridgeRoutes.length; ++i) {
            console.log("Chain ID:", chainIds[i]);
            console.log("Dst EID:", bridgeRoutes[i].dstEid);
            console.log("App:", bridgeRoutes[i].app);
            console.log("Bridge token in:", bridgeRoutes[i].bridgeTokenIn);
            console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
            console.log(
                "Bridge token out decimals:",
                bridgeRoutes[i].bridgeTokenOutDecimals
            );
            console.log("--------------------------------");
        }

        vm.startBroadcast();
        address bridger = CREATE3.deploy(
            DEPLOY_SALT_STARGATE_BRIDGER,
            abi.encodePacked(
                type(DaimoPayStargateBridger).creationCode,
                abi.encode(chainIds, bridgeRoutes)
            )
        );
        vm.stopBroadcast();

        console.log("Stargate bridger deployed at address:", address(bridger));
    }

    // Exclude from forge coverage
    function test() public {}
}
