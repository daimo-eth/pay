// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";

import "./TokenUtils.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @title SwapMath
/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Pure mathematical functions for computing swap outputs based on
///         USD price feeds. All functions are stateless and overflow-safe.
library SwapMath {
    /// @notice Compute the amount of buy token that can be purchased with a
    ///         given amount of sell token, based on USD prices and slippage.
    /// @dev Formula:
    ///      buyAmount = (sellAmount / 10^sellDecimals * sellPriceUsd)
    ///                  / buyPriceUsd * 10^buyDecimals
    ///                  * (10_000 - maxSlippage) / 10_000
    ///
    ///      Simplified to minimize rounding errors:
    ///      buyAmount = (sellAmount * sellPriceUsd * (10_000 - maxSlippage) * 10^buyDecimals)
    ///                  / (buyPriceUsd * 10_000 * 10^sellDecimals)
    ///
    /// @param sellTokenPrice Price data for the token being sold
    /// @param buyTokenPrice Price data for the token being bought
    /// @param sellAmount Amount of sell token (in token's native decimals)
    /// @param maxSlippage Maximum slippage in basis points (e.g., 50 = 0.5%)
    /// @return TokenAmount struct containing the buy token and computed amount
    function computeMinSwapOutput(
        PriceData memory sellTokenPrice,
        PriceData memory buyTokenPrice,
        uint256 sellAmount,
        uint256 maxSlippage
    ) public view returns (TokenAmount memory) {
        require(maxSlippage <= 10_000, "SwapMath: slippage > 100%");
        require(sellTokenPrice.priceUsd > 0, "SwapMath: sell price zero");
        require(buyTokenPrice.priceUsd > 0, "SwapMath: buy price zero");

        uint256 sellDecimals = _getDecimals(sellTokenPrice.token);
        uint256 buyDecimals = _getDecimals(buyTokenPrice.token);

        // Calculate: numerator = sellAmount * sellPriceUsd * (10_000 - maxSlippage) * 10^buyDecimals
        // Calculate: denominator = buyPriceUsd * 10_000 * 10^sellDecimals
        // Result: buyAmount = numerator / denominator

        uint256 slippageFactor = 10_000 - maxSlippage;

        // To avoid overflow, we do multiplication in stages and use mulDiv where possible
        // For now, implement straightforward version with overflow protection
        uint256 buyAmount;

        // Calculate intermediate value: sellAmount * sellPriceUsd
        uint256 sellValueUsd = sellAmount * sellTokenPrice.priceUsd;

        // Apply slippage: sellValueUsd * (10_000 - maxSlippage)
        uint256 sellValueWithSlippage = sellValueUsd * slippageFactor;

        // Adjust for decimals and divide by buy price
        // buyAmount = (sellValueWithSlippage * 10^buyDecimals) / (buyPriceUsd * 10_000 * 10^sellDecimals)
        if (buyDecimals >= sellDecimals) {
            uint256 decimalDiff = buyDecimals - sellDecimals;
            uint256 numerator = sellValueWithSlippage * (10 ** decimalDiff);
            uint256 denominator = buyTokenPrice.priceUsd * 10_000;
            buyAmount = numerator / denominator;
        } else {
            uint256 decimalDiff = sellDecimals - buyDecimals;
            uint256 denominator = buyTokenPrice.priceUsd *
                10_000 *
                (10 ** decimalDiff);
            buyAmount = sellValueWithSlippage / denominator;
        }

        return
            TokenAmount({
                token: IERC20(buyTokenPrice.token),
                amount: buyAmount
            });
    }

    /// @notice Get decimals for a token, handling native token (address 0)
    /// @param token The token address
    /// @return decimals 18 for native tokens, otherwise from IERC20Metadata
    function _getDecimals(address token) private view returns (uint256) {
        if (token == address(0)) {
            return 18; // native tokens (ETH, POL, etc.) use 18 decimals
        }
        return IERC20Metadata(token).decimals();
    }
}
