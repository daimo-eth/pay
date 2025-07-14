// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Global configuration registry for the Universal Address protocol.
/// @dev Upgradeable through a proxy (e.g. Transparent or UUPS) managed by
///      Daimo governance. A storage gap is reserved for future variables.
contract SharedConfig is Initializable, OwnableUpgradeable {
    // ───────────────────────────────────────────────────────────────────────────
    // Storage
    // ───────────────────────────────────────────────────────────────────────────

    /// Generic mapping from 32-byte key to an address.
    /// Suits token addresses, router contracts, or any other registry item.
    /// @dev We use a mapping instead of declaring variables for each key because
    ///      this way it's easier to handle upgradeability.
    mapping(bytes32 => address) public addr;

    /// Generic mapping from 32-byte key to a uint256.
    /// Facilitates storing numeric configuration values (min amounts, fees, etc.).
    mapping(bytes32 => uint256) public num;

    /// Stablecoin whitelist. UA contracts refuse unsupported assets and can
    /// sweep them to the "refundAddress".
    mapping(address => bool) public whitelistedStable;

    /// Global pause switch. When true, state-changing operations in UA contracts
    /// must revert. (Enforced via modifier in UA implementation contracts.)
    /// We use custom pausing logic instead of OpenZeppelin's Pausable because
    /// our use case here is slightly different and this way is cleaner.
    bool public paused;

    /// Chain-specific fixed fee (denominated in the canonical stablecoin's
    /// smallest unit, e.g. USDC 6-decimals) that can be charged to cover gas
    /// costs on each destination chain.
    /// @dev Keys are destination chain IDs (block.chainid on that chain).
    mapping(uint256 => uint256) public chainFee;

    // ───────────────────────────────────────────────────────────────────────────
    // Initializer
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Initialize the contract, setting the given owner.
    /// @param _owner Address that will control the admin functions.
    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        paused = false;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Address registry management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set an address for a given key.
    /// @param key The key to set the address for.
    /// @param value The address to set for the key.
    function setAddr(bytes32 key, address value) external onlyOwner {
        addr[key] = value;
        emit AddrSet(key, value);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Numeric values management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set a numeric config value for the given key.
    /// @param key The key to set the value for.
    /// @param value The uint256 value to assign.
    function setNum(bytes32 key, uint256 value) external onlyOwner {
        num[key] = value;
        emit NumSet(key, value);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Stablecoin whitelist management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set whether a stablecoin is whitelisted.
    /// @param token The stablecoin address.
    /// @param whitelisted Whether the stablecoin is whitelisted.
    function setWhitelistedStable(
        address token,
        bool whitelisted
    ) external onlyOwner {
        whitelistedStable[token] = whitelisted;
        emit WhitelistedStableSet(token, whitelisted);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Pause switch
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set whether the contract is paused.
    /// @param _paused Whether the contract is paused.
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Chain fee management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set the per-chain fee that will be deducted from bridged amount
    ///         to cover gas costs.
    /// @param chainId Destination chain identifier (EVM chainId).
    /// @param fee     Fee amount denominated in the canonical stablecoin’s
    ///                smallest unit (e.g. 1e6 == 1 USDC).
    function setChainFee(uint256 chainId, uint256 fee) external onlyOwner {
        chainFee[chainId] = fee;
        emit ChainFeeSet(chainId, fee);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Events
    // ───────────────────────────────────────────────────────────────────────────

    event AddrSet(bytes32 indexed key, address indexed value);
    event NumSet(bytes32 indexed key, uint256 value);
    event WhitelistedStableSet(address indexed token, bool whitelisted);
    event PausedSet(bool paused);
    event ChainFeeSet(uint256 indexed chainId, uint256 fee);

    // ───────────────────────────────────────────────────────────────────────────
    // Storage gap for upgradeability
    // ───────────────────────────────────────────────────────────────────────────

    uint256[45] private __gap;
}
