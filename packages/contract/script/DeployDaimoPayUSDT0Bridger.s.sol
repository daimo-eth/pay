// Reenable once USDT0 bridge routes are added

// // SPDX-License-Identifier: GPL-3.0-or-later
// pragma solidity ^0.8.13;

// import "forge-std/Script.sol";

// import "../src/DaimoPayUSDT0Bridger.sol";
// import "./constants/USDT0BridgeRouteConstants.sol";
// import "./constants/Constants.s.sol";

// bytes32 constant DEPLOY_SALT_USDT0_BRIDGER = keccak256(
//     "DaimoPayUSDT0Bridger-deploy1"
// );

// contract DeployDaimoPayUSDT0Bridger is Script {
//     function run() public {
//         (
//             uint256[] memory chainIds,
//             DaimoPayLayerZeroBridger.LZBridgeRoute[] memory bridgeRoutes
//         ) = getUSDT0BridgeRoutes(block.chainid);

//         if (chainIds.length == 0) {
//             revert("No USDT0 bridge routes found");
//         }

//         // Log route details
//         for (uint256 i = 0; i < bridgeRoutes.length; ++i) {
//             console.log("Chain ID:", chainIds[i]);
//             console.log("Dst EID:", bridgeRoutes[i].dstEid);
//             console.log("App:", bridgeRoutes[i].app);
//             console.log("Bridge token in:", bridgeRoutes[i].bridgeTokenIn);
//             console.log("Bridge token out:", bridgeRoutes[i].bridgeTokenOut);
//             console.log("--------------------------------");
//         }

//         vm.startBroadcast();

//         address bridger = CREATE3.deploy(
//             DEPLOY_SALT_USDT0_BRIDGER,
//             abi.encodePacked(
//                 type(DaimoPayUSDT0Bridger).creationCode,
//                 abi.encode(chainIds, bridgeRoutes)
//             )
//         );
//         console.log("USDT0 bridger deployed at address:", address(bridger));

//         vm.stopBroadcast();
//     }

//     // Exclude from forge coverage
//     function test() public {}
// }
