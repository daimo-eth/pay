// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../TokenUtils.sol";

/// @notice Simplified bridging interface for the Deposit Address system
///         that multiplexes between multiple bridge-specific adapters (e.g.
///         CCTP, Across, Axelar).
interface IDepositAddressBridger {
    /// @notice Returns the bridge output token for the given destination chain ID.
    /// @param toChainId The destination chain ID
    /// @return stableOut The bridge output token
    function chainIdToStableOut(
        uint256 toChainId
    ) external view returns (address stableOut);

    /// @notice Fetches a quote: what do I have to send in so that $x shows up
    ///         on the destination?
    /// @param toChainId       Destination chain
    /// @param bridgeTokenOut  The stablecoin token and amount to receive on
    ///                        the destination chain
    /// @return bridgeTokenIn  The asset that must be provided on the source
    ///                        chain
    /// @return inAmount       The exact quantity of bridgeTokenIn that must be
    ///                        provided
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount calldata bridgeTokenOut
    ) external view returns (address bridgeTokenIn, uint256 inAmount);

    /// @notice Execute the bridge. Reverts if the adapter can't deliver the
    ///         specified destination amount.
    /// @param toChainId       Destination chain id
    /// @param toAddress       Recipient address on the destination chain
    /// @param bridgeTokenOut  The stablecoin token and amount to receive on
    ///                        the destination chain
    /// @param refundAddress   Address to send funds to if the bridge fails
    /// @param extraData       Adapter-specific calldata
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount calldata bridgeTokenOut,
        address refundAddress,
        bytes calldata extraData
    ) external;
}
