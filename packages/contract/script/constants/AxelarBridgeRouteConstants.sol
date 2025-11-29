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
    // Source chain 8453
    if (sourceChainId == 8453) {
        chainIds = new uint256[](1);
        bridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](1);

        // 8453 -> 42220
        chainIds[0] = 42220;
        bridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "celo",
            bridgeTokenIn: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            bridgeTokenOut: 0xEB466342C4d449BC9f53A865D5Cb90586f405215,
            tokenSymbol: "axlUSDC",
            receiverContract: axelarReceiver,
            nativeFee: 500000000000000
        });

        return (chainIds, bridgeRoutes);
    }

    // If source chain not found, return empty arrays
    return (new uint256[](0), new DaimoPayAxelarBridger.AxelarBridgeRoute[](0));
}
