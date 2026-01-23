// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Adapter for depositing tokens to a recipient on behalf of a caller.
/// @dev Intended to be used by the DepositAddressManager to deposit tokens to
///      a recipient as the recipient of the deposit.
contract DummyDepositAdapter {
    using SafeERC20 for IERC20;

    constructor() {}

    /// @notice Deposit tokens to a recipient on behalf of a caller.
    /// @dev Caller must approve this contract to spend the token before calling.
    /// @param recipient The address to send tokens to
    /// @param token The token to deposit
    function deposit(address recipient, IERC20 token) external {
        // Pull the full approved amount from caller
        uint256 amount = token.allowance(msg.sender, address(this));
        require(amount > 0, "DAD: no allowance");
        token.safeTransferFrom(msg.sender, recipient, amount);
    }
}
