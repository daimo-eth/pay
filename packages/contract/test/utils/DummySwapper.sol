// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title DummySwapper
/// @notice mock swap contract for testing
contract DummySwapper {
    using SafeERC20 for IERC20;

    /// fund this contract with tokens first, then UniversalAddress will call
    /// "swap" to pull the "amount" into itself
    function swap(IERC20 token, address recipient, uint256 amount) external {
        token.safeTransfer(recipient, amount);
    }

    /// allow receiving native token if needed
    receive() external payable {}
}
