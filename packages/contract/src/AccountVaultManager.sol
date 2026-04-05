// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";

import "./AccountVaultFactory.sol";
import "./TokenUtils.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Enables optimistic fast transfers with reusable account vault
/// addresses.
/// @dev Design assumptions:
/// - This contract must not retain funds after a successful call.
/// - Debt is per vault/token pair  and is not attributed on-chain to the
///   relayer that fronted funds.
/// - All outstanding debt repays to the current global `repaymentRelayer`
///   at claim time, even if a different relayer funded fast finish.
/// - Authorized relayers are operators only. They can front funds and trigger
///   claims, but repayment always follows the shared repayment relayer.
/// - Native-token flows assume both `params.toAddress` and
///   `repaymentRelayer` can receive native token transfers.
/// WARNING: Never approve tokens directly to this contract. Never transfer
/// tokens to this contract as a standalone transaction. Such tokens can be
/// stolen by anyone. Instead:
/// - Users should only interact by sending funds to an account vault address.
/// - Relayers should transfer funds and call this contract atomically via their
///   own contracts.
contract AccountVaultManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Linked contracts
    // ---------------------------------------------------------------------

    /// Factory responsible for deploying deterministic Account Vaults.
    AccountVaultFactory public accountVaultFactory;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// Authorized relayer addresses.
    mapping(address relayer => bool authorized) public relayerAuthorized;

    /// Repayment destination for all outstanding vault debt.
    /// Changing this changes where all not-yet-repaid debt will be sent.
    address payable public repaymentRelayer;

    /// Debt outstanding for each vault/token pair.
    mapping(address accountVault => mapping(address token => uint256 debtAmount))
        public accountVaultDebt;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event RelayerAuthorized(address indexed relayer, bool authorized);

    event RepaymentRelayerUpdated(
        address indexed previousRepaymentRelayer,
        address indexed newRepaymentRelayer
    );

    event FastFinish(
        address indexed accountVault,
        address indexed operator,
        address indexed repaymentRelayer,
        AccountVaultParams params,
        IERC20 token,
        uint256 amount
    );

    event DebtRepaid(
        address indexed accountVault,
        address indexed repaymentRelayer,
        AccountVaultParams params,
        IERC20 token,
        uint256 amount
    );

    event FundsClaimed(
        address indexed accountVault,
        address indexed operator,
        AccountVaultParams params,
        IERC20 token,
        uint256 claimedAmount,
        uint256 repaidAmount,
        uint256 recipientAmount
    );

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Only allow the designated relayers to call certain functions.
    modifier onlyRelayer() {
        require(relayerAuthorized[msg.sender], "AVM: only relayer");
        _;
    }

    /// @dev Only allow the designated relayers or the user to call certain functions.
    modifier onlyRelayerOrUser(AccountVaultParams calldata params) {
        require(
            relayerAuthorized[msg.sender] || msg.sender == params.toAddress,
            "AVM: only relayer or user"
        );
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @notice Initialize the contract.
    /// @param _initialRepaymentRelayer Initial global repayment destination for
    ///        all outstanding Account Vault debt.
    constructor(
        address _owner,
        AccountVaultFactory _accountVaultFactory,
        address payable _initialRepaymentRelayer
    ) Ownable(_owner) {
        accountVaultFactory = _accountVaultFactory;
        repaymentRelayer = _initialRepaymentRelayer;
    }

    receive() external payable {
        emit NativeTransfer(msg.sender, address(this), msg.value);
    }

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Allows an authorized relayer to front funds directly to the
    ///         recipient and record equal debt against the vault/token.
    /// @dev The relayer sends their own funds to complete the fast finish
    ///      atomically before calling this function. The debt is recorded
    ///      against the vault/token.
    /// @param params  The AccountVaultParams for the account vault
    /// @param token   The token to fast finish
    function fastFinish(
        AccountVaultParams calldata params,
        IERC20 token
    ) external nonReentrant onlyRelayer {
        require(params.escrow == address(this), "AVM: wrong escrow");
        require(repaymentRelayer != address(0), "AVM: repayment relayer unset");

        uint256 amount = TokenUtils.transferBalance({
            token: token,
            recipient: payable(params.toAddress)
        });
        require(amount > 0, "AVM: zero amount");

        address accountVault = accountVaultFactory.getAccountVault(params);
        accountVaultDebt[accountVault][address(token)] += amount;

        emit FastFinish({
            accountVault: accountVault,
            operator: msg.sender,
            repaymentRelayer: repaymentRelayer,
            params: params,
            token: token,
            amount: amount
        });
    }

    /// @notice Claims the current vault balance and pays the repayment relayer
    ///         first, then the user, directly from the vault.
    /// @dev Reads the vault's current balance, repays
    ///      `min(vaultBalance, debtAmount)` to the current
    ///      `repaymentRelayer`, and sends any remainder to `params.toAddress`.
    ///      The manager does not intermediate these funds.
    /// @param params  The AccountVaultParams for the account vault
    /// @param token   The token to claim
    function claim(
        AccountVaultParams calldata params,
        IERC20 token
    ) external nonReentrant onlyRelayerOrUser(params) {
        require(params.escrow == address(this), "AVM: wrong escrow");

        // Deploy (or fetch) the account vault.
        AccountVault accountVault = accountVaultFactory.createAccountVault(
            params
        );

        uint256 claimedAmount = TokenUtils.getBalanceOf(
            token,
            address(accountVault)
        );
        require(claimedAmount > 0, "AVM: zero amount");

        uint256 debtAmount = accountVaultDebt[address(accountVault)][
            address(token)
        ];
        uint256 repaidAmount = Math.min(claimedAmount, debtAmount);
        uint256 recipientAmount = claimedAmount - repaidAmount;

        if (repaidAmount > 0) {
            require(
                repaymentRelayer != address(0),
                "AVM: repayment relayer unset"
            );
            accountVault.sendAmount({
                params: params,
                token: token,
                recipient: repaymentRelayer,
                amount: repaidAmount
            });
            accountVaultDebt[address(accountVault)][address(token)] =
                debtAmount -
                repaidAmount;
            emit DebtRepaid({
                accountVault: address(accountVault),
                repaymentRelayer: repaymentRelayer,
                params: params,
                token: token,
                amount: repaidAmount
            });
        }

        if (recipientAmount > 0) {
            accountVault.sendAmount({
                params: params,
                token: token,
                recipient: payable(params.toAddress),
                amount: recipientAmount
            });
        }

        emit FundsClaimed({
            accountVault: address(accountVault),
            operator: msg.sender,
            params: params,
            token: token,
            claimedAmount: claimedAmount,
            repaidAmount: repaidAmount,
            recipientAmount: recipientAmount
        });
    }

    // ---------------------------------------------------------------------
    // Admin functions
    // ---------------------------------------------------------------------

    /// @notice Set the repayment relayer.
    /// @param newRepaymentRelayer The new repayment relayer
    function setRepaymentRelayer(
        address payable newRepaymentRelayer
    ) external onlyOwner {
        require(newRepaymentRelayer != address(0), "AVM: zero address");

        address previousRepaymentRelayer = repaymentRelayer;
        if (previousRepaymentRelayer != newRepaymentRelayer) {
            repaymentRelayer = newRepaymentRelayer;
            emit RepaymentRelayerUpdated({
                previousRepaymentRelayer: previousRepaymentRelayer,
                newRepaymentRelayer: newRepaymentRelayer
            });
        }
    }

    /// @notice Add or remove relayers from the authorized list.
    /// @param relayers The relayers to add or remove
    /// @param authorized Whether the relayers are authorized
    function configureRelayers(
        address[] calldata relayers,
        bool[] calldata authorized
    ) external onlyOwner {
        require(
            relayers.length == authorized.length,
            "AVM: relayer and authorized length mismatch"
        );

        for (uint256 i = 0; i < relayers.length; ++i) {
            relayerAuthorized[relayers[i]] = authorized[i];
            emit RelayerAuthorized({
                relayer: relayers[i],
                authorized: authorized[i]
            });
        }
    }
}
