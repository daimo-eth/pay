// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayCCTPV2Bridger.sol";
import "./Constants.s.sol";

contract DeployDaimoPayCCTPV2Bridger is Script {
    function run() public {
        address tokenMinterV2 = _getTokenMinterV2Address(block.chainid);
        address tokenMessengerV2 = _getTokenMessengerV2Address(block.chainid);
        console.log("tokenMinterV2:", tokenMinterV2);
        console.log("tokenMessengerV2:", tokenMessengerV2);

        (
            uint256[] memory chainIds,
            DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory bridgeRoutes
        ) = _getCCTPV2BridgeRoutes();

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            keccak256("DaimoPayCCTPV2Bridger-audit2"),
            abi.encodePacked(
                type(DaimoPayCCTPV2Bridger).creationCode,
                abi.encode(
                    ITokenMinterV2(tokenMinterV2),
                    ICCTPTokenMessengerV2(tokenMessengerV2),
                    chainIds,
                    bridgeRoutes
                )
            )
        );
        console.log("CCTPv2 bridger deployed at address:", address(bridger));

        vm.stopBroadcast();
    }

    function _getCCTPV2BridgeRoutes()
        private
        pure
        returns (
            uint256[] memory chainIds,
            DaimoPayCCTPV2Bridger.CCTPBridgeRoute[] memory bridgeRoutes
        )
    {
        chainIds = new uint256[](3);
        chainIds[0] = BASE_MAINNET;
        chainIds[1] = ETH_MAINNET;
        chainIds[2] = LINEA_MAINNET;

        bridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](3);
        for (uint256 i = 0; i < chainIds.length; ++i) {
            bridgeRoutes[i] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
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
