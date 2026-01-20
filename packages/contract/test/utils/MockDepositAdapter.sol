// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Mock adapter for testing finalCall functionality.
/// @dev Uses approve-and-pull pattern.
contract MockDepositAdapter {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;

    // Track deposits for test assertions
    address public lastRecipient;
    uint256 public lastAmount;
    uint32 public lastDestinationDex;
    uint256 public depositCount;

    constructor(IERC20 _token) {
        token = _token;
    }

    /// @notice Simulates a deposit by pulling the full approved amount.
    function deposit(address recipient, uint32 destinationDex) external {
        // Pull the full approved amount from caller
        uint256 amount = token.allowance(msg.sender, address(this));
        require(amount > 0, "MockAdapter: no allowance");
        token.safeTransferFrom(msg.sender, address(this), amount);

        lastRecipient = recipient;
        lastAmount = amount;
        lastDestinationDex = destinationDex;
        depositCount++;

        // In a real adapter, tokens would go to the protocol.
        // Here we just keep them for test assertions.
    }
}

/// @notice Mock adapter that only uses part of the tokens.
/// @dev Simulates scenarios where the protocol uses less than the full amount
///      (e.g., minimum deposit amounts, rounding, partial fills).
contract PartialDepositAdapter {
    using SafeERC20 for IERC20;

    IERC20 public immutable token;
    uint256 public immutable usePercentBps; // e.g., 5000 = 50%

    address public lastRecipient;
    uint256 public lastAmountUsed;
    uint256 public lastAmountReturned;

    constructor(IERC20 _token, uint256 _usePercentBps) {
        token = _token;
        usePercentBps = _usePercentBps;
    }

    function deposit(address recipient, uint32) external {
        // Pull the full approved amount from caller
        uint256 amount = token.allowance(msg.sender, address(this));
        require(amount > 0, "PartialAdapter: no allowance");
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Use only a portion of the tokens
        uint256 amountToUse = (amount * usePercentBps) / 10_000;
        uint256 amountToReturn = amount - amountToUse;

        lastRecipient = recipient;
        lastAmountUsed = amountToUse;
        lastAmountReturned = amountToReturn;

        // Return unused tokens to caller
        if (amountToReturn > 0) {
            token.safeTransfer(msg.sender, amountToReturn);
        }

        // In a real adapter, amountToUse would go to the protocol.
        // Here we just keep it for test assertions.
    }
}
