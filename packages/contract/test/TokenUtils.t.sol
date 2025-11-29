// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/TokenUtils.sol";

contract TokenUtilsTest is Test {
    // ========== Equal decimals ==========

    function testEqualDecimals() public pure {
        // Same decimals should return amount unchanged
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1000,
                fromDecimals: 6,
                toDecimals: 6,
                roundUp: false
            }),
            1000
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1000,
                fromDecimals: 6,
                toDecimals: 6,
                roundUp: true
            }),
            1000
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 0,
                fromDecimals: 18,
                toDecimals: 18,
                roundUp: false
            }),
            0
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: type(uint256).max,
                fromDecimals: 18,
                toDecimals: 18,
                roundUp: false
            }),
            type(uint256).max
        );
    }

    // ========== Scale up (toDecimals > fromDecimals) ==========

    function testScaleUp_USDC6To18() public pure {
        // 1 USDC (1e6) scaled to 18 decimals = 1e18
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e6,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: false
            }),
            1e18
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e6,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: true
            }),
            1e18
        );
    }

    function testScaleUp_SmallAmount() public pure {
        // 1 unit in 6 decimals scaled to 18 decimals
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: false
            }),
            1e12
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: true
            }),
            1e12
        );
    }

    function testScaleUp_ZeroAmount() public pure {
        // 0 scaled to any decimals should remain 0
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 0,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: false
            }),
            0
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 0,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: true
            }),
            0
        );
    }

    function testScaleUp_SingleDecimalDiff() public pure {
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 100,
                fromDecimals: 6,
                toDecimals: 7,
                roundUp: false
            }),
            1000
        );
    }

    function testScaleUp_LargeDecimalDiff() public pure {
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1,
                fromDecimals: 6,
                toDecimals: 30,
                roundUp: false
            }),
            1e24
        );
    }

    function testScaleUp_RoundUpFlagIgnored() public pure {
        // roundUp flag should have no effect when scaling up (no precision loss)
        uint256 amount = 12345678;
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: amount,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: false
            }),
            TokenUtils.convertTokenAmountDecimals({
                amount: amount,
                fromDecimals: 6,
                toDecimals: 18,
                roundUp: true
            })
        );
    }

    // ========== Scale down (toDecimals < fromDecimals) - round down ==========

    function testScaleDown_18To6_RoundDown() public pure {
        // 1e18 (1 token in 18 decimals) to 6 decimals = 1e6
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e18,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            1e6
        );
    }

    function testScaleDown_ExactDivision_RoundDown() public pure {
        // Amount that divides evenly: 1.123456e18 -> 1.123456e6
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1.123456e18,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            1.123456e6
        );
    }

    function testScaleDown_RequiresRounding_RoundDown() public pure {
        // 1e18 + 1 wei -> should still be 1e6 (floor division)
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e18 + 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            1e6
        );
        // 1e18 + 999999999999 wei -> still 1e6 (just under 1e12 extra)
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e18 + 1e12 - 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            1e6
        );
    }

    function testScaleDown_ZeroAmount_RoundDown() public pure {
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 0,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            0
        );
    }

    function testScaleDown_SmallAmount_RoundDown() public pure {
        // Amount smaller than 1 unit in target decimals
        // 1e11 wei (< 1e12 needed for 1 USDC unit) -> 0
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e11,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            0
        );
        // Exactly at boundary: 1e12 -> 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e12,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: false
            }),
            1
        );
    }

    function testScaleDown_SingleDecimalDiff_RoundDown() public pure {
        // 1000 in 7 decimals to 6 decimals = 100
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1000,
                fromDecimals: 7,
                toDecimals: 6,
                roundUp: false
            }),
            100
        );
        // 1001 in 7 decimals to 6 decimals = 100 (truncated)
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1001,
                fromDecimals: 7,
                toDecimals: 6,
                roundUp: false
            }),
            100
        );
    }

    // ========== Scale down (toDecimals < fromDecimals) - round up ==========

    function testScaleDown_18To6_RoundUp() public pure {
        // Exact: 1e18 -> 1e6
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e18,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1e6
        );
    }

    function testScaleDown_ExactDivision_RoundUp() public pure {
        // Amount that divides evenly should give same result as round down
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1.123456e18,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1.123456e6
        );
    }

    function testScaleDown_RequiresRounding_RoundUp() public pure {
        // 1e18 + 1 wei -> should round up to 1e6 + 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e18 + 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1e6 + 1
        );
        // 1e18 + 999999999999 wei -> rounds up to 1e6 + 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e18 + 1e12 - 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1e6 + 1
        );
    }

    function testScaleDown_ZeroAmount_RoundUp() public pure {
        // 0 rounded up is still 0
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 0,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            0
        );
    }

    function testScaleDown_SmallAmount_RoundUp() public pure {
        // Amount smaller than 1 unit in target decimals, rounds up to 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1
        );
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e11,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1
        );
        // Just below boundary: 1e12 - 1 -> 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e12 - 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1
        );
        // Exactly at boundary: 1e12 -> 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e12,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            1
        );
        // Just above boundary: 1e12 + 1 -> 2
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e12 + 1,
                fromDecimals: 18,
                toDecimals: 6,
                roundUp: true
            }),
            2
        );
    }

    function testScaleDown_SingleDecimalDiff_RoundUp() public pure {
        // 1000 in 7 decimals to 6 decimals = 100
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1000,
                fromDecimals: 7,
                toDecimals: 6,
                roundUp: true
            }),
            100
        );
        // 1001 in 7 decimals to 6 decimals = 101 (rounded up)
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1001,
                fromDecimals: 7,
                toDecimals: 6,
                roundUp: true
            }),
            101
        );
    }

    function testScaleDown_LargeDecimalDiff_RoundUp() public pure {
        // Just below boundary: 1e24 - 1 -> 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e24 - 1, // Just below boundary
                fromDecimals: 30,
                toDecimals: 6,
                roundUp: true
            }),
            1
        );
        // Exactly at boundary: 1e24 -> 1
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e24, // Just at boundary
                fromDecimals: 30,
                toDecimals: 6,
                roundUp: true
            }),
            1
        );
        // Just above boundary: 1e24 + 1 -> 2
        assertEq(
            TokenUtils.convertTokenAmountDecimals({
                amount: 1e24 + 1, // Just above boundary
                fromDecimals: 30,
                toDecimals: 6,
                roundUp: true
            }),
            2
        );
    }

    // ========== Edge cases with max values ==========

    function testScaleDown_MaxUint256_RoundDown() public pure {
        // Max uint256 scaled down should not overflow
        uint256 result = TokenUtils.convertTokenAmountDecimals({
            amount: type(uint256).max,
            fromDecimals: 18,
            toDecimals: 6,
            roundUp: false
        });
        assertEq(result, type(uint256).max / 1e12);
    }

    // ========== Fuzz tests ==========

    function testFuzz_EqualDecimals(
        uint256 amount,
        uint8 decimals,
        bool roundUp
    ) public pure {
        // With equal decimals, result should always equal input
        uint256 result = TokenUtils.convertTokenAmountDecimals({
            amount: amount,
            fromDecimals: decimals,
            toDecimals: decimals,
            roundUp: roundUp
        });
        assertEq(result, amount);
    }

    function testFuzz_ScaleUpThenDown(
        uint256 amount,
        uint8 decimalDiff
    ) public pure {
        // Scale up then down should give back original (floor division)
        vm.assume(decimalDiff <= 30);
        vm.assume(amount <= type(uint256).max / (10 ** decimalDiff)); // Avoid overflow

        uint256 smallDecimals = 6;
        uint256 bigDecimals = smallDecimals + decimalDiff;

        uint256 scaledUp = TokenUtils.convertTokenAmountDecimals({
            amount: amount,
            fromDecimals: smallDecimals,
            toDecimals: bigDecimals,
            roundUp: false
        });
        uint256 scaledBack = TokenUtils.convertTokenAmountDecimals({
            amount: scaledUp,
            fromDecimals: bigDecimals,
            toDecimals: smallDecimals,
            roundUp: false
        });

        assertEq(scaledBack, amount);
    }

    function testFuzz_ScaleDownRoundUpGteRoundDown(
        uint256 amount,
        uint8 fromDecimals,
        uint8 toDecimals
    ) public pure {
        vm.assume(toDecimals < fromDecimals);
        vm.assume(fromDecimals <= 30);

        uint256 decimalDiff = uint256(fromDecimals) - uint256(toDecimals);
        uint256 divisor = 10 ** decimalDiff;

        // Constrain amount to prevent overflow in convertTokenAmountDecimals implementation
        vm.assume(divisor > 0);
        vm.assume(amount <= type(uint256).max / divisor);

        uint256 roundedDown = TokenUtils.convertTokenAmountDecimals({
            amount: amount,
            fromDecimals: fromDecimals,
            toDecimals: toDecimals,
            roundUp: false
        });
        uint256 roundedUp = TokenUtils.convertTokenAmountDecimals({
            amount: amount,
            fromDecimals: fromDecimals,
            toDecimals: toDecimals,
            roundUp: true
        });

        assertGe(roundedUp, roundedDown);
        // Difference should be at most 1
        assertLe(roundedUp - roundedDown, 1);
    }
}
