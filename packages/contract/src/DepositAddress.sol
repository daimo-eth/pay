// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import "./TokenUtils.sol";
import "./interfaces/IDepositAddressBridger.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @notice Parameters that uniquely identify a Deposit Address.
struct DepositAddressRoute {
    /// Destination chain
    uint256 toChainId;
    /// Final token received on destination chain
    IERC20 toToken;
    /// Destination address. If finalCallData is empty, tokens are transferred
    /// here. Otherwise, tokens are transferred here and a call is made with
    /// finalCallData (e.g., toAddress is an adapter contract).
    address toAddress;
    /// Recipient for refunds
    address refundAddress;
    /// Optional calldata to execute on toAddress after swapping to toToken.
    /// If empty, tokens are simply transferred to toAddress.
    bytes finalCallData;
    /// DepositAddressManager escrow contract
    address escrow;
    /// DepositAddressBridger contract
    IDepositAddressBridger bridger;
    /// DaimoPayPricer contract
    IDaimoPayPricer pricer;
    /// Maximum slippage allowed on starts. Expected slippage from token sent
    /// by the user to the bridge token.
    uint256 maxStartSlippageBps;
    /// Maximum slippage allowed on fast finishes. Expected slippage from bridge
    /// token to final token.
    uint256 maxFastFinishSlippageBps;
    /// Maximum slippage allowed on same chain finishes. Expected slippage from
    /// payment token to final token.
    uint256 maxSameChainFinishSlippageBps;
    /// Timestamp after which the deposit address expires and can be refunded
    uint256 expiresAt;
}

/// @notice Parameters that uniquely identify a single intent (cross-chain
///         transfer) for a Deposit Address.
struct DepositAddressFulfillment {
    /// The Deposit Address contract for this intent
    address depositAddress;
    /// Unique salt/nonce provided by the relayer
    bytes32 relaySalt;
    /// Address and amount of token bridged to destination chain
    TokenAmount bridgeTokenOut;
    /// Chain ID where the bridge transfer originated
    uint256 sourceChainId;
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
