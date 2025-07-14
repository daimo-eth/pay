// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {Call} from "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";

/// @notice Parameters that uniquely identify a Universal Address intent.
/// Each time a relayer bridges funds accumulated in a UA, it creates a new
/// intent for that transfer. Each one can be fast-finished and claimed.
struct UAIntent {
    uint256 toChainId; // Destination chain
    IERC20 toToken; // Destination stablecoin
    address toAddress; // Beneficiary wallet on destination chain
    address refundAddress; // Recipient for unsupported assets on any chain
    address escrow; // IUniversalAddressManager escrow contract
}

/// @notice Calculate the deterministic hash committed to by the intent vault.
function calcIntentHash(UAIntent calldata intent) pure returns (bytes32) {
    return keccak256(abi.encode(intent));
}

/// @author Daimo, Inc
/// @notice Minimal vault that holds funds for a single UAIntent. It holds no
///         mutable state beyond the fixed intent hash, so it can be deployed
///         cheaply via a proxy clone and reused across chains.
contract UAIntentContract is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// @dev Cheap single-slot storage – keccak256(UAIntent).
    bytes32 public intentHash;

    // ---------------------------------------------------------------------
    // Constructor / Initializer
    // ---------------------------------------------------------------------

    constructor() {
        _disableInitializers();
    }

    /// @param _intentHash keccak256(UAIntent) committed by the factory.
    function initialize(bytes32 _intentHash) public initializer {
        intentHash = _intentHash;
    }

    // ---------------------------------------------------------------------
    // Escrow helpers – only callable by the escrow/manager
    // ---------------------------------------------------------------------

    /// @notice Sweep specified token amount out of the vault.
    function sendAmount(
        UAIntent calldata intent,
        TokenAmount calldata tokenAmount,
        address payable recipient
    ) public nonReentrant {
        require(calcIntentHash(intent) == intentHash, "UAI: intent mismatch");
        require(msg.sender == intent.escrow, "UAI: only escrow");
        TokenUtils.transfer({
            token: tokenAmount.token,
            recipient: recipient,
            amount: tokenAmount.amount
        });
    }

    /// Accept native chain asset (e.g. ETH) deposits
    receive() external payable {}
}
