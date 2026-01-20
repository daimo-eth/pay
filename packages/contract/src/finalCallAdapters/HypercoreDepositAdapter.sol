// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

interface ICoreDepositWallet {
    /**
     * @notice Deposits tokens to credit a specific recipient on Hypercore.
     * @param recipient The address receiving the tokens on HyperCore.
     * @param amount The amount of tokens being deposited.
     * @param destinationDex The destination dex on HyperCore (0 for default Core Perps dex, uint32.max for Core Spot dex.)
     */
    function depositFor(
        address recipient,
        uint256 amount,
        uint32 destinationDex
    ) external;
}

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Adapter for depositing to Hypercore via CoreDepositWallet.
/// @dev Intended to be used by the DepositAddressManager to deposit tokens to
///      Hypercore as the recipient of the deposit.
contract HypercoreDepositAdapter {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    ICoreDepositWallet public immutable coreDepositWallet;

    constructor(IERC20 _usdc, address _coreDepositWallet) {
        usdc = _usdc;
        coreDepositWallet = ICoreDepositWallet(_coreDepositWallet);
    }

    /// @notice Deposit to Hypercore on behalf of a recipient.
    /// @dev Caller must approve this contract to spend USDC before calling.
    ///      Pulls the full approved amount from the caller.
    /// @param recipient The address to credit on HyperCore
    /// @param destinationDex 0 = perps DEX, type(uint32).max = spot DEX
    function deposit(address recipient, uint32 destinationDex) external {
        // Pull the full approved amount from caller
        uint256 amount = usdc.allowance(msg.sender, address(this));
        require(amount > 0, "HDA: no allowance");
        usdc.safeTransferFrom(msg.sender, address(this), amount);

        // Approve and deposit to Hypercore
        usdc.forceApprove(address(coreDepositWallet), amount);
        coreDepositWallet.depositFor(recipient, amount, destinationDex);
    }
}
