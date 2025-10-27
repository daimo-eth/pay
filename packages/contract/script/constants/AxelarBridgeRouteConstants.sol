// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../../src/DaimoPayAxelarBridger.sol";

// @title AxelarBridgeRouteConstants
// @notice Auto-generated constants for Axelar bridge routes

// Return all Axelar bridge routes for the given source chain.
// Configures bridged tokens to be sent to the provided axelarReceiver
// address on the destination chain.
function getAxelarBridgeRoutes(
    uint256 sourceChainId,
    address axelarReceiver
)
    pure
    returns (
        uint256[] memory chainIds,
        DaimoPayAxelarBridger.AxelarBridgeRoute[] memory bridgeRoutes
    )
{
    // Source chain 1
    if (sourceChainId == 1) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 1 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "USDC",
            receiverContract: axelarReceiver,
            nativeFee: 500000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 10
    if (sourceChainId == 10) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 10 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 500000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 56
    if (sourceChainId == 56) {
        chainIds = new uint256[](7);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](7);

        // 56 -> 1
        chainIds[0] = 1;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "ethereum",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });
        // 56 -> 10
        chainIds[1] = 10;
        bridgeRoutes[1] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "optimism",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });
        // 56 -> 137
        chainIds[2] = 137;
        bridgeRoutes[2] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "polygon",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });
        // 56 -> 8453
        chainIds[3] = 8453;
        bridgeRoutes[3] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "base",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });
        // 56 -> 42161
        chainIds[4] = 42161;
        bridgeRoutes[4] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "arbitrum",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });
        // 56 -> 42220
        chainIds[5] = 42220;
        bridgeRoutes[5] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "celo",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });
        // 56 -> 59144
        chainIds[6] = 59144;
        bridgeRoutes[6] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "linea",
            bridgeTokenIn: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            bridgeTokenOut: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 2000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 137
    if (sourceChainId == 137) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 137 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 4000000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 8453 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 500000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42161
    if (sourceChainId == 42161) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 42161 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 500000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 42220
    if (sourceChainId == 42220) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 42220 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 4000000000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // Source chain 59144
    if (sourceChainId == 59144) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 59144 -> 56
        chainIds[0] = 56;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            bridgeTokenOut: 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 500000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAxelarBridger.AxelarBridgeRoute[](0));
}
