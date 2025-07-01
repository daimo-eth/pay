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

    /// Stablecoin allow-list. UA contracts refuse unsupported assets and can
    /// sweep them to the "refundAddress".
    mapping(address => bool) public allowedStable;

    /// Global pause switch. When true, state-changing operations in UA contracts
    /// must revert. (Enforced via modifier in UA implementation contracts.)
    /// We use custom pausing logic instead of OpenZeppelin's Pausable because
    /// our use case here is slightly different and this way is cleaner.
    bool public paused;

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
    // Stable-coin allow-list management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set whether a stablecoin is allowed.
    /// @param token The stablecoin address.
    /// @param allowed Whether the stablecoin is allowed.
    function setAllowedStable(address token, bool allowed) external onlyOwner {
        allowedStable[token] = allowed;
        emit AllowedStableSet(token, allowed);
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
    // Events
    // ───────────────────────────────────────────────────────────────────────────

    event AddrSet(bytes32 indexed key, address indexed value);
    event AllowedStableSet(address indexed token, bool allowed);
    event PausedSet(bool paused);

    // ───────────────────────────────────────────────────────────────────────────
    // Storage gap for upgradeability
    // ───────────────────────────────────────────────────────────────────────────

    uint256[45] private __gap;
}
