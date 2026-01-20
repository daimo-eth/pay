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

/// Event emitted when native tokens (ETH, etc.) are transferred
event NativeTransfer(address indexed from, address indexed to, uint256 value);

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
            token.forceApprove({spender: spender, value: amount});
        } // Do nothing for native token.
    }

    /// Sends an ERC20 or ETH transfer. For ETH, verify call success.
    function transfer(
        IERC20 token,
        address payable recipient,
        uint256 amount
    ) internal {
        if (recipient == address(this)) return; // No-op: tokens already here
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
        address payable recipient,
        uint256 amount
    ) internal returns (bool) {
        if (recipient == address(this)) return true; // No-op: tokens already here
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

    /// Check that the address has enough of at least one of the tokenAmounts.
    /// Returns the index of the first token that has sufficient balance, or
    /// the length of the tokenAmounts array if no token has sufficient balance.
    function checkBalance(
        TokenAmount[] calldata tokenAmounts
    ) internal view returns (uint256) {
        uint256 n = tokenAmounts.length;
        for (uint256 i = 0; i < n; ++i) {
            TokenAmount calldata tokenAmount = tokenAmounts[i];
            uint256 balance = getBalanceOf({
                token: tokenAmount.token,
                addr: address(this)
            });
            if (balance >= tokenAmount.amount) {
                return i;
            }
        }
        return n;
    }

    /// @notice Converts a token amount between different decimal representations.
    /// @param amount The token amount in the source decimal format.
    /// @param fromDecimals Decimals of the source token (e.g., 6 for USDC).
    /// @param toDecimals Decimals of the destination token (e.g., 18 for DAI).
    /// @param roundUp If true, rounds up when scaling down (losing precision).
    ///        Use true when calculating required input amounts (user pays more).
    ///        Use false when calculating output amounts (user receives less).
    /// @return The converted amount in the destination decimal format.
    function convertTokenAmountDecimals(
        uint256 amount,
        uint256 fromDecimals,
        uint256 toDecimals,
        bool roundUp
    ) internal pure returns (uint256) {
        if (toDecimals == fromDecimals) {
            return amount;
        } else if (toDecimals > fromDecimals) {
            return amount * 10 ** (toDecimals - fromDecimals);
        } else {
            uint256 decimalDiff = fromDecimals - toDecimals;
            uint256 divisor = 10 ** decimalDiff;
            if (roundUp) {
                return (amount + divisor - 1) / divisor;
            } else {
                return amount / divisor;
            }
        }
    }
}
