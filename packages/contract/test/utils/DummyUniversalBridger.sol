// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {IUniversalAddressBridger} from "../../src/interfaces/IUniversalAddressBridger.sol";

/// @title DummyUniversalBridger
/// @notice Minimal in-memory implementation of the IUniversalAddressBridger used exclusively in Foundry tests.
///         It simply transfers `minOut` units of `outToken` from the caller to the destination address and
///         echoes the parameters via an event. No real bridging is performed.
contract DummyUniversalBridger is IUniversalAddressBridger {
    using SafeERC20 for IERC20;

    event BridgeExecuted(uint256 toChainId, address toAddr, address token, uint256 amount);

    // ---------------------------------------------------------------------
    // IUniversalAddressBridger
    // ---------------------------------------------------------------------

    function quoteIn(uint256 toChainId, IERC20 outToken, uint256 desiredOut)
        external
        view
        override
        returns (address tokenIn, uint256 exactIn)
    {
        // For testing we pretend the bridge asset equals the destination asset
        // and exactIn == desiredOut.
        tokenIn = address(outToken);
        exactIn = desiredOut;
    }

    function bridge(uint256 toChainId, address toAddress, IERC20 outToken, uint256 minOut, bytes calldata)
        external
        override
    {
        // Pull funds from caller (typically the UniversalAddressManager which has pre-approved us).
        outToken.safeTransferFrom(msg.sender, toAddress, minOut);
        emit BridgeExecuted(toChainId, toAddress, address(outToken), minOut);
    }
}
