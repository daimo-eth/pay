// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {TokenAmount} from "./TokenUtils.sol";
import {Call} from "./DaimoPayExecutor.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Tron-specific executor that handles TRC20-USDT's non-standard transfer.
///         Uses balance-diff measurement instead of SafeERC20.
contract DaimoPayExecutorTron is ReentrancyGuard {
    /// The only address that is allowed to call the `execute` function.
    address public immutable escrow;

    constructor(address _escrow) {
        escrow = _escrow;
    }

    /// Execute arbitrary calls. Revert if any fail.
    /// Check that at least one of the expectedOutput tokens is present. Assumes
    /// that exactly one token is present and transfers it to the recipient.
    /// Returns any surplus tokens to the surplus recipient.
    function execute(
        Call[] calldata calls,
        TokenAmount[] calldata expectedOutput,
        address payable recipient,
        address payable surplusRecipient
    ) external nonReentrant {
        require(msg.sender == escrow, "DPCE: only escrow");

        // Execute provided calls.
        uint256 callsLength = calls.length;
        for (uint256 i = 0; i < callsLength; ++i) {
            Call calldata call = calls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPCE: call failed");
        }

        // Check that at least one of the expectedOutput tokens is present
        // with enough balance.
        uint256 outputIndex = type(uint256).max;
        for (uint256 i = 0; i < expectedOutput.length; ++i) {
            uint256 balance = _getBalance(expectedOutput[i].token);
            if (balance >= expectedOutput[i].amount) {
                outputIndex = i;
                break;
            }
        }
        require(outputIndex < expectedOutput.length, "DPCE: insufficient output");

        IERC20 token = expectedOutput[outputIndex].token;
        uint256 amount = expectedOutput[outputIndex].amount;

        // Transfer the expected amount to the recipient using raw call
        _rawTransfer(token, recipient, amount);

        // Transfer any surplus to the surplus recipient
        uint256 surplus = _getBalance(token);
        if (surplus > 0) {
            _rawTransfer(token, surplusRecipient, surplus);
        }
    }

    /// Execute arbitrary calls. Revert if any fail.
    /// Verify output token balance meets the expected minimum amount.
    /// Transfer the full balance to the recipient and return the amount.
    function executeAndSweep(
        Call[] calldata calls,
        TokenAmount calldata minOutputAmount,
        address payable recipient
    ) external nonReentrant returns (uint256 outputAmount) {
        require(msg.sender == escrow, "DPCE: only escrow");

        // Execute provided calls.
        uint256 callsLength = calls.length;
        for (uint256 i = 0; i < callsLength; ++i) {
            Call calldata call = calls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPCE: call failed");
        }

        outputAmount = _getBalance(minOutputAmount.token);
        require(outputAmount >= minOutputAmount.amount, "DPCE: output below min");

        // Transfer the full balance to the recipient
        _rawTransfer(minOutputAmount.token, recipient, outputAmount);
    }

    /// Execute a final call. Approve the final token and make the call.
    /// Return whether the call succeeded.
    function executeFinalCall(
        Call calldata finalCall,
        TokenAmount calldata finalCallToken,
        address payable refundAddr
    ) external nonReentrant returns (bool success) {
        require(msg.sender == escrow, "DPCE: only escrow");

        // Approve the final call token to the final call contract.
        _rawApprove(finalCallToken.token, finalCall.to, finalCallToken.amount);

        // Then, execute the final call.
        (success, ) = finalCall.to.call{value: finalCall.value}(finalCall.data);

        // Send any excess funds to the refund address.
        uint256 balance = _getBalance(finalCallToken.token);
        if (balance > 0) {
            _rawTransfer(finalCallToken.token, refundAddr, balance);
        }
    }

    /// Accept native-token (eg TRX) inputs
    receive() external payable {}

    // -------------------------------------------------------------------------
    // Internal helpers - raw calls that don't check return value
    // -------------------------------------------------------------------------

    function _getBalance(IERC20 token) internal view returns (uint256) {
        if (address(token) == address(0)) {
            return address(this).balance;
        }
        return token.balanceOf(address(this));
    }

    /// @dev Raw transfer that verifies via balance diff (for TRC20-USDT)
    function _rawTransfer(
        IERC20 token,
        address recipient,
        uint256 amount
    ) internal {
        if (address(token) == address(0)) {
            // Native token (TRX)
            (bool success, ) = recipient.call{value: amount}("");
            require(success, "DPCE: TRX transfer failed");
        } else {
            // ERC20/TRC20 - use balance diff for verification
            uint256 recipientBefore = token.balanceOf(recipient);

            // Raw call - ignore return value
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = address(token).call(
                abi.encodeWithSelector(IERC20.transfer.selector, recipient, amount)
            );
            require(success, "DPCE: transfer call failed");

            // Verify via balance change
            uint256 recipientAfter = token.balanceOf(recipient);
            require(
                recipientAfter >= recipientBefore + amount,
                "DPCE: transfer failed"
            );
        }
    }

    /// @dev Raw approve - TRC20-USDT approve works normally
    function _rawApprove(
        IERC20 token,
        address spender,
        uint256 amount
    ) internal {
        // solhint-disable-next-line avoid-low-level-calls
        (bool success, ) = address(token).call(
            abi.encodeWithSelector(IERC20.approve.selector, spender, amount)
        );
        require(success, "DPCE: approve failed");
    }
}
