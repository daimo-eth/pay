// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/cryptography/ECDSA.sol";
import "openzeppelin-contracts/contracts/utils/cryptography/MessageHashUtils.sol";

import "./interfaces/IDaimoPayPricer.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Validates price data signatures from a trusted signer.
contract DaimoPayPricer is IDaimoPayPricer {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    /// @notice The trusted signer address that signs price data
    address public immutable trustedSigner;

    /// @notice Maximum age of price data in seconds before it's considered stale
    uint256 public immutable maxPriceAge;

    constructor(address _trustedSigner, uint256 _maxPriceAge) {
        require(_trustedSigner != address(0), "Invalid signer address");
        require(_maxPriceAge > 0, "Invalid max price age");
        trustedSigner = _trustedSigner;
        maxPriceAge = _maxPriceAge;
    }

    /// @inheritdoc IDaimoPayPricer
    function validatePrice(
        PriceData calldata priceData
    ) external view returns (bool) {
        // Check that the price is not stale
        if (block.timestamp > priceData.timestamp + maxPriceAge) {
            return false;
        }

        // Create the message hash from the price data
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                priceData.token,
                priceData.priceUsd,
                priceData.timestamp,
                block.chainid
            )
        );

        // Convert to Ethereum signed message hash (EIP-191)
        bytes32 ethSignedMessageHash = messageHash.toEthSignedMessageHash();

        // Recover the signer from the signature
        address recoveredSigner = ethSignedMessageHash.recover(
            priceData.signature
        );

        // Verify the recovered signer matches the trusted signer
        return recoveredSigner == trustedSigner;
    }
}
