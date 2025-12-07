// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayBridger.sol";
import "./constants/AcrossBridgeRouteConstants.sol";
import "./constants/AxelarBridgeRouteConstants.sol";
import "./constants/CCTPBridgeRouteConstants.sol";
import "./constants/CCTPV2BridgeRouteConstants.sol";
import "./constants/HopBridgeRouteConstants.sol";
import "./constants/LegacyMeshBridgeRouteConstants.sol";
import "./constants/StargateBridgeRouteConstants.sol";
import "./constants/Constants.s.sol";
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

bytes32 constant DEPLOY_SALT_BRIDGER = keccak256("DaimoPayBridger-deploy29");

contract DeployDaimoPayBridger is Script {
    function run() public {
        (
            uint256[] memory chainIds,
            address[] memory bridgers
        ) = _getBridgersAndChainIds();

        console.log("--------------------------------");
        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i], "bridger:", bridgers[i]);
        }
        console.log("--------------------------------");

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_BRIDGER,
            abi.encodePacked(
                type(DaimoPayBridger).creationCode,
                abi.encode(chainIds, bridgers)
            )
        );

        vm.stopBroadcast();

        console.log("bridger deployed at address:", bridger);
    }

    function _getBridgersAndChainIds()
        private
        view
        returns (uint256[] memory chainIds, address[] memory bridgers)
    {
        bool testnet = _isTestnet(block.chainid);
        if (testnet) {
            // Bridging not supported on testnet.
            return (new uint256[](0), new address[](0));
        }

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
        (uint256[] memory cctpChainIds, ) = getCCTPBridgeRoutes(block.chainid);

        // CCTP V2
        (uint256[] memory cctpV2ChainIds, ) = getCCTPV2BridgeRoutes(
            block.chainid
        );

        // Across
        (uint256[] memory acrossChainIds, ) = getAcrossBridgeRoutes(
            block.chainid
        );

        // Axelar
        (uint256[] memory axelarChainIds, ) = getAxelarBridgeRoutes(
            block.chainid,
            axelarBridger
        );

        // Hop
        (uint256[] memory hopDestChainIds, ) = getHopBridgeRoutes(
            block.chainid
        );

        // Legacy Mesh
        (uint256[] memory legacyMeshChainIds, ) = getLegacyMeshBridgeRoutes(
            block.chainid
        );

        // Stargate
        (uint256[] memory stargateChainIds, ) = getStargateBridgeRoutes(
            block.chainid
        );

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

        // Populate arrays with each bridger type
        uint256 index = 0;

        // Add Hop routes (encode hop chain id in address slot)
        for (uint256 i = 0; i < hopDestChainIds.length; i++) {
            chainIds[index] = hopDestChainIds[i];
            bridgers[index] = hopBridger;
            index++;
        }

        // Add CCTP routes
        for (uint256 i = 0; i < cctpChainIds.length; i++) {
            chainIds[index] = cctpChainIds[i];
            bridgers[index] = cctpBridger;
            index++;
        }

        // Add CCTP V2 routes
        for (uint256 i = 0; i < cctpV2ChainIds.length; i++) {
            chainIds[index] = cctpV2ChainIds[i];
            bridgers[index] = cctpV2Bridger;
            index++;
        }

        // Add Across routes
        for (uint256 i = 0; i < acrossChainIds.length; i++) {
            chainIds[index] = acrossChainIds[i];
            bridgers[index] = acrossBridger;
            index++;
        }

        // Add Axelar routes
        for (uint256 i = 0; i < axelarChainIds.length; i++) {
            chainIds[index] = axelarChainIds[i];
            bridgers[index] = axelarBridger;
            index++;
        }

        // Add Legacy Mesh routes
        for (uint256 i = 0; i < legacyMeshChainIds.length; i++) {
            chainIds[index] = legacyMeshChainIds[i];
            bridgers[index] = legacyMeshBridger;
            index++;
        }

        // Add Stargate routes
        for (uint256 i = 0; i < stargateChainIds.length; i++) {
            chainIds[index] = stargateChainIds[i];
            bridgers[index] = stargateBridger;
            index++;
        }

        return (chainIds, bridgers);
    }

    // Exclude from forge coverage
    function test() public {}
}
