// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {Call} from "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";

/// @notice Parameters that uniquely identify a Universal Address.
struct UniversalAddressRoute {
    uint256 toChainId; // Destination chain
    IERC20 toToken; // Destination stablecoin
    address toAddress; // Beneficiary wallet on destination chain
    address refundAddress; // Recipient for unsupported assets on any chain
    address escrow; // IUniversalAddressManager escrow contract
}

/// @notice Calculate the deterministic hash committed to by the Universal
///         Address.
function calcRouteHash(
    UniversalAddressRoute calldata route
) pure returns (bytes32) {
    return keccak256(abi.encode(route));
}

/// @author Daimo, Inc
/// @notice Minimal vault contract that holds funds for a single cross-chain
///         transfer route, enabling deterministic fund custody across chains.
/// @dev Stateless design with only a fixed route hash allows cheap deployment
///      via proxy clones and reuse across multiple chains. Funds are held
///      securely until the Universal Address Manager orchestrates their release
///      for swaps, bridging, or refunds. Each vault is uniquely tied to a
///      specific route and can only be controlled by its designated escrow.
contract UniversalAddress is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @dev Cheap single-slot storage – keccak256(UniversalAddressRoute).
    bytes32 public routeHash;

    // ---------------------------------------------------------------------
    // Constructor / Initializer
    // ---------------------------------------------------------------------

    constructor() {
        _disableInitializers();
    }

    /// @param _routeHash keccak256(UniversalAddressRoute) committed by the factory.
    function initialize(bytes32 _routeHash) public initializer {
        routeHash = _routeHash;
    }

    // ---------------------------------------------------------------------
    // Escrow helpers – only callable by the escrow/manager
    // ---------------------------------------------------------------------

    /// @notice Transfers a specified amount of tokens from the vault to a
    ///         designated recipient, callable only by the authorized escrow.
    /// @param route       The UniversalAddressRoute that this vault was created for
    /// @param tokenAmount The token and amount to transfer from the vault
    /// @param recipient   The address to receive the transferred tokens
    function sendAmount(
        UniversalAddressRoute calldata route,
        TokenAmount calldata tokenAmount,
        address payable recipient
    ) public nonReentrant {
        require(calcRouteHash(route) == routeHash, "UA: route mismatch");
        require(msg.sender == route.escrow, "UA: only escrow");
        TokenUtils.transfer({
            token: tokenAmount.token,
            recipient: recipient,
            amount: tokenAmount.amount
        });
    }

    /// Accept native chain asset (e.g. ETH) deposits
    receive() external payable {}
}
