// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

/// @notice Simplified bridger interface that wraps existing IDaimoPayBridger adapters
///         but removes the TokenAmount[] complexity for callers.
interface IUniversalAddressBridger {
    /// @notice Quote: "what do I have to put in so that a USD-stable shows up?"
    /// @param toChainId   Destination chain id
    /// @param desiredOut  Minimum stablecoin amount the caller wishes to receive on the destination
    /// @return tokenIn    The asset that must be provided on the source chain
    /// @return exactIn    The exact quantity of tokenIn that must be provided
    function quoteIn(
        uint256 toChainId,
        uint256 desiredOut
    ) external view returns (address tokenIn, uint256 exactIn);

    /// @notice Execute the bridge. Reverts if the adapter cannot deliver at least
    ///         minOut units of the destination stablecoin.
    /// @param toChainId   Destination chain id
    /// @param toAddress   Recipient address on the destination chain
    /// @param minOut      Minimal amount of stablecoin that must arrive on the destination
    /// @param extra       Adapter-specific calldata forwarded verbatim
    function bridge(
        uint256 toChainId,
        address toAddress,
        uint256 minOut,
        bytes calldata extra
    ) external;
} 