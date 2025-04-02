// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
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
    /// If finalCall.data is empty, the tokens are transferred to finalCall.to.
    /// Otherwise, (token, amount) is approved to finalCall.to and finalCall.to
    /// is called with finalCall.data and finalCall.value.
    Call finalCall;
    /// Escrow contract. All calls are made through this contract.
    address payable escrow;
    /// Bridger contract.
    IDaimoPayBridger bridger;
    /// Address to refund tokens if call fails, or zero.
    address refundAddress;
    /// Nonce. PayIntent receiving addresses are one-time use.
    uint256 nonce;
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

    /// Check if the contract has enough balance for at least one of the bridge
    /// token output options.
    function checkBridgeTokenOutBalance(
        TokenAmount[] calldata bridgeTokenOutOptions
    ) public view returns (bool) {
        bool balanceOk = false;
        for (uint256 i = 0; i < bridgeTokenOutOptions.length; ++i) {
            TokenAmount calldata tokenOut = bridgeTokenOutOptions[i];
            uint256 balance = tokenOut.token.balanceOf(address(this));
            if (balance >= tokenOut.amount) {
                balanceOk = true;
                break;
            }
        }
        return balanceOk;
    }

    /// Called on the source chain to start the intent. Run the calls specified
    /// by the relayer, then send funds to the bridger for cross-chain intents.
    function start(
        PayIntent calldata intent,
        address payable caller,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) public nonReentrant {
        require(calcIntentHash(intent) == intentHash, "PI: intent");
        require(msg.sender == intent.escrow, "PI: only escrow");

        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary.
        for (uint256 i = 0; i < calls.length; ++i) {
            Call calldata call = calls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "PI: swap call failed");
        }

        if (intent.toChainId == block.chainid) {
            // Same chain. Check that the contract has sufficient token balance.
            bool balanceOk = checkBridgeTokenOutBalance(
                intent.bridgeTokenOutOptions
            );
            require(balanceOk, "PI: insufficient token");
        } else {
            // Different chains. Get the input token and amount required to
            // initiate bridging
            IDaimoPayBridger bridger = intent.bridger;
            (address bridgeTokenIn, uint256 inAmount) = bridger
                .getBridgeTokenIn({
                    toChainId: intent.toChainId,
                    bridgeTokenOutOptions: intent.bridgeTokenOutOptions
                });

            uint256 balance = IERC20(bridgeTokenIn).balanceOf(address(this));
            require(balance >= inAmount, "PI: insufficient bridge token");

            // Approve bridger and initiate bridging
            IERC20(bridgeTokenIn).forceApprove({
                spender: address(bridger),
                value: inAmount
            });
            bridger.sendToChain({
                toChainId: intent.toChainId,
                toAddress: address(this),
                bridgeTokenOutOptions: intent.bridgeTokenOutOptions,
                extraData: bridgeExtraData
            });

            // Refund any leftover tokens in the contract to the caller
            TokenUtils.transferBalance({
                token: IERC20(bridgeTokenIn),
                recipient: caller
            });
        }
    }

    /// Check that there is sufficient output token and send tokens to the
    /// escrow contract.
    function claim(PayIntent calldata intent) public nonReentrant {
        require(keccak256(abi.encode(intent)) == intentHash, "PI: intent");
        require(msg.sender == intent.escrow, "PI: only escrow");
        require(block.chainid == intent.toChainId, "PI: only dest chain");

        bool balanceOk = checkBridgeTokenOutBalance(
            intent.bridgeTokenOutOptions
        );
        require(balanceOk, "PI: insufficient token received");

        // Send to escrow contract, which will forward to current recipient
        uint256 n = intent.bridgeTokenOutOptions.length;
        for (uint256 i = 0; i < n; ++i) {
            TokenUtils.transferBalance({
                token: intent.bridgeTokenOutOptions[i].token,
                recipient: intent.escrow
            });
        }
    }

    /// Refund double payments.
    function refund(
        PayIntent calldata intent,
        IERC20 token
    ) public nonReentrant returns (uint256 amount) {
        require(calcIntentHash(intent) == intentHash, "PI: intent");
        require(msg.sender == intent.escrow, "PI: only escrow");

        // Send to escrow contract, which will forward to the refund address.
        amount = TokenUtils.transferBalance({
            token: token,
            recipient: intent.escrow
        });
        require(amount > 0, "PI: no funds to refund");
    }

    /// Accept native-token (eg ETH) inputs
    receive() external payable {}
}
