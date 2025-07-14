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

    function testWhitelistedStableToggle() public {
        // Initially false
        assertTrue(!cfg.whitelistedStable(address(usdc)));
        cfg.setWhitelistedStable(address(usdc), true);
        assertTrue(cfg.whitelistedStable(address(usdc)));
    }
}
