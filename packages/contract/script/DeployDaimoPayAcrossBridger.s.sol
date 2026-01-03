// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayAcrossBridger.sol";
import "./constants/AcrossBridgeRouteConstants.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "./constants/DeploySalts.sol";

contract DeployDaimoPayAcrossBridger is Script {
    function run() public {
        address spokePool = _getSpokePoolAddress(block.chainid);

        (
            uint256[] memory chainIds,
            DaimoPayAcrossBridger.AcrossBridgeRoute[] memory bridgeRoutes
        ) = getAcrossBridgeRoutes(block.chainid);

        if (chainIds.length == 0) {
            revert("No Across bridge routes found");
        }

        for (uint256 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i]);
            console.log("bridgeTokenIn:", bridgeRoutes[i].bridgeTokenIn);
            console.log("bridgeTokenOut:", bridgeRoutes[i].bridgeTokenOut);
            console.log("pctFee:", bridgeRoutes[i].pctFee);
            console.log("flatFee:", bridgeRoutes[i].flatFee);
            console.log("--------------------------------");
        }

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_ACROSS_BRIDGER,
            abi.encodePacked(
                type(DaimoPayAcrossBridger).creationCode,
                abi.encode(
                    V3SpokePoolInterface(spokePool),
                    chainIds,
                    bridgeRoutes
                )
            )
        );

        console.log("Across bridger deployed at address:", address(bridger));

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
