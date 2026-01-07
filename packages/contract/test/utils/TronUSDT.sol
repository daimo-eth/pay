// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Mock TRC20-USDT that mimics the observed behavior on Tron mainnet:
///         transfer() and transferFrom() return false (0) even on success.
///         This breaks SafeERC20 which reverts on false return values.
contract TronUSDT is ERC20 {
    constructor() ERC20("Tether USD", "USDT") {
        _mint(msg.sender, 1e12); // $1,000,000
    }

    function decimals() public pure virtual override returns (uint8) {
        return 6;
    }

    /// @notice Override transfer to return false even on success (like TRC20-USDT)
    function transfer(
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address owner = _msgSender();
        _transfer(owner, to, amount);
        return false; // TRC20-USDT quirk: returns false on success
    }

    /// @notice Override transferFrom to return false even on success
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public virtual override returns (bool) {
        address spender = _msgSender();
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return false; // TRC20-USDT quirk: returns false on success
    }

    /// @notice Mint tokens for testing
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
