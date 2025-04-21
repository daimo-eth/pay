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
            keccak256("DaimoPayBridger-deploy2"),
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
            keccak256("DaimoPayCCTPBridger-deploy2")
        );
        address cctpV2Bridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayCCTPV2Bridger-deploy2")
        );
        address acrossBridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayAcrossBridger-deploy2")
        );
        address axelarBridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayAxelarBridger-deploy2")
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
