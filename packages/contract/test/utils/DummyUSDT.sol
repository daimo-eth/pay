// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice mock USDT for testing
contract TestUSDT is ERC20 {
    constructor() ERC20("testUSDT", "USDT") {
        _mint(msg.sender, 1e12);
    }

    function decimals() public pure virtual override returns (uint8) {
        return 6;
    }
}
