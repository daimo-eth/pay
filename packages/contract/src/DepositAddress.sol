// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {Call} from "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./interfaces/IUniversalAddressBridger.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @notice Parameters that uniquely identify a Deposit Address.
struct DepositAddressRoute {
    uint256 toChainId; // Dest chain
    IERC20 toToken; // Final token received on dest chain
    address toAddress; // Beneficiary address on dest chain
    address refundAddress; // Recipient for refunds
    address escrow; // DepositAddressManager escrow contract
    IUniversalAddressBridger bridger; // UniversalAddressBridger contract
    IDaimoPayPricer pricer; // DaimoPayPricer contract
    uint256 maxStartSlippageBps; // Maximum slippage allowed on starts
    uint256 maxFinishSlippageBps; // Maximum slippage allowed on finishes
}

/// @notice Parameters that uniquely identify a single intent (cross-chain
///         transfer) for a Deposit Address.
struct DepositAddressIntent {
    address depositAddress; // The Deposit Address contract for this intent
    bytes32 relaySalt; // Unique salt provided by the relayer
    TokenAmount bridgeTokenOut; // Address and amount of token bridged to dest
    uint256 sourceChainId; // Chain ID where the bridge transfer originated
}

/// @notice Calculate the deterministic hash committed to by the Deposit Address
function calcRouteHash(
    DepositAddressRoute calldata route
) pure returns (bytes32) {
    return keccak256(abi.encode(route));
}

/// @author Daimo, Inc
/// @notice Minimal vault contract that holds funds for a cross-chain deposit
///         route, enabling deterministic address across chains.
/// @dev Stateless design with only a fixed route hash allows cheap deployment
///      via proxy clones and reuse across multiple chains. Funds are held
///      securely until the Universal Address Manager orchestrates their release
///      for swaps, bridging, or refunds. Each vault is uniquely tied to a
///      specific route and can only be controlled by its designated escrow.
contract DepositAddress is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

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

    /// Accept native chain asset (e.g. ETH) deposits
    receive() external payable {
        emit NativeTransfer(msg.sender, address(this), msg.value);
    }

    /// @param _routeHash keccak256(DepositAddressRoute) committed by the factory.
    function initialize(bytes32 _routeHash) public initializer {
        routeHash = _routeHash;

        // Emit event for any ETH that arrived before deployment
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
    /// @param route       The DepositAddressRoute that this vault was created for
    /// @param token       The token to transfer from the vault
    /// @param recipient   The address to receive the transferred tokens
    function sendBalance(
        DepositAddressRoute calldata route,
        IERC20 token,
        address payable recipient
    ) public nonReentrant returns (uint256) {
        require(calcRouteHash(route) == routeHash, "DA: route mismatch");
        require(msg.sender == route.escrow, "DA: only escrow");

        return TokenUtils.transferBalance({token: token, recipient: recipient});
    }
}
