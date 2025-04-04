// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "../src/DaimoPayAxelarBridger.sol";
import "./Constants.s.sol";

contract DeployDaimoPayAxelarBridger is Script {
    function run() public {
        address axelarGateway = _getAxelarGatewayAddress(block.chainid);
        address axelarGasService = _getAxelarGasServiceAddress(block.chainid);

        (
            uint256[] memory chainIds,
            DaimoPayAxelarBridger.AxelarBridgeRoute[] memory bridgeRoutes
        ) = _getBridgeRoutes();

        vm.startBroadcast();

        address bridger = CREATE3.deploy(
            keccak256("DaimoPayAxelarBridger-audit2"),
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

    function _getBridgeRoutes()
        private
        view
        returns (
            uint256[] memory chainIds,
            DaimoPayAxelarBridger.AxelarBridgeRoute[] memory bridgeRoutes
        )
    {
        // The bridge always gets sent to the DaimoPayAxelarBridger on the
        // destination chain.
        address axelarReceiver = CREATE3.getDeployed(
            msg.sender,
            keccak256("DaimoPayAxelarBridger-options4")
        );

        bool testnet = _isTestnet(block.chainid);
        if (testnet) {
            // Bridging not supported on testnet.
            return (
                new uint256[](0),
                new DaimoPayAxelarBridger.AxelarBridgeRoute[](0)
            );
        }

        if (
            block.chainid == ARBITRUM_MAINNET ||
            block.chainid == BASE_MAINNET ||
            block.chainid == ETH_MAINNET ||
            block.chainid == LINEA_MAINNET ||
            block.chainid == OP_MAINNET ||
            block.chainid == POLYGON_MAINNET
        ) {
            chainIds = new uint256[](2);
            bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](2);
            // ETH_MAINNET bridges USDC with Axelar instead of axlUSDC.
            string memory tokenSymbol = block.chainid == ETH_MAINNET
                ? "USDC"
                : "axlUSDC";

            chainIds[0] = BSC_MAINNET;
            chainIds[1] = MANTLE_MAINNET;

            for (uint32 i = 0; i < chainIds.length; ++i) {
                bridgeRoutes[i] = DaimoPayAxelarBridger.AxelarBridgeRoute({
                    destChainName: _getAxelarChainName(chainIds[i]),
                    bridgeTokenIn: _getAxlUsdcAddress(block.chainid),
                    bridgeTokenOut: _getAxlUsdcAddress(chainIds[i]),
                    tokenSymbol: tokenSymbol,
                    receiverContract: axelarReceiver,
                    nativeFee: _getAxelarFeeByChain(block.chainid)
                });
            }
        } else if (block.chainid == BSC_MAINNET) {
            chainIds = new uint256[](7);
            bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](7);

            chainIds[0] = ARBITRUM_MAINNET;
            chainIds[1] = BASE_MAINNET;
            chainIds[2] = ETH_MAINNET;
            chainIds[3] = LINEA_MAINNET;
            chainIds[4] = MANTLE_MAINNET;
            chainIds[5] = OP_MAINNET;
            chainIds[6] = POLYGON_MAINNET;

            for (uint32 i = 0; i < chainIds.length; ++i) {
                bridgeRoutes[i] = DaimoPayAxelarBridger.AxelarBridgeRoute({
                    destChainName: _getAxelarChainName(chainIds[i]),
                    bridgeTokenIn: _getAxlUsdcAddress(block.chainid),
                    bridgeTokenOut: _getAxlUsdcAddress(chainIds[i]),
                    tokenSymbol: "axlUSDC",
                    receiverContract: axelarReceiver,
                    nativeFee: _getAxelarFeeByChain(block.chainid)
                });
            }
        } else if (block.chainid == MANTLE_MAINNET) {
            chainIds = new uint256[](7);
            bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](7);

            chainIds[0] = ARBITRUM_MAINNET;
            chainIds[1] = BASE_MAINNET;
            chainIds[2] = BSC_MAINNET;
            chainIds[3] = ETH_MAINNET;
            chainIds[4] = LINEA_MAINNET;
            chainIds[5] = OP_MAINNET;
            chainIds[6] = POLYGON_MAINNET;

            for (uint32 i = 0; i < chainIds.length; ++i) {
                bridgeRoutes[i] = DaimoPayAxelarBridger.AxelarBridgeRoute({
                    destChainName: _getAxelarChainName(chainIds[i]),
                    bridgeTokenIn: _getAxlUsdcAddress(block.chainid),
                    bridgeTokenOut: _getAxlUsdcAddress(chainIds[i]),
                    tokenSymbol: "axlUSDC",
                    receiverContract: axelarReceiver,
                    nativeFee: _getAxelarFeeByChain(block.chainid)
                });
            }
        } else {
            revert("Unsupported chainID");
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
    }

    /**
     * Get the Axelar bridging gas fee for a given chain. The fee should be
     * approximately worth $1 USD.
     */
    function _getAxelarFeeByChain(
        uint256 chainId
    ) private pure returns (uint256) {
        if (chainId == BSC_MAINNET) {
            return 2_000_000_000_000_000; // 2 * 10^15 = 0.002 BNB
        } else if (chainId == MANTLE_MAINNET) {
            return 1_200_000_000_000_000_000; // 1.2 * 10^18 = 1.2 MNT
        } else if (chainId == POLYGON_MAINNET) {
            return 4_000_000_000_000_000_000; // 4 * 10^18 = 4 POL
        } else {
            return 500_000_000_000_000; // 5 * 10^14 = 0.0005 ETH
        }
    }

    // Exclude from forge coverage
    function test() public {}
}
