// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {SharedConfig} from "../src/SharedConfig.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";

contract SharedConfigTest is Test {
    SharedConfig internal cfg;
    TestUSDC internal usdc;

    address internal constant ALICE = address(0xA11CE);

    bytes32 internal constant SAMPLE_KEY = keccak256("SAMPLE");

    function setUp() public {
        cfg = new SharedConfig();
        cfg.initialize(address(this));
        usdc = new TestUSDC();
    }

    function testOwnerCanSetAddr() public {
        cfg.setAddr(SAMPLE_KEY, ALICE);
        assertEq(cfg.addr(SAMPLE_KEY), ALICE);
    }

    function testNonOwnerCannotSetAddr() public {
        vm.prank(ALICE);
        vm.expectRevert();
        cfg.setAddr(SAMPLE_KEY, ALICE);
    }

    function testPauseFlag() public {
        cfg.setPaused(true);
        assertTrue(cfg.paused());
        cfg.setPaused(false);
        assertTrue(!cfg.paused());
    }

    function testAllowedStableToggle() public {
        // Initially false
        assertTrue(!cfg.allowedStable(address(usdc)));
        cfg.setAllowedStable(address(usdc), true);
        assertTrue(cfg.allowedStable(address(usdc)));
    }
}
