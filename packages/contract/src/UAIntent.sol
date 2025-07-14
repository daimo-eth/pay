// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {Call} from "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";

/// @notice Parameters that uniquely identify a Universal-Address intent.
/// @dev Keep the struct intentionally minimal – additional hooks (e.g. finalCall)
///      can be appended later by reserving slots in the hash recipe.
struct UAIntent {
    uint256 toChainId; // Destination chain where funds will settle
    IERC20 toToken; // Canonical stablecoin on destination chain
    address toAddress; // Beneficiary wallet on destination chain
    address refundAddress; // Sweep target for stray / unsupported assets
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
    // Gatekeep withdrawal functionality to a single manager. All calls are made through this contract.
    address public escrow;

    // ---------------------------------------------------------------------
    // Constructor / Initializer
    // ---------------------------------------------------------------------

    constructor() {
        _disableInitializers();
    }

    /// @param _intentHash keccak256(UAIntent) committed by the factory.
    function initialize(
        bytes32 _intentHash,
        address _escrow
    ) public initializer {
        intentHash = _intentHash;
        escrow = _escrow;
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
        require(msg.sender == escrow, "UAI: only escrow");
        TokenUtils.transfer({
            token: tokenAmount.token,
            recipient: recipient,
            amount: tokenAmount.amount
        });
    }

    /// @notice Sweep the full balance of specified tokens out of the vault.
    /// @return amounts Amounts transferred (parallel to `tokens`).
    function sendBalances(
        UAIntent calldata intent,
        IERC20[] calldata tokens,
        address payable recipient
    ) public nonReentrant returns (uint256[] memory amounts) {
        require(calcIntentHash(intent) == intentHash, "UAI: intent mismatch");
        require(msg.sender == escrow, "UAI: only escrow");
        uint256 n = tokens.length;
        amounts = new uint256[](n);
        for (uint256 i; i < n; ++i) {
            amounts[i] = TokenUtils.transferBalance({
                token: tokens[i],
                recipient: recipient
            });
        }
    }

    /// Accept native chain asset (e.g. ETH) deposits
    receive() external payable {}
}
