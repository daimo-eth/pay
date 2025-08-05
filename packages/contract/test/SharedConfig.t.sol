// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {SharedConfig} from "../src/SharedConfig.sol";
import {ERC1967Proxy} from "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";

contract SharedConfigTest is Test {
    SharedConfig internal cfg;
    TestUSDC internal usdc;

    address internal constant ALICE = address(0xA11CE);

    bytes32 internal constant SAMPLE_KEY = keccak256("SAMPLE");

    function setUp() public {
        SharedConfig impl = new SharedConfig();
        bytes memory initData = abi.encodeCall(SharedConfig.initialize, (address(this)));
        ERC1967Proxy proxy = new ERC1967Proxy(address(impl), initData);
        cfg = SharedConfig(payable(address(proxy)));
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

    function testWhitelistedStablesToggle() public {
        // Set up test data
        address[] memory tokens = new address[](2);
        tokens[0] = address(usdc);
        tokens[1] = address(0xBEEF);

        bool[] memory states = new bool[](2);
        states[0] = true;
        states[1] = true;

        // Initially false for both
        assertTrue(!cfg.whitelistedStable(tokens[0]));
        assertTrue(!cfg.whitelistedStable(tokens[1]));

        // Set both to true
        cfg.setWhitelistedStables(tokens, states);

        // Verify both are now true
        assertTrue(cfg.whitelistedStable(tokens[0]));
        assertTrue(cfg.whitelistedStable(tokens[1]));

        // Set first to false, second to true
        states[0] = false;
        states[1] = true;
        cfg.setWhitelistedStables(tokens, states);

        // Verify states updated correctly
        assertTrue(!cfg.whitelistedStable(tokens[0]));
        assertTrue(cfg.whitelistedStable(tokens[1]));
    }
}
