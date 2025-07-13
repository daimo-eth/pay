// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import {Call} from "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";

/// Represents an intended call: "make X of token Y show up on chain Z,
/// then [optionally] use it to do an arbitrary contract call".
struct PayIntent {
    /// Intent only executes on given target chain.
    uint256 toChainId;
    /// Possible output tokens after bridging to the destination chain.
    /// Currently, native token is not supported as a bridge token output.
    TokenAmount[] bridgeTokenOutOptions;
    /// Expected token amount after swapping on the destination chain.
    TokenAmount finalCallToken;
    /// Contract call to execute on the destination chain. If finalCall.data is
    /// empty, the tokens are transferred to finalCall.to. Otherwise, (token,
    /// amount) is approved to finalCall.to and finalCall.to is called with
    /// finalCall.data and finalCall.value.
    Call finalCall;
    /// Escrow contract. All calls are made through this contract.
    address payable escrow;
    /// Bridger contract.
    IDaimoPayBridger bridger;
    /// Address to refund tokens if call fails, or zero.
    address refundAddress;
    /// Nonce. PayIntent receiving addresses are one-time use.
    uint256 nonce;
    /// Timestamp after which intent expires and can be refunded
    uint256 expirationTimestamp;
}

/// Calculates the intent hash of a PayIntent struct.
function calcIntentHash(PayIntent calldata intent) pure returns (bytes32) {
    return keccak256(abi.encode(intent));
}

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice This is an ephemeral intent contract. Any supported tokens sent to
/// this address on any supported chain are forwarded, via a combination of
/// bridging and swapping, into a specified call on a destination chain.
contract PayIntentContract is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// Save gas by minimizing storage to a single word. This makes intents
    /// usable on L1. intentHash = keccak(abi.encode(PayIntent))
    bytes32 intentHash;

    /// Runs at deploy time. Singleton implementation contract = no init,
    /// no state. All other methods are called via proxy.
    constructor() {
        _disableInitializers();
    }

    function initialize(bytes32 _intentHash) public initializer {
        intentHash = _intentHash;
    }

    /// Send tokens to a recipient.
    function sendTokens(
        PayIntent calldata intent,
        IERC20[] calldata tokens,
        address payable recipient
    ) public nonReentrant returns (uint256[] memory amounts) {
        require(calcIntentHash(intent) == intentHash, "PI: intent");
        require(msg.sender == intent.escrow, "PI: only escrow");

        uint256 n = tokens.length;
        amounts = new uint256[](n);
        // Send tokens to recipient
        for (uint256 i = 0; i < n; ++i) {
            amounts[i] = TokenUtils.transferBalance({
                token: tokens[i],
                recipient: recipient
            });
        }
    }

    /// Check that at least one of the token amounts is present. Assumes exactly
    /// one token is present, then sends the token to a recipient.
    function checkBalanceAndSendTokens(
        PayIntent calldata intent,
        TokenAmount[] calldata tokenAmounts,
        address payable recipient
    ) public nonReentrant {
        require(calcIntentHash(intent) == intentHash, "PI: intent");
        require(msg.sender == intent.escrow, "PI: only escrow");

        // Check that at least one of the token amounts is present.
        uint256 tokenIndex = TokenUtils.checkBalance({
            tokenAmounts: tokenAmounts
        });
        require(tokenIndex < tokenAmounts.length, "PI: insufficient balance");

        // Transfer the token amount to the recipient.
        TokenUtils.transfer({
            token: tokenAmounts[tokenIndex].token,
            recipient: recipient,
            amount: tokenAmounts[tokenIndex].amount
        });
    }

    /// Accept native-token (eg ETH) inputs
    receive() external payable {}
}
