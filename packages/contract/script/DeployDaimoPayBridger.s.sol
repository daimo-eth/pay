// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayBridger.sol";
import "./Constants.s.sol";

contract DeployDaimoPayBridger is Script {
    function run() public {
        vm.startBroadcast();

        (
            uint256[] memory chainIds,
            address[] memory bridgers
        ) = _getBridgersAndChainIds();

        address bridger = CREATE3.deploy(
            keccak256("DaimoPayBridger-audit2"),
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

        address cctpBridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayCCTPBridger-audit2")
        );
        address cctpV2Bridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayCCTPV2Bridger-audit2")
        );
        address acrossBridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayAcrossBridger-audit2")
        );
        address axelarBridger = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayAxelarBridger-audit2")
        );
        console.log("cctpBridger address:", cctpBridger);
        console.log("cctpV2Bridger address:", cctpV2Bridger);
        console.log("acrossBridger address:", acrossBridger);
        console.log("axelarBridger address:", axelarBridger);

        // Bridge to CCTP chains using CCTP.
        // Linea uses Across.
        // BSC uses Axelar.
        uint256[] memory allChainIds = new uint256[](11);
        address[] memory allBridgers = new address[](11);

        allChainIds[0] = ARBITRUM_MAINNET;
        allChainIds[1] = AVAX_MAINNET;
        allChainIds[2] = BASE_MAINNET;
        allChainIds[3] = ETH_MAINNET;
        allChainIds[4] = OP_MAINNET;
        allChainIds[5] = POLYGON_MAINNET;
        allChainIds[6] = LINEA_MAINNET;
        allChainIds[7] = BSC_MAINNET;
        allChainIds[8] = WORLDCHAIN_MAINNET;
        allChainIds[9] = BLAST_MAINNET;
        allChainIds[10] = MANTLE_MAINNET;

        allBridgers[0] = cctpBridger;
        allBridgers[1] = cctpBridger;
        allBridgers[2] = cctpBridger;
        allBridgers[3] = cctpBridger;
        allBridgers[4] = cctpBridger;
        allBridgers[5] = cctpBridger;
        allBridgers[6] = acrossBridger;
        allBridgers[7] = axelarBridger;
        allBridgers[8] = acrossBridger;
        allBridgers[9] = acrossBridger;
        allBridgers[10] = axelarBridger;

        chainIds = new uint256[](10);
        bridgers = new address[](10);

        // Include all chainIds except the current chainId
        uint256 count = 0;
        for (uint256 i = 0; i < allChainIds.length; ++i) {
            if (allChainIds[i] != block.chainid) {
                chainIds[count] = allChainIds[i];
                // Base and Linea bridge to each other using CCTPv2.
                if (
                    block.chainid == BASE_MAINNET &&
                    allChainIds[i] == LINEA_MAINNET
                ) {
                    bridgers[count] = cctpV2Bridger;
                } else {
                    bridgers[count] = allBridgers[i];
                }
                ++count;
            }
        }

        if (
            block.chainid == LINEA_MAINNET ||
            block.chainid == WORLDCHAIN_MAINNET ||
            block.chainid == BLAST_MAINNET
        ) {
            // Linea, Worldchain, and Blast bridge to other chains using Across.
            // Override all bridgers with Across.
            // The exceptions are BSC and Mantle, which use Axelar.
            for (uint256 i = 0; i < bridgers.length; ++i) {
                if (
                    chainIds[i] == BSC_MAINNET || chainIds[i] == MANTLE_MAINNET
                ) {
                    bridgers[i] = axelarBridger;
                } else if (
                    block.chainid == LINEA_MAINNET &&
                    chainIds[i] == BASE_MAINNET
                ) {
                    bridgers[i] = cctpV2Bridger;
                } else {
                    bridgers[i] = acrossBridger;
                }
            }
        } else if (
            block.chainid == BSC_MAINNET || block.chainid == MANTLE_MAINNET
        ) {
            // BSC and Mantle bridges to other chains using Axelar. Override all
            // bridgers with Axelar.
            for (uint256 i = 0; i < bridgers.length; ++i) {
                bridgers[i] = axelarBridger;
            }
        }

        console.log("--------------------------------");
        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i], "bridger:", bridgers[i]);
        }
        console.log("--------------------------------");

        return (chainIds, bridgers);
    }

    // Exclude from forge coverage
    function test() public {}
}
