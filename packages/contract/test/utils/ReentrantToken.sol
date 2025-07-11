// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

import {UniversalAddressManager} from "../../src/UniversalAddressManager.sol";
import {UAIntent} from "../../src/UAIntent.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice ERC-20 that attempts to re-enter a UniversalAddressManager call
///         during `transfer`.
contract ReentrantToken is ERC20 {
    UniversalAddressManager public immutable mgr;
    bool private inAttack;

    constructor(address payable _mgr) ERC20("ReentrantToken", "evilUSDC") {
        mgr = UniversalAddressManager(_mgr);
        _mint(msg.sender, 10_000_000e6);
    }

    // Override decimals to 6 like USDC
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool ok = super.transfer(to, amount);

        // Only attempt reentrancy the first time mgr transfers tokens to executor.
        if (!inAttack && msg.sender == address(mgr)) {
            inAttack = true;
            // Craft dummy intent (all zeros) – will immediately fail due to
            // ReentrancyGuard before any deeper logic executes.
            UAIntent memory dummy;
            IERC20[] memory empty = new IERC20[](0);
            // We expect this to revert; propagate the revert to the caller so
            // the test can detect the ReentrancyGuard message.
            mgr.refundIntent(dummy, empty);
        }

        return ok;
    }
} 