// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/DaimoPayLegacyMeshBridger.sol";
import "./constants/LegacyMeshBridgeRouteConstants.sol";
import "./constants/Constants.s.sol";

bytes32 constant DEPLOY_SALT_LEGACY_MESH_BRIDGER = keccak256(
    "DaimoPayLegacyMeshBridger-deploy5"
);

contract DeployDaimoPayLegacyMeshBridger is Script {
    function run() public {
        (
            uint256[] memory chainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
        ) = getLegacyMeshBridgeRoutes(block.chainid);

        // Log route details
        for (uint256 i = 0; i < bridgeRoutes.length; ++i) {
            console.log("Chain ID:", chainIds[i]);
            console.log("Dst EID:", bridgeRoutes[i].dstEid);
            console.log("App:", bridgeRoutes[i].app);
            console.log("Bridge token in:", bridgeRoutes[i].bridgeTokenIn);
            console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
            console.log("--------------------------------");
        }

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_LEGACY_MESH_BRIDGER,
            abi.encodePacked(
                type(DaimoPayLegacyMeshBridger).creationCode,
                abi.encode(chainIds, bridgeRoutes)
            )
        );
        console.log(
            "Legacy Mesh bridger deployed at address:",
            address(bridger)
        );

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
