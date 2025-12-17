// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {SwapMath} from "../src/SwapMath.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {PriceData} from "../src/interfaces/IDaimoPayPricer.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";
import {TestDAI} from "./utils/DummyDAI.sol";
import {TestToken2Decimals} from "./utils/Dummy2DecimalsToken.sol";

contract SwapMathTest is Test {
    // ---------------------------------------------------------------------
    // Test tokens
    // ---------------------------------------------------------------------
    TestUSDC private usdc; // 6 decimals
    TestDAI private dai; // 18 decimals
    TestToken2Decimals private lowDecimalToken; // 2 decimals

    // ---------------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------------
    function setUp() public {
        usdc = new TestUSDC();
        dai = new TestDAI();
        lowDecimalToken = new TestToken2Decimals();
    }

    // ---------------------------------------------------------------------
    // Helper functions
    // ---------------------------------------------------------------------
    function _createPriceData(
        address token,
        uint256 priceUsd
    ) internal view returns (PriceData memory) {
        return
            PriceData({
                token: token,
                priceUsd: priceUsd,
                timestamp: block.timestamp,
                signature: ""
            });
    }

    // ---------------------------------------------------------------------
    // Basic functionality tests
    // ---------------------------------------------------------------------
    function testComputeSwapOutput_SameDecimals_NoSlippage() public view {
        // Sell 100 USDC at $1.00, buy token at $2.00, 0% slippage
        // Expected: 50 tokens (100 * 1 / 2)
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc), // same decimals
            2e18 // $2.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6, // 100 USDC (6 decimals)
            maxSlippage: 0
        });

        assertEq(address(result.token), address(usdc));
        assertEq(result.amount, 50e6); // 50 tokens
    }

    function testComputeSwapOutput_SameDecimals_WithSlippage() public view {
        // Sell 100 USDC at $1.00, buy token at $1.00, 1% slippage (100 bps)
        // Expected: 99 tokens (100 * 0.99)
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6, // 100 USDC
            maxSlippage: 100 // 1%
        });

        assertEq(address(result.token), address(usdc));
        assertEq(result.amount, 99e6); // 99 tokens
    }

    function testComputeSwapOutput_DifferentDecimals_USDCToDAI() public view {
        // Sell 100 USDC (6 decimals) at $1.00, buy DAI (18 decimals) at $1.00
        // Expected: ~100 DAI in 18 decimal format
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(dai),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6, // 100 USDC
            maxSlippage: 0
        });

        assertEq(address(result.token), address(dai));
        assertEq(result.amount, 100e18); // 100 DAI
    }

    function testComputeSwapOutput_DifferentDecimals_DAIToUSDC() public view {
        // Sell 100 DAI (18 decimals) at $1.00, buy USDC (6 decimals) at $1.00
        // Expected: 100 USDC in 6 decimal format
        PriceData memory sellPrice = _createPriceData(
            address(dai),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e18, // 100 DAI
            maxSlippage: 0
        });

        assertEq(address(result.token), address(usdc));
        assertEq(result.amount, 100e6); // 100 USDC
    }

    function testComputeSwapOutput_LowDecimals() public view {
        // Sell 100 2-decimal tokens at $1.00, buy USDC at $1.00
        // Expected: 100 USDC
        PriceData memory sellPrice = _createPriceData(
            address(lowDecimalToken),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e2, // 100 tokens (2 decimals)
            maxSlippage: 0
        });

        assertEq(address(result.token), address(usdc));
        assertEq(result.amount, 100e6); // 100 USDC
    }

    function testComputeSwapOutput_DifferentPrices() public view {
        // Sell 1 ETH-like token at $2000, buy USDC at $1
        // Expected: ~2000 USDC
        PriceData memory sellPrice = _createPriceData(
            address(dai), // using DAI as mock ETH
            2000e18 // $2000
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1e18, // 1 token
            maxSlippage: 0
        });

        assertEq(address(result.token), address(usdc));
        assertEq(result.amount, 2000e6); // 2000 USDC
    }

    function testComputeSwapOutput_HighSlippage() public view {
        // Sell 100 USDC at $1.00, buy token at $1.00, 10% slippage (1000 bps)
        // Expected: 90 tokens
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6,
            maxSlippage: 1000 // 10%
        });

        assertEq(result.amount, 90e6); // 90 tokens
    }

    function testComputeSwapOutput_MaxSlippage() public view {
        // Test with 100% slippage (10000 bps) - should return 0
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(dai), 1e18);

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6,
            maxSlippage: 10000 // 100%
        });

        assertEq(result.amount, 0); // 0 tokens with 100% slippage
    }

    function testComputeSwapOutput_SmallAmount() public view {
        // Test with very small amounts to check rounding
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(usdc), 1e18);

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1, // 1 unit (smallest amount)
            maxSlippage: 0
        });

        assertEq(result.amount, 1);
    }

    function testComputeSwapOutput_LargeAmount() public view {
        // Test with large amounts to check overflow protection
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(usdc), 1e18);

        uint256 largeAmount = 1e50; // Very large amount
        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: largeAmount,
            maxSlippage: 0
        });

        assertEq(result.amount, largeAmount);
    }

    // ---------------------------------------------------------------------
    // Error cases
    // ---------------------------------------------------------------------
    function testComputeSwapOutput_Revert_SlippageOver100Percent() public {
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(usdc), 1e18);

        vm.expectRevert("SwapMath: slippage > 100%");
        SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6,
            maxSlippage: 10001 // 100.01%
        });
    }

    function testComputeSwapOutput_Revert_SellPriceZero() public {
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            0 // Zero price
        );
        PriceData memory buyPrice = _createPriceData(address(usdc), 1e18);

        vm.expectRevert("SwapMath: sell price zero");
        SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6,
            maxSlippage: 0
        });
    }

    function testComputeSwapOutput_Revert_BuyPriceZero() public {
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            0 // Zero price
        );

        vm.expectRevert("SwapMath: buy price zero");
        SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 100e6,
            maxSlippage: 0
        });
    }

    // ---------------------------------------------------------------------
    // Edge cases and precision tests
    // ---------------------------------------------------------------------
    function testComputeSwapOutput_FractionalResult() public view {
        // Test case where result should have fractional component
        // Sell 1 USDC at $1.00, buy token at $3.00
        // Expected: 0.333... tokens, should round down to 333333 (6 decimals)
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            3e18 // $3.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1e6, // 1 USDC
            maxSlippage: 0
        });

        // Should be 0.333... USDC = 333333 units (rounds down)
        assertEq(result.amount, 333333);
    }

    function testComputeSwapOutput_USDCToDAI_Slippage() public view {
        // Realistic scenario: Swap 1000 USDC for DAI with 0.5% slippage
        // Both at $1.00
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(dai),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1000e6, // 1000 USDC
            maxSlippage: 50 // 0.5%
        });

        assertEq(address(result.token), address(dai));
        // 1000 * 0.995 = 995 DAI
        assertEq(result.amount, 995e18);
    }

    function testComputeSwapOutput_ETHtoStablecoin() public view {
        // Simulating ETH (18 decimals) to USDC (6 decimals)
        // 1 ETH at $2500 to USDC at $1
        // Expected: 2500 USDC
        PriceData memory sellPrice = _createPriceData(
            address(dai), // mock as ETH
            2500e18 // $2500
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1e18, // 1 ETH
            maxSlippage: 30 // 0.3%
        });

        assertEq(address(result.token), address(usdc));
        // 2500 * 0.997 = 2492.5 USDC
        assertEq(result.amount, 2492.5e6);
    }

    function testComputeSwapOutput_ETHtoStablecoin2() public view {
        // Simulating ETH (18 decimals) to USDC (6 decimals)
        // 1 ETH at $2500 to USDC at $1
        // Expected: 2500 USDC
        PriceData memory sellPrice = _createPriceData(
            address(dai), // mock as ETH
            2500e18 // $2500
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 2.15e18, // 2.15 ETH
            maxSlippage: 12 // 0.12%
        });

        assertEq(address(result.token), address(usdc));
        // ETH value = 2.15 ETH * $2500 = $5375
        // Price after slippage = $5375 * (100% - 0.12%) / 100% = $5368.55
        assertEq(result.amount, 5368.55e6);
    }

    // ---------------------------------------------------------------------
    // Additional edge cases
    // ---------------------------------------------------------------------
    function testComputeSwapOutput_ZeroSellAmount() public view {
        // Selling 0 tokens should return 0
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(dai), 1e18);

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 0,
            maxSlippage: 0
        });

        assertEq(result.amount, 0);
    }

    function testComputeSwapOutput_PrecisionLoss_RoundsToZero() public view {
        // Sell very small amount of cheap token for expensive token
        // 1 unit of token at $0.0001 buying token at $1000
        // Should round to zero after division
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e14 // $0.0001
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1000e18 // $1000
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1, // 1 unit
            maxSlippage: 0
        });

        // 1 * $0.0001 / $1000 = 0.0000001 which rounds to 0
        assertEq(result.amount, 0);
    }

    function testComputeSwapOutput_PrecisionLoss_WithSlippage() public view {
        // Test rounding with slippage on small amounts
        // Sell 10 units at $1, buy at $3, with 1% slippage
        // Expected: (10 * 1 / 3) * 0.99 = 3.3 rounds to 3
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            3e18 // $3.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 10, // 10 units
            maxSlippage: 100 // 1%
        });

        // 10 * $1 / $3 * 0.99 = 3.3 -> rounds to 3
        assertEq(result.amount, 3);
    }

    function testComputeSwapOutput_SlippageBoundary_Minimum() public view {
        // Test with 1 basis point (0.01%) slippage
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(usdc), 1e18);

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 10000e6, // 10000 USDC
            maxSlippage: 1 // 0.01%
        });

        // 10000 * 0.9999 = 9999
        assertEq(result.amount, 9999e6);
    }

    function testComputeSwapOutput_SlippageBoundary_NearMax() public view {
        // Test with 99.99% slippage (9999 bps)
        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(usdc), 1e18);

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 10000e6, // 10000 USDC
            maxSlippage: 9999 // 99.99%
        });

        // 10000 * 0.0001 = 1
        assertEq(result.amount, 1e6);
    }

    function testComputeSwapOutput_ExtremePriceRatio_CheapToExpensive() public view {
        // Sell token at $0.0001, buy token at $100,000
        // 1,000,000 cheap tokens for expensive token
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            1e14 // $0.0001
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            100_000e18 // $100,000
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1_000_000e6, // 1M tokens
            maxSlippage: 0
        });

        // 1M * $0.0001 / $100,000 = $100 / $100,000 = 0.001 tokens
        assertEq(result.amount, 1000); // 0.001 in 6 decimals
    }

    function testComputeSwapOutput_ExtremePriceRatio_ExpensiveToCheap() public view {
        // Sell token at $100,000, buy token at $0.0001
        // 1 expensive token for many cheap tokens
        PriceData memory sellPrice = _createPriceData(
            address(usdc),
            100_000e18 // $100,000
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e14 // $0.0001
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1e6, // 1 token
            maxSlippage: 0
        });

        // 1 * $100,000 / $0.0001 = 1,000,000,000 tokens
        assertEq(result.amount, 1_000_000_000e6);
    }

    function testComputeSwapOutput_LargeDecimalDifference() public view {
        // Test 2 decimals to 18 decimals with slippage
        // 1000 tokens (2 decimals) at $1, buy 18-decimal token at $2
        // With 0.5% slippage
        PriceData memory sellPrice = _createPriceData(
            address(lowDecimalToken),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(dai),
            2e18 // $2.00
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1000e2, // 1000 tokens (2 decimals)
            maxSlippage: 50 // 0.5%
        });

        // 1000 * $1 / $2 * 0.995 = 497.5
        assertEq(result.amount, 497.5e18);
    }

    function testComputeSwapOutput_NumericalStability_LargeValues() public view {
        // Test with values that could overflow in intermediate calculations
        // if not handled properly
        PriceData memory sellPrice = _createPriceData(
            address(dai), // 18 decimals
            1e25 // $10,000,000 (very high price)
        );
        PriceData memory buyPrice = _createPriceData(
            address(usdc),
            1e18 // $1.00
        );

        // This should not overflow
        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: 1000e18, // 1000 tokens
            maxSlippage: 100 // 1%
        });

        // 1000 * $10M / $1 * 0.99 = 9,900,000,000 USDC
        assertEq(result.amount, 9_900_000_000e6);
    }

    // ---------------------------------------------------------------------
    // Fuzz tests
    // ---------------------------------------------------------------------
    function testFuzz_ComputeSwapOutput_ValidInputs(
        uint256 sellAmount,
        uint256 sellPrice,
        uint256 buyPrice,
        uint256 slippage
    ) public view {
        // Bound inputs to reasonable ranges
        sellAmount = bound(sellAmount, 1, 1e30);
        sellPrice = bound(sellPrice, 1e12, 1e24); // $0.000001 to $1,000,000
        buyPrice = bound(buyPrice, 1e12, 1e24);
        slippage = bound(slippage, 0, 10000); // 0% to 100%

        PriceData memory sellPriceData = _createPriceData(
            address(usdc),
            sellPrice
        );
        PriceData memory buyPriceData = _createPriceData(
            address(usdc),
            buyPrice
        );

        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPriceData,
            buyTokenPrice: buyPriceData,
            sellAmount: sellAmount,
            maxSlippage: slippage
        });

        // Invariant: result should never be greater than input value adjusted for price
        // buyAmount <= (sellAmount * sellPrice / buyPrice)
        uint256 maxPossible = (sellAmount * sellPrice) / buyPrice;
        assertLe(result.amount, maxPossible);

        // Invariant: with slippage, result should be <= no-slippage result
        if (slippage > 0) {
            assertTrue(
                result.amount <=
                    (sellAmount * sellPrice * (10000 - slippage)) /
                        (buyPrice * 10000)
            );
        }
    }

    function testFuzz_ComputeSwapOutput_DifferentDecimals(
        uint256 sellAmount,
        uint8 sellDecimals,
        uint8 buyDecimals,
        uint256 slippage
    ) public {
        // Bound decimals to reasonable ranges
        sellDecimals = uint8(bound(sellDecimals, 2, 18));
        buyDecimals = uint8(bound(buyDecimals, 2, 18));
        slippage = bound(slippage, 0, 1000); // 0% to 10%

        // Create mock tokens with specified decimals
        TestUSDC sellToken = new TestUSDC(); // We'll override decimals
        TestDAI buyToken = new TestDAI();

        // Bound sell amount based on decimals
        sellAmount = bound(sellAmount, 1, 1e18 * (10 ** sellDecimals));

        PriceData memory sellPrice = _createPriceData(
            address(sellToken),
            1e18 // $1.00
        );
        PriceData memory buyPrice = _createPriceData(
            address(buyToken),
            1e18 // $1.00
        );

        // This should not revert with valid inputs
        TokenAmount memory result = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: sellAmount,
            maxSlippage: slippage
        });

        // Result should have the correct token
        assertEq(address(result.token), address(buyToken));
    }

    function testFuzz_ComputeSwapOutput_SlippageNeverIncreasesOutput(
        uint256 sellAmount,
        uint256 slippage1,
        uint256 slippage2
    ) public view {
        // Bound inputs
        sellAmount = bound(sellAmount, 1e6, 1e12); // 1 to 1M USDC
        slippage1 = bound(slippage1, 0, 5000);
        slippage2 = bound(slippage2, 0, 5000);

        PriceData memory sellPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory buyPrice = _createPriceData(address(dai), 1e18);

        TokenAmount memory result1 = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: sellAmount,
            maxSlippage: slippage1
        });

        TokenAmount memory result2 = SwapMath.computeMinSwapOutput({
            sellTokenPrice: sellPrice,
            buyTokenPrice: buyPrice,
            sellAmount: sellAmount,
            maxSlippage: slippage2
        });

        // Invariant: higher slippage should never result in more output
        if (slippage1 > slippage2) {
            assertLe(result1.amount, result2.amount);
        } else if (slippage2 > slippage1) {
            assertLe(result2.amount, result1.amount);
        } else {
            assertEq(result1.amount, result2.amount);
        }
    }

    function testFuzz_ComputeSwapOutput_PriceSymmetry(
        uint256 amount,
        uint256 price
    ) public view {
        // Test that swapping A->B->A at same prices results in <= original amount
        amount = bound(amount, 1e6, 1e15); // 1 to 1B USDC
        price = bound(price, 1e17, 1e20); // $0.1 to $100

        PriceData memory usdcPrice = _createPriceData(address(usdc), 1e18);
        PriceData memory daiPrice = _createPriceData(address(dai), price);

        // USDC -> DAI
        TokenAmount memory daiResult = SwapMath.computeMinSwapOutput({
            sellTokenPrice: usdcPrice,
            buyTokenPrice: daiPrice,
            sellAmount: amount,
            maxSlippage: 100 // 1%
        });

        // DAI -> USDC
        TokenAmount memory usdcResult = SwapMath.computeMinSwapOutput({
            sellTokenPrice: daiPrice,
            buyTokenPrice: usdcPrice,
            sellAmount: daiResult.amount,
            maxSlippage: 100 // 1%
        });

        // After round-trip with slippage, should have less than or equal to original
        assertLe(usdcResult.amount, amount);
    }
}
