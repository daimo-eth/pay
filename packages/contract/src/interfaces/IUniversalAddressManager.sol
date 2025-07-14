// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {UniversalAddressRoute} from "../UniversalAddress.sol";
import {Call} from "../DaimoPayExecutor.sol";
import {TokenAmount} from "../TokenUtils.sol";

/// @notice Minimal interface for UniversalAddressManager used by relayers and other contracts.
interface IUniversalAddressManager {
    function refundIntent(
        UniversalAddressRoute calldata route,
        IERC20 token
    ) external;

    function sameChainFinishIntent(
        UniversalAddressRoute calldata route,
        IERC20 paymentToken,
        uint256 toAmount,
        Call[] calldata calls
    ) external;

    function fastFinishIntent(
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        IERC20 token,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external;

    function claimIntent(
        UniversalAddressRoute calldata route,
        Call[] calldata calls,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external;
}
