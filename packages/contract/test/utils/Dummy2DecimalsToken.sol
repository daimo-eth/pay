// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.4;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

/// @notice Fake token with 2 decimals
contract TestToken2Decimals is ERC20 {
    constructor() ERC20("Test2Dec", "T2D") {
        _mint(msg.sender, 1e12 * 1e2); // $10^12
    }

    function decimals() public pure override returns (uint8) {
        return 2;
    }
}
