// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {UniversalAddressRoute} from "../UniversalAddress.sol";
import {Call} from "../DaimoPayExecutor.sol";
import {TokenAmount} from "../TokenUtils.sol";

/// @notice Minimal interface for UniversalAddressManager used by relayers and other contracts.
interface IUniversalAddressManager {
    /// @notice Fast-finish a Universal Address' bridging operation on the destination chain.
    /// @param route           The route parameters (destination chain, token, recipient, etc.)
    /// @param calls           Arbitrary calls executed by the manager (e.g., swaps)
    /// @param token           The token being provided by the relayer
    /// @param bridgeTokenOut  The stablecoin and amount that will eventually be bridged in
    /// @param relaySalt       Unique salt provided by the relayer to avoid replay attacks
    /// @param sourceChainId   The chain ID the bridging operation was started on
    function fastFinishIntent(
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        IERC20 token,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external;
}
