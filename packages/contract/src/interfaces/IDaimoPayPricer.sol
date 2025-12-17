// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "../TokenUtils.sol";

struct PriceData {
    address token;
    uint256 priceUsd; // price of token in USD with 18 decimals
    uint256 timestamp;
    bytes signature;
}

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Validates price data signature is from a trusted source.
interface IDaimoPayPricer {
    /// Validate the signature of the price data comes from a trusted source.
    function validatePrice(
        PriceData calldata priceData
    ) external view returns (bool);
}
