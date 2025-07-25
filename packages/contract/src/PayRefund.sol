// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/proxy/utils/Initializable.sol";

import "./TokenUtils.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Minimalist refund contract owned by an EIP-712 signer.
contract PayRefund is Initializable {
    /// The owner EOA, which signs messages.
    address public owner;

    /// The owner chain ID.
    uint256 public ownerChainId;

    /// The Safe on which the owner is a signer, or 0x00...ß
    address public safeAddress;

    /// Incrementing nonce for this refund.
    uint256 public nonce;

    /// Runs at deploy time. Singleton implementation contract = no init,
    /// no state. All other methods are called via proxy.
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _owner,
        uint256 _ownerChainId,
        address _safeAddress
    ) public initializer {
        owner = _owner;
        ownerChainId = _ownerChainId;
        safeAddress = _safeAddress;
    }

    /// Send tokens to a recipient.
    function sendToken(
        IERC20 token,
        address payable recipient,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) public {
        bytes32 DOMAIN_SEPARATOR_TYPEHASH = keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );
        bytes32 REFUND_TYPEHASH = keccak256(
            "Refund(address token,address recipient,uint256 nonce)"
        );

        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_SEPARATOR_TYPEHASH,
                keccak256(bytes("PayRefund")),
                keccak256(bytes("1")),
                ownerChainId,
                address(this)
            )
        );

        bytes32 structHash = keccak256(
            abi.encode(REFUND_TYPEHASH, address(token), recipient, nonce)
        );
        nonce++;

        bytes32 messageHash = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );

        bool isValid = validSignature(
            owner,
            ownerChainId,
            safeAddress,
            messageHash,
            r,
            s,
            v
        );
        require(isValid, "PR: invalid signature");

        TokenUtils.transferBalance(token, recipient);
    }

    function validSignature(
        address signer,
        uint256 chainId,
        address safe,
        // EIP-191 or EIP-712 message hash
        bytes32 dataHash,
        bytes32 r,
        bytes32 s,
        uint8 v
    ) public pure returns (bool) {
        // Create envelope
        bytes32 DOMAIN_SEPARATOR_TYPEHASH = keccak256(
            "EIP712Domain(uint256 chainId,address verifyingContract)"
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(DOMAIN_SEPARATOR_TYPEHASH, chainId, safe)
        );

        // See https://github.com/safe-global/safe-smart-account/blob/main/contracts/handler/CompatibilityFallbackHandler.sol#L51
        bytes32 SAFE_MSG_TYPEHASH = keccak256("SafeMessage(bytes message)");
        bytes32 safeMessageHash = keccak256(
            abi.encode(SAFE_MSG_TYPEHASH, keccak256(abi.encode(dataHash)))
        );

        bytes memory messageData = abi.encodePacked(
            "\x19\x01",
            domainSeparator,
            safeMessageHash
        );
        bytes32 messageHash = keccak256(messageData);

        address recovered = ecrecover(messageHash, v, r, s);

        return recovered == signer;
    }

    /// Accept native-token (eg ETH) inputs
    receive() external payable {}
}
