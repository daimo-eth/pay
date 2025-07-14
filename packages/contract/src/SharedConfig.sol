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

    /// Chain-specific fixed fee (denominated in the canonical stablecoin's
    /// smallest unit, e.g. USDC's 6 decimals) that can be charged to cover gas
    /// costs on each destination chain.
    /// @dev Keys are destination chain IDs (block.chainid on that chain).
    mapping(uint256 => uint256) public chainFee;

    // ───────────────────────────────────────────────────────────────────────────
    // Initializer
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Initialize the contract, setting the given owner.
    function initialize(address _owner) public initializer {
        __Ownable_init(_owner);
    }

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
    // Stable-coin whitelist management
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
    // Chain fee management
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Set the per-chain fee, denominated in the canonical stablecoin's // TODO: which?
    ///         units, that will be deducted from bridged amount to cover gas.
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
