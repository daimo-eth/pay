// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../TokenUtils.sol";

/// @notice Simplified bridger interface that wraps existing IDaimoPayBridger adapters
///         but removes the TokenAmount[] complexity for callers.
interface IUniversalAddressBridger {
    /// @notice Quote: "what do I have to put in so that a USD-stable shows up?"
    /// @param toChainId       Destination chain id
    /// @param bridgeTokenOut  The stablecoin token and amount to receive on the destination chain
    /// @return bridgeTokenIn  The asset that must be provided on the source chain
    /// @return inAmount       The exact quantity of tokenIn that must be provided
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount calldata bridgeTokenOut
    ) external view returns (address bridgeTokenIn, uint256 inAmount);

    /// @notice Execute the bridge. Reverts if the adapter cannot deliver at least
    ///         bridgeTokenOut.amount of the destination stablecoin.
    /// @param toChainId  Destination chain id
    /// @param toAddress  Recipient address on the destination chain
    /// @param bridgeTokenOut   The stablecoin token and amount to receive on the destination chain
    /// @param extraData  Adapter-specific calldata forwarded verbatim
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount calldata bridgeTokenOut,
        bytes calldata extraData
    ) external;
}
