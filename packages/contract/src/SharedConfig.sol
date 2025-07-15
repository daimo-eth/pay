// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Centralized configuration registry that manages protocol-wide
///         settings for the Universal Address system.
/// @dev Provides shared configuration for minimum amounts, token whitelists,
///      contract addresses, and emergency pause controls. Upgradeable through
///      UUPS proxy pattern with Daimo governance control. Other UA contracts
///      reference this for consistent behavior across the protocol.
contract SharedConfig is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // ───────────────────────────────────────────────────────────────────────────
    // Storage
    // ───────────────────────────────────────────────────────────────────────────

    /// Generic mapping from 32-byte key to an address.
    /// Suits token addresses, router contracts, or any other registry item.
    mapping(bytes32 => address) public addr;

    /// Generic mapping from 32-byte key to a uint256.
    /// Facilitates storing numeric configuration values (min amounts, fees, etc).
    mapping(bytes32 => uint256) public num;

    /// Stablecoin whitelist. UA contracts refund unsupported assets.
    mapping(address => bool) public whitelistedStable;

    /// Global pause switch. When true, state-changing operations in UA contracts
    /// must revert. (Enforced via modifier in UA implementation contracts.)
    /// @dev We use custom logic instead of OpenZeppelin's Pausable for simplicity
    bool public paused;

    // ───────────────────────────────────────────────────────────────────────────
    // Initializer
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Initialize the contract, setting the given owner.
    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();
    }

    /// @dev Disable direct initialization on the implementation.
    constructor() {
        _disableInitializers();
    }

    // ---------------------------------------------------------------------
    // UUPS upgrade authorization
    // ---------------------------------------------------------------------

    /// @dev Restrict upgrades to the contract owner.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // ───────────────────────────────────────────────────────────────────────────
    // Address registry management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set an address for a given key.
    function setAddr(bytes32 key, address value) external onlyOwner {
        addr[key] = value;
        emit AddrSet(key, value);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Numeric values management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set a numeric config value for the given key.
    function setNum(bytes32 key, uint256 value) external onlyOwner {
        num[key] = value;
        emit NumSet(key, value);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Stablecoin whitelist management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set whether a stablecoin is whitelisted.
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

    /// @notice Set whether Universal Addresses are paused.
    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit PausedSet(_paused);
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Events
    // ───────────────────────────────────────────────────────────────────────────

    event AddrSet(bytes32 indexed key, address indexed value);
    event NumSet(bytes32 indexed key, uint256 value);
    event WhitelistedStableSet(address indexed token, bool whitelisted);
    event PausedSet(bool paused);

    // ───────────────────────────────────────────────────────────────────────────
    // Storage gap for upgradeability
    // ───────────────────────────────────────────────────────────────────────────

    uint256[50] private __gap;
}
