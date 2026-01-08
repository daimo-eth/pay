// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

import {DepositAddressManager} from "../../src/DepositAddressManager.sol";
import {DepositAddressRoute} from "../../src/DepositAddress.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice ERC-20 that attempts to re-enter a DepositAddressManager call
///         during `transfer`.
contract ReentrantToken is ERC20 {
    DepositAddressManager public immutable mgr;
    address public immutable executor;
    bool private inAttack;

    constructor(address payable _mgr) ERC20("ReentrantToken", "evilUSDC") {
        mgr = DepositAddressManager(_mgr);
        executor = address(mgr.executor());
        _mint(msg.sender, 10_000_000e6);
    }

    // Override decimals to 6 like USDC
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        bool ok = super.transfer(to, amount);

        // Only attempt reentrancy when transferring to the executor.
        // This is when the manager is actively processing an intent.
        if (!inAttack && to == executor) {
            inAttack = true;
            // Craft dummy intent (all zeros) – will immediately fail due to
            // ReentrancyGuard before any deeper logic executes.
            DepositAddressRoute memory dummy;
            // We expect this to revert; propagate the revert to the caller so
            // the test can detect the ReentrancyGuard message.
            IERC20[] memory tokens = new IERC20[](1);
            tokens[0] = IERC20(address(0));
            mgr.refundIntent(dummy, tokens);
        }

        return ok;
    }
} 