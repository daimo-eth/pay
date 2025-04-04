// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayCCTPBridger.sol";
import "./Constants.s.sol";

contract DeployDaimoPayCCTPBridger is Script {
    function run() public {
        address tokenMinter = _getTokenMinterAddress(block.chainid);
        address tokenMessenger = _getTokenMessengerAddress(block.chainid);
        console.log("tokenMinter:", tokenMinter);
        console.log("tokenMessenger:", tokenMessenger);

        (
            uint256[] memory chainIds,
            DaimoPayCCTPBridger.CCTPBridgeRoute[] memory bridgeRoutes
        ) = _getCCTPBridgeRoutes();

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            keccak256("DaimoPayCCTPBridger-audit2"),
            abi.encodePacked(
                type(DaimoPayCCTPBridger).creationCode,
                abi.encode(
                    ITokenMinter(tokenMinter),
                    ICCTPTokenMessenger(tokenMessenger),
                    chainIds,
                    bridgeRoutes
                )
            )
        );
        console.log("CCTPv1 bridger deployed at address:", address(bridger));

        vm.stopBroadcast();
    }

    function _getCCTPBridgeRoutes()
        private
        pure
        returns (
            uint256[] memory chainIds,
            DaimoPayCCTPBridger.CCTPBridgeRoute[] memory bridgeRoutes
        )
    {
        chainIds = new uint256[](6);
        chainIds[0] = ETH_MAINNET;
        chainIds[1] = AVAX_MAINNET;
        chainIds[2] = OP_MAINNET;
        chainIds[3] = ARBITRUM_MAINNET;
        chainIds[4] = BASE_MAINNET;
        chainIds[5] = POLYGON_MAINNET;

        bridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](6);
        for (uint256 i = 0; i < chainIds.length; ++i) {
            bridgeRoutes[i] = DaimoPayCCTPBridger.CCTPBridgeRoute({
                domain: _getCCTPDomain(chainIds[i]),
                bridgeTokenOut: _getUSDCAddress(chainIds[i])
            });
        }

        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("Chain ID:", chainIds[i]);
            console.log("Domain:", bridgeRoutes[i].domain);
            console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
            console.log("--------------------------------");
        }

        return (chainIds, bridgeRoutes);
    }

    // Exclude from forge coverage
    function test() public {}
}
