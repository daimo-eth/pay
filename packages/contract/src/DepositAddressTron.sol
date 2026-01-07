// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {DepositAddressRoute, calcRouteHash} from "./DepositAddress.sol";
import {TokenAmount, NativeTransfer} from "./TokenUtils.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Tron-specific vault that handles TRC20-USDT's non-standard transfer.
///         Uses balance-diff measurement instead of SafeERC20 to handle tokens
///         that return false on successful transfer.
contract DepositAddressTron is Initializable, ReentrancyGuard {
    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @dev Cheap single-slot storage – keccak256(DepositAddressRoute).
    bytes32 public routeHash;

    // ---------------------------------------------------------------------
    // Constructor / Initializer
    // ---------------------------------------------------------------------

    constructor() {
        _disableInitializers();
    }

    /// Accept native chain asset (e.g. TRX) deposits
    receive() external payable {
        emit NativeTransfer(msg.sender, address(this), msg.value);
    }

    /// @param _routeHash keccak256(DepositAddressRoute) committed by the manager.
    function initialize(bytes32 _routeHash) public initializer {
        routeHash = _routeHash;

        // Emit event for any TRX that arrived before deployment
        if (address(this).balance > 0) {
            emit NativeTransfer(
                address(0),
                address(this),
                address(this).balance
            );
        }
    }

    // ---------------------------------------------------------------------
    // Escrow helpers – only callable by the escrow/manager
    // ---------------------------------------------------------------------

    /// @notice Transfers the balance of a token from the vault to a
    ///         designated recipient. Callable only by the authorized escrow.
    /// @dev Uses balance-diff measurement to handle TRC20-USDT which returns
    ///      false even on successful transfers. This is robust against any
    ///      token behavior - we directly report how much the recipient received.
    /// @param route       The DepositAddressRoute that this vault was created for
    /// @param token       The token to transfer from the vault
    /// @param recipient   The address to receive the transferred tokens
    /// @return The amount actually received by the recipient
    function sendBalance(
        DepositAddressRoute calldata route,
        IERC20 token,
        address payable recipient
    ) public nonReentrant returns (uint256) {
        require(calcRouteHash(route) == routeHash, "DA: route mismatch");
        require(msg.sender == route.escrow, "DA: only escrow");

        if (address(token) == address(0)) {
            // Native token (TRX)
            uint256 balance = address(this).balance;
            if (balance > 0) {
                (bool success, ) = recipient.call{value: balance}("");
                require(success, "DA: TRX transfer failed");
            }
            return balance;
        } else {
            // ERC20/TRC20 token
            uint256 vaultBalance = token.balanceOf(address(this));
            if (vaultBalance == 0) {
                return 0;
            }

            // Measure recipient balance before
            uint256 recipientBefore = token.balanceOf(recipient);

            // Raw transfer - ignore return value (TRC20-USDT returns false on success)
            // solhint-disable-next-line avoid-low-level-calls
            (bool success, ) = address(token).call(
                abi.encodeWithSelector(
                    IERC20.transfer.selector,
                    recipient,
                    vaultBalance
                )
            );
            // We don't check success because TRC20-USDT may return false
            // even when the transfer succeeds. Instead, we measure the balance diff.
            
            // Suppress unused variable warning
            success;

            // Measure recipient balance after
            uint256 recipientAfter = token.balanceOf(recipient);

            // Return actual amount received
            uint256 received = recipientAfter - recipientBefore;
            require(received > 0, "DA: transfer failed");
            return received;
        }
    }
}
