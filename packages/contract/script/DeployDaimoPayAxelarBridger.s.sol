// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayAxelarBridger.sol";
import "./constants/AxelarBridgeRouteConstants.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "./constants/DeploySalts.sol";

contract DeployDaimoPayAxelarBridger is Script {
    function run() public {
        address axelarGateway = _getAxelarGatewayAddress(block.chainid);
        address axelarGasService = _getAxelarGasServiceAddress(block.chainid);
        // We always send the bridged tokens to the DaimoPayAxelarBridger on the
        // destination chain.
        address axelarReceiver = CREATE3.getDeployed(
            msg.sender,
            DEPLOY_SALT_AXELAR_BRIDGER
        );

        (
            uint256[] memory chainIds,
            DaimoPayAxelarBridger.AxelarBridgeRoute[] memory bridgeRoutes
        ) = getAxelarBridgeRoutes(block.chainid, axelarReceiver);

        // Receiver chains still need to have the contract deployed even if there
        // are no bridge routes so that the _execute and _executeWithToken
        // functions on the contract can be called. The Axelar protocol requires
        // the receiver contract implement these functions.
        if (chainIds.length == 0) {
            console.log("WARNING: No Axelar bridge routes found");
        }

        for (uint32 i = 0; i < chainIds.length; ++i) {
            console.log("toChain:", chainIds[i]);
            console.log("destChainName:", bridgeRoutes[i].destChainName);
            console.log("bridgeTokenIn:", bridgeRoutes[i].bridgeTokenIn);
            console.log("bridgeTokenOut:", bridgeRoutes[i].bridgeTokenOut);
            console.log("tokenSymbol:", bridgeRoutes[i].tokenSymbol);
            console.log("receiverContract:", bridgeRoutes[i].receiverContract);
            console.log("nativeFee:", bridgeRoutes[i].nativeFee);
            console.log("--------------------------------");
        }

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            DEPLOY_SALT_AXELAR_BRIDGER,
            abi.encodePacked(
                type(DaimoPayAxelarBridger).creationCode,
                abi.encode(
                    IAxelarGatewayWithToken(axelarGateway),
                    IAxelarGasService(axelarGasService),
                    chainIds,
                    bridgeRoutes
                )
            )
        );

        console.log("Axelar bridger deployed at address:", address(bridger));

        vm.stopBroadcast();
    }

    // Exclude from forge coverage
    function test() public {}
}
