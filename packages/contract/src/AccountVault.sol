// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import "./TokenUtils.sol";

/// @notice Parameters that uniquely identify an Account Vault.
struct AccountVaultParams {
    /// Destination address to forward funds in the vault to
    address toAddress;
    /// AccountVaultManager escrow contract
    address escrow;
}

/// @notice Calculate the deterministic hash committed to by the Account Vault.
function calcAccountVaultParamsHash(
    AccountVaultParams calldata params
) pure returns (bytes32) {
    return keccak256(abi.encode(params));
}

/// @author Daimo, Inc
/// @notice Minimal contract that holds funds for a recipient address,
///         enabling coordination between a relayer and recipient.
/// @dev Stateless design with only a fixed param hash allows cheap deployment
///      via proxy clones and reuse across multiple chains. Funds are held
///      securely until the Account Vault Manager orchestrates their release
///      for optimistic fast transfers or regular transfers. Each account vault
///      is uniquely tied to a specific set of AccountVaultParams and can only
///      be controlled by its designated escrow. The vault is the only place
///      that should temporarily hold claimable funds; the manager should not
///      sweep or warehouse balances.
contract AccountVault is Initializable, ReentrancyGuard {
    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @dev Cheap single-slot storage – keccak256(AccountVaultParams).
    bytes32 public paramHash;

    // ---------------------------------------------------------------------
    // Constructor / Initializer
    // ---------------------------------------------------------------------

    constructor() {
        _disableInitializers();
    }

    /// Accept native chain asset (e.g. ETH) transfers
    receive() external payable {
        emit NativeTransfer(msg.sender, address(this), msg.value);
    }

    /// @param _paramHash keccak256(AccountVaultParams) committed by the factory.
    function initialize(bytes32 _paramHash) public initializer {
        paramHash = _paramHash;

        // Emit event for any native token that arrived before deployment
        if (address(this).balance > 0) {
            emit NativeTransfer(
                address(0),
                address(this),
                address(this).balance
            );
        }
    }

    // ---------------------------------------------------------------------
    // Escrow helpers – only callable by the escrow
    // ---------------------------------------------------------------------

    /// @notice Transfers an exact amount of a token from the vault to a
    ///         designated recipient. Callable only by the authorized escrow.
    /// @dev This helper intentionally avoids whole-balance sweeps so the
    ///      manager can pay the repayment relayer and user directly from the
    ///      vault in separate exact amounts.
    /// @param params      The AccountVaultParams that this vault was created for
    /// @param token       The token to transfer from the vault
    /// @param recipient   The recipient to receive the funds
    /// @param amount      The exact amount to transfer from the vault
    function sendAmount(
        AccountVaultParams calldata params,
        IERC20 token,
        address payable recipient,
        uint256 amount
    ) external nonReentrant {
        require(
            calcAccountVaultParamsHash(params) == paramHash,
            "AV: params mismatch"
        );
        require(msg.sender == params.escrow, "AV: only escrow");
        TokenUtils.transfer({
            token: token,
            recipient: recipient,
            amount: amount
        });
    }
}
