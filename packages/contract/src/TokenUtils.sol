// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

/// Asset amount, e.g. $100 USDC or 0.1 ETH
struct TokenAmount {
    /// Zero address = native asset, e.g. ETH
    IERC20 token;
    uint256 amount;
}

/// Represents a destination address + optional arbitrary contract call
struct Call {
    /// Destination receiving address or contract
    address to;
    /// Native token amount for call, or 0
    uint256 value;
    /// Calldata for call, or empty = no contract call
    bytes data;
}

/// Utility functions that work for both ERC20 and native tokens.
library TokenUtils {
    using SafeERC20 for IERC20;

    /// Returns ERC20 or ETH balance.
    function getBalanceOf(
        IERC20 token,
        address addr
    ) internal view returns (uint256) {
        if (address(token) == address(0)) {
            return addr.balance;
        } else {
            return token.balanceOf(addr);
        }
    }

    /// Approves a token transfer.
    function approve(IERC20 token, address spender, uint256 amount) internal {
        if (address(token) != address(0)) {
            token.approve({spender: spender, value: amount});
        } // Do nothing for native token.
    }

    /// Sends an ERC20 or ETH transfer. For ETH, verify call success.
    function transfer(
        IERC20 token,
        address payable recipient,
        uint256 amount
    ) internal {
        if (address(token) != address(0)) {
            token.safeTransfer({to: recipient, value: amount});
        } else {
            // Native token transfer
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "TokenUtils: ETH transfer failed");
        }
    }

    /// Sends an ERC20 or ETH transfer. Returns true if successful.
    function tryTransfer(
        IERC20 token,
        address recipient,
        uint256 amount
    ) internal returns (bool) {
        if (address(token) != address(0)) {
            return token.trySafeTransfer({to: recipient, value: amount});
        } else {
            (bool success, ) = recipient.call{value: amount}("");
            return success;
        }
    }

    /// Sends an ERC20 transfer.
    function transferFrom(
        IERC20 token,
        address from,
        address to,
        uint256 amount
    ) internal {
        require(
            address(token) != address(0),
            "TokenUtils: ETH transferFrom must be caller"
        );
        token.safeTransferFrom({from: from, to: to, value: amount});
    }

    /// Sends any token balance in the contract to the recipient.
    function transferBalance(
        IERC20 token,
        address payable recipient
    ) internal returns (uint256) {
        uint256 balance = getBalanceOf({token: token, addr: address(this)});
        if (balance > 0) {
            transfer({token: token, recipient: recipient, amount: balance});
        }
        return balance;
    }
}
