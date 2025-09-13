// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/DaimoPayHopBridger.sol";
import "./constants/Constants.s.sol";
import {DEPLOY_SALT_AXELAR_BRIDGER} from "./DeployDaimoPayAxelarBridger.s.sol";
import {DEPLOY_SALT_ACROSS_BRIDGER} from "./DeployDaimoPayAcrossBridger.s.sol";
import {DEPLOY_SALT_CCTP_V2_BRIDGER} from "./DeployDaimoPayCCTPV2Bridger.s.sol";
import {getCCTPV2BridgeRoutes} from "./constants/CCTPV2BridgeRouteConstants.sol";
import {getAcrossBridgeRoutes} from "./constants/AcrossBridgeRouteConstants.sol";
import {getAxelarBridgeRoutes} from "./constants/AxelarBridgeRouteConstants.sol";

bytes32 constant DEPLOY_SALT_HOP_BRIDGER = keccak256(
    "DaimoPayHopBridger-deploy2"
);

contract DeployDaimoPayHopBridger is Script {
    function run() public {
        // Hop chain is fixed to Arbitrum
        uint256 hopChainId = ARBITRUM_MAINNET;

        // Discover available routes from source -> hop using codegen route tables
        (uint256[] memory cctpV2Chains, ) = getCCTPV2BridgeRoutes(
            block.chainid
        );
        (uint256[] memory acrossChains, ) = getAcrossBridgeRoutes(
            block.chainid
        );
        (uint256[] memory axelarChains, ) = getAxelarBridgeRoutes(
            block.chainid,
            CREATE3.getDeployed(msg.sender, DEPLOY_SALT_AXELAR_BRIDGER)
        );

        // Choose first-hop bridger salt by precedence: Axelar, Across, then CCTP V2
        bytes32 bridgerSalt;
        if (containsUint(axelarChains, hopChainId)) {
            bridgerSalt = DEPLOY_SALT_AXELAR_BRIDGER;
        } else if (containsUint(acrossChains, hopChainId)) {
            bridgerSalt = DEPLOY_SALT_ACROSS_BRIDGER;
        } else if (containsUint(cctpV2Chains, hopChainId)) {
            bridgerSalt = DEPLOY_SALT_CCTP_V2_BRIDGER;
        } else {
            revert("No supported first-hop bridger for source -> Arbitrum");
        }
        address firstHopBridger = CREATE3.getDeployed(msg.sender, bridgerSalt);

        // Hop coin on Arbitrum: axlUSDC if Axelar route chosen, otherwise native USDC
        address hopCoinAddr = bridgerSalt == DEPLOY_SALT_AXELAR_BRIDGER
            ? ARBITRUM_MAINNET_AXLUSDC
            : ARBITRUM_MAINNET_USDC;
        uint256 hopCoinDecimals = 6;

        // Final chains (exclude Arbitrum)
        uint256[] memory finalChains = new uint256[](8);
        finalChains[0] = OP_MAINNET;
        finalChains[1] = BASE_MAINNET;
        finalChains[2] = POLYGON_MAINNET;
        finalChains[3] = LINEA_MAINNET;
        finalChains[4] = BSC_MAINNET;
        finalChains[5] = SCROLL_MAINNET;
        finalChains[6] = WORLDCHAIN_MAINNET;
        finalChains[7] = CELO_MAINNET;

        // Build required coin per final chain; require USDC or bridged USDC exists
        DaimoPayHopBridger.ChainCoin[]
            memory finalChainCoins = new DaimoPayHopBridger.ChainCoin[](
                finalChains.length
            );
        for (uint256 i = 0; i < finalChains.length; i++) {
            uint256 chainId = finalChains[i];
            address usdc = _getUSDCAddress(chainId);
            if (usdc == address(0)) {
                usdc = _getBridgedUSDCAddress(chainId);
            }
            require(usdc != address(0), "DPHB: missing USDC for final chain");

            uint256 decimals = 6;
            if (chainId == BSC_MAINNET && usdc == BSC_MAINNET_BRIDGED_USDC) {
                // Binance-pegged USDC on BSC uses 18 decimals
                decimals = 18;
            }

            finalChainCoins[i] = DaimoPayHopBridger.ChainCoin({
                chainId: chainId,
                addr: usdc,
                decimals: decimals
            });
        }

        vm.startBroadcast();
        address hopBridger = CREATE3.deploy(
            DEPLOY_SALT_HOP_BRIDGER,
            abi.encodePacked(
                type(DaimoPayHopBridger).creationCode,
                abi.encode(
                    hopChainId,
                    hopCoinAddr,
                    hopCoinDecimals,
                    firstHopBridger,
                    finalChainCoins
                )
            )
        );
        vm.stopBroadcast();

        console.log("hop bridger deployed:", hopBridger);
    }

    /// @dev Linear search helper: true iff value is present in arr
    function containsUint(
        uint256[] memory arr,
        uint256 value
    ) internal pure returns (bool) {
        for (uint256 i = 0; i < arr.length; i++) {
            if (arr[i] == value) return true;
        }
        return false;
    }

    // Exclude from forge coverage
    function test() public {}
}
