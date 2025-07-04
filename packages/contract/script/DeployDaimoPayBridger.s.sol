// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayBridger.sol";
import "./constants/AcrossBridgeRouteConstants.sol";
import "./constants/AxelarBridgeRouteConstants.sol";
import "./constants/CCTPBridgeRouteConstants.sol";
import "./constants/CCTPV2BridgeRouteConstants.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "./DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "./DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_CCTP_BRIDGER} from "./DeployDaimoPayCCTPBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "./DeployDaimoPayCCTPV2Bridger.s.sol";

bytes32 constant DEPLOY_SALT_BRIDGER = keccak256("DaimoPayBridger-deploy7");

contract DeployDaimoPayBridger is Script {
    function run() public {
        vm.startBroadcast();

        (
            uint256[] memory chainIds,
            address[] memory bridgers
        ) = _getBridgersAndChainIds();

        console.log("--------------------------------");
        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i], "bridger:", bridgers[i]);
        }
        console.log("--------------------------------");

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

        console.log("cctpBridger address:", cctpBridger);
        console.log("cctpV2Bridger address:", cctpV2Bridger);
        console.log("acrossBridger address:", acrossBridger);
        console.log("axelarBridger address:", axelarBridger);

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

        // Count total number of supported chains
        uint256 totalChains = cctpChainIds.length +
            cctpV2ChainIds.length +
            acrossChainIds.length +
            axelarChainIds.length;

        // Initialize arrays for the combined result
        chainIds = new uint256[](totalChains);
        bridgers = new address[](totalChains);

        // Populate arrays with each bridger type
        uint256 index = 0;

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

        return (chainIds, bridgers);
    }

    // Exclude from forge coverage
    function test() public {}
}
