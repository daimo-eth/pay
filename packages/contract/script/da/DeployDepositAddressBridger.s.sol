// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";

import "../../src/DepositAddressBridger.sol";
import "../../src/DaimoPayCCTPV2Bridger.sol";
import "../../src/DaimoPayLayerZeroBridger.sol";
import "../../src/DaimoPayHopBridger.sol";
import "../Constants.s.sol";
import {
    getDACCTPV2BridgeRoutes
} from "./constants/DACCTPV2BridgeRouteConstants.sol";
import {
    getDAHopChain,
    getDAHopBridgeRoutes
} from "./constants/DAHopBridgeRouteConstants.sol";
import {
    getDALegacyMeshBridgeRoutes
} from "./constants/DALegacyMeshBridgeRouteConstants.sol";
import {
    getDAStargateUSDCBridgeRoutes,
    getDAStargateUSDTBridgeRoutes
} from "./constants/DAStargateBridgeRouteConstants.sol";
import {
    DEPLOY_SALT_CCTP_V2_BRIDGER,
    DEPLOY_SALT_HOP_BRIDGER,
    DEPLOY_SALT_LEGACY_MESH_BRIDGER,
    DEPLOY_SALT_STARGATE_USDC_BRIDGER,
    DEPLOY_SALT_STARGATE_USDT_BRIDGER,
    DEPLOY_SALT_DA_BRIDGER
} from "../DeploySalts.sol";

contract DeployDepositAddressBridger is Script {
    function run() public {
        (
            uint256[] memory chainIds,
            address[] memory stableOuts,
            address[] memory bridgers
        ) = _getBridgerRoutes();

        console.log("--------------------------------");
        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i]);
            console.log("  stableOut:", stableOuts[i]);
            console.log("  bridger:", bridgers[i]);
        }
        console.log("--------------------------------");

        vm.startBroadcast();

        address universalBridger = CREATE3.deploy(
            DEPLOY_SALT_DA_BRIDGER,
            abi.encodePacked(
                type(DepositAddressBridger).creationCode,
                abi.encode(chainIds, stableOuts, bridgers)
            )
        );

        vm.stopBroadcast();

        console.log("DepositAddressBridger deployed at:", universalBridger);
    }

    function _getBridgerRoutes()
        private
        view
        returns (
            uint256[] memory chainIds,
            address[] memory stableOuts,
            address[] memory bridgers
        )
    {
        // Get addresses of deployed bridger implementations
        address cctpV2Bridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_CCTP_V2_BRIDGER
        );
        address stargateUSDCBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_STARGATE_USDC_BRIDGER
        );
        address stargateUSDTBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_STARGATE_USDT_BRIDGER
        );
        address legacyMeshBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_LEGACY_MESH_BRIDGER
        );
        address hopBridger = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_HOP_BRIDGER
        );

        console.log("cctpV2Bridger address:", cctpV2Bridger);
        console.log("stargateUSDCBridger address:", stargateUSDCBridger);
        console.log("stargateUSDTBridger address:", stargateUSDTBridger);
        console.log("legacyMeshBridger address:", legacyMeshBridger);
        console.log("hopBridger address:", hopBridger);

        // Get all supported destination chains from the DA constants
        // CCTP V2
        (
            uint256[] memory cctpV2ChainIds,
            DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory cctpV2BridgeRoutes
        ) = getDACCTPV2BridgeRoutes(block.chainid);

        // Stargate USDC
        (
            uint256[] memory stargateUSDCChainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory stargateUSDCBridgeRoutes
        ) = getDAStargateUSDCBridgeRoutes(block.chainid);

        // Stargate USDT
        (
            uint256[] memory stargateUSDTChainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory stargateUSDTBridgeRoutes
        ) = getDAStargateUSDTBridgeRoutes(block.chainid);

        // Legacy Mesh
        (
            uint256[] memory legacyMeshChainIds,
            DaimoPayLayerZeroBridger.LZBridgeRoute[] memory legacyMeshBridgeRoutes
        ) = getDALegacyMeshBridgeRoutes(block.chainid);

        // Hop
        (
            uint256[] memory hopDestChainIds,
            DaimoPayHopBridger.FinalChainCoin[] memory finalChainCoins
        ) = getDAHopBridgeRoutes(block.chainid);

        // Count total number of supported chains
        uint256 totalChains = cctpV2ChainIds.length +
            stargateUSDCChainIds.length +
            stargateUSDTChainIds.length +
            legacyMeshChainIds.length +
            hopDestChainIds.length;

        // Initialize arrays for the combined result
        chainIds = new uint256[](totalChains);
        stableOuts = new address[](totalChains);
        bridgers = new address[](totalChains);

        uint256 index = 0;

        // Add CCTP V2 routes
        for (uint256 i = 0; i < cctpV2ChainIds.length; ++i) {
            chainIds[index] = cctpV2ChainIds[i];
            stableOuts[index] = cctpV2BridgeRoutes[i].bridgeTokenOut;
            bridgers[index] = cctpV2Bridger;
            index++;
        }

        // Add Stargate USDC routes
        for (uint256 i = 0; i < stargateUSDCChainIds.length; ++i) {
            chainIds[index] = stargateUSDCChainIds[i];
            stableOuts[index] = stargateUSDCBridgeRoutes[i].bridgeTokenOut;
            bridgers[index] = stargateUSDCBridger;
            index++;
        }

        // Add Stargate USDT routes
        for (uint256 i = 0; i < stargateUSDTChainIds.length; ++i) {
            chainIds[index] = stargateUSDTChainIds[i];
            stableOuts[index] = stargateUSDTBridgeRoutes[i].bridgeTokenOut;
            bridgers[index] = stargateUSDTBridger;
            index++;
        }

        // Add Legacy Mesh routes
        for (uint256 i = 0; i < legacyMeshChainIds.length; i++) {
            chainIds[index] = legacyMeshChainIds[i];
            stableOuts[index] = legacyMeshBridgeRoutes[i].bridgeTokenOut;
            bridgers[index] = legacyMeshBridger;
            index++;
        }

        // Add Hop routes
        for (uint256 i = 0; i < hopDestChainIds.length; ++i) {
            chainIds[index] = hopDestChainIds[i];
            stableOuts[index] = finalChainCoins[i].coinAddr;
            bridgers[index] = hopBridger;
            index++;
        }

        return (chainIds, stableOuts, bridgers);
    }

    // Exclude from forge coverage
    function test() public {}
}
