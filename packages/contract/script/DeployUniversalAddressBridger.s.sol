// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../src/UniversalAddressBridger.sol";
import "../src/DaimoPayCCTPBridger.sol";
import "../src/DaimoPayCCTPV2Bridger.sol";
import "../src/DaimoPayAcrossBridger.sol";
import "../src/DaimoPayAxelarBridger.sol";
import "./constants/Constants.s.sol";
import "./constants/AcrossBridgeRouteConstants.sol";
import "./constants/AxelarBridgeRouteConstants.sol";
import "./constants/CCTPBridgeRouteConstants.sol";
import "./constants/CCTPV2BridgeRouteConstants.sol";
import "./constants/HopBridgeRouteConstants.sol";
import "./constants/LegacyMeshBridgeRouteConstants.sol";
import "./constants/StargateBridgeRouteConstants.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "./DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "./DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_CCTP_BRIDGER} from "./DeployDaimoPayCCTPBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "./DeployDaimoPayCCTPV2Bridger.s.sol";
import {DEPLOY_SALT_HOP_BRIDGER} from "./DeployDaimoPayHopBridger.s.sol";
import {
    DEPLOY_SALT_LEGACY_MESH_BRIDGER
} from "./DeployDaimoPayLegacyMeshBridger.s.sol";
import {
    DEPLOY_SALT_STARGATE_BRIDGER
} from "./DeployDaimoPayStargateBridger.s.sol";

bytes32 constant DEPLOY_SALT_UA_BRIDGER = keccak256(
    "UniversalAddressBridger-deploy1"
);

contract DeployUniversalAddressBridger is Script {
    function run() public {
        (
            uint256[] memory chainIds,
            address[] memory bridgers,
            address[] memory stableOuts
        ) = _getBridgersAndChainIds();

        console.log("--------------------------------");
        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i]);
            console.log("  bridger:", bridgers[i]);
            console.log("  stableOut:", stableOuts[i]);
        }
        console.log("--------------------------------");

        vm.startBroadcast();

        address universalBridger = CREATE3.deploy(
            DEPLOY_SALT_UA_BRIDGER,
            abi.encodePacked(
                type(UniversalAddressBridger).creationCode,
                abi.encode(chainIds, bridgers, stableOuts)
            )
        );

        vm.stopBroadcast();

        console.log("UniversalAddressBridger deployed at:", universalBridger);
    }

    function _getBridgersAndChainIds()
        private
        view
        returns (
            uint256[] memory chainIds,
            address[] memory bridgers,
            address[] memory stableOuts
        )
    {
        // Get addresses of deployed bridger implementations
        address cctpBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_CCTP_BRIDGER
        );
        address cctpV2Bridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_CCTP_V2_BRIDGER
        );
        address acrossBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_ACROSS_BRIDGER
        );
        address axelarBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_AXELAR_BRIDGER
        );
        address hopBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_HOP_BRIDGER
        );
        address legacyMeshBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_LEGACY_MESH_BRIDGER
        );
        address stargateBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_STARGATE_BRIDGER
        );

        console.log("cctpBridger address:", cctpBridger);
        console.log("cctpV2Bridger address:", cctpV2Bridger);
        console.log("acrossBridger address:", acrossBridger);
        console.log("axelarBridger address:", axelarBridger);
        console.log("hopBridger address:", hopBridger);
        console.log("legacyMeshBridger address:", legacyMeshBridger);
        console.log("stargateBridger address:", stargateBridger);

        // Get all supported destination chains from the generated constants
        // CCTP
        (
            uint256[] memory cctpChainIds,
            DaimoPayCCTPBridger.CCTPBridgeRoute[] memory cctpBridgeRoutes
        ) = getCCTPBridgeRoutes(block.chainid);

        // CCTP V2
        (
            uint256[] memory cctpV2ChainIds,
            DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory cctpV2BridgeRoutes
        ) = getCCTPV2BridgeRoutes(block.chainid);

        // Across
        (
            uint256[] memory acrossChainIds,
            DaimoPayAcrossBridger.AcrossBridgeRoute[] memory acrossBridgeRoutes
        ) = getAcrossBridgeRoutes(block.chainid);

        // Axelar
        (
            uint256[] memory axelarChainIds,
            DaimoPayAxelarBridger.AxelarBridgeRoute[] memory axelarBridgeRoutes
        ) = getAxelarBridgeRoutes(block.chainid, axelarBridger);

        // Hop
        (
            uint256[] memory hopDestChainIds,
            DaimoPayHopBridger.FinalChainCoin[] memory hopBridgeRoutes
        ) = getHopBridgeRoutes(block.chainid);

        // Legacy Mesh
        (
            uint256[] memory legacyMeshChainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory legacyMeshBridgeRoutes
        ) = getLegacyMeshBridgeRoutes(block.chainid);

        // Stargate
        (
            uint256[] memory stargateChainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory stargateBridgeRoutes
        ) = getStargateBridgeRoutes(block.chainid);

        // Count total number of supported chains
        uint256 totalChains = cctpChainIds.length +
            cctpV2ChainIds.length +
            acrossChainIds.length +
            axelarChainIds.length +
            hopDestChainIds.length +
            legacyMeshChainIds.length +
            stargateChainIds.length;

        // Initialize arrays for the combined result
        chainIds = new uint256[](totalChains);
        bridgers = new address[](totalChains);
        stableOuts = new address[](totalChains);

        uint256 index = 0;

        // Add CCTP routes
        for (uint256 i = 0; i < cctpChainIds.length; ++i) {
            chainIds[index] = cctpChainIds[i];
            bridgers[index] = cctpBridger;
            stableOuts[index] = cctpBridgeRoutes[i].bridgeTokenOut;
            index++;
        }

        // Add CCTP V2 routes
        for (uint256 i = 0; i < cctpV2ChainIds.length; ++i) {
            chainIds[index] = cctpV2ChainIds[i];
            bridgers[index] = cctpV2Bridger;
            stableOuts[index] = cctpV2BridgeRoutes[i].bridgeTokenOut;
            index++;
        }

        // Add Across routes
        for (uint256 i = 0; i < acrossChainIds.length; ++i) {
            chainIds[index] = acrossChainIds[i];
            bridgers[index] = acrossBridger;
            stableOuts[index] = acrossBridgeRoutes[i].bridgeTokenOut;
            index++;
        }

        // Add Axelar routes
        for (uint256 i = 0; i < axelarChainIds.length; ++i) {
            chainIds[index] = axelarChainIds[i];
            bridgers[index] = axelarBridger;
            stableOuts[index] = axelarBridgeRoutes[i].bridgeTokenOut;
            index++;
        }

        // Add Hop routes
        for (uint256 i = 0; i < hopDestChainIds.length; ++i) {
            chainIds[index] = hopDestChainIds[i];
            bridgers[index] = hopBridger;
            stableOuts[index] = hopBridgeRoutes[i].coinAddr;
            index++;
        }

        // Add Legacy Mesh routes
        for (uint256 i = 0; i < legacyMeshChainIds.length; i++) {
            chainIds[index] = legacyMeshChainIds[i];
            bridgers[index] = legacyMeshBridger;
            stableOuts[index] = legacyMeshBridgeRoutes[i].bridgeTokenOut;
            index++;
        }

        // Add Stargate routes
        for (uint256 i = 0; i < stargateChainIds.length; i++) {
            chainIds[index] = stargateChainIds[i];
            bridgers[index] = stargateBridger;
            stableOuts[index] = stargateBridgeRoutes[i].bridgeTokenOut;
            index++;
        }

        return (chainIds, bridgers, stableOuts);
    }

    // Exclude from forge coverage
    function test() public {}
}
