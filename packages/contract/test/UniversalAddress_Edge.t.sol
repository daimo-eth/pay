// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "./UA_Setup.t.sol";
import {UniversalAddress, BridgeReceiver} from "../src/UniversalAddress.sol";
import {Call} from "../src/DaimoPayExecutor.sol";
import {DummySwapper} from "./utils/DummySwapper.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

/// @notice Tests additional edge-cases and failure paths for UniversalAddress
contract UniversalAddressEdgeTest is UA_Setup {
    bytes32 internal constant ZERO_SALT = bytes32(0);

    /*──────────────────────────────────────────────────────────────────────────
        start() negative-path coverage
    ──────────────────────────────────────────────────────────────────────────*/

    function testStartTokenDisallowed() public {
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 amount = 100e18; // DAI has 18 decimals
        // Transfer unsupported token (DAI) into the UA
        dai.transfer(address(ua), amount);
        // Expect revert because DAI is not on the allow-list
        vm.expectRevert("UA: token disallowed");
        ua.start(dai, ZERO_SALT, new Call[](0), "");
    }

    function testStartPaused() public {
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 amount = 100e6;
        vm.prank(ALICE);
        usdc.transfer(address(ua), amount);
        // Pause all UAs via SharedConfig
        cfg.setPaused(true);
        vm.expectRevert("UA: paused");
        ua.start(usdc, ZERO_SALT, new Call[](0), "");
    }

    function testStartNoBalance() public {
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        vm.expectRevert("UA: no balance");
        ua.start(usdc, ZERO_SALT, new Call[](0), "");
    }

    function testStartBridgerMissing() public {
        // Ensure both this contract and ALICE have fresh balances for this test
        deal(address(usdc), address(this), 1_000_000e6);
        deal(address(usdc), ALICE, 1_000_000e6);

        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 amount = 100e6;
        vm.prank(ALICE);
        usdc.transfer(address(ua), amount);
        // Approve UA to pull deficit from this contract without allowance errors
        usdc.approve(address(ua), type(uint256).max);
        // Remove bridger address from config
        cfg.setAddr(BRIDGER_KEY, address(0));
        vm.expectRevert("UA: bridger missing");
        ua.start(usdc, ZERO_SALT, new Call[](0), "");
    }

    /*──────────────────────────────────────────────────────────────────────────
        _swapInPlace() shortfall / surplus
    ──────────────────────────────────────────────────────────────────────────*/

    function testSwapShortfallPullsDeficit() public {
        // Ensure ALICE and this contract have enough USDC
        deal(address(usdc), ALICE, 2_000_000e6);
        deal(address(usdc), address(this), 500_000e6);

        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 amount = 100e6; // 100 USDC
        vm.prank(ALICE);
        usdc.transfer(address(ua), amount);

        // Swapper will only deliver half the required amount so UA must
        // pull the deficit from msg.sender (this contract).
        DummySwapper swapper = new DummySwapper();
        uint256 delivered = amount / 2;
        usdc.transfer(address(swapper), delivered);

        // Pre-approve UA to pull the deficit from this contract.
        usdc.approve(address(ua), type(uint256).max);

        bytes memory callData =
            abi.encodeWithSelector(swapper.swap.selector, IERC20(address(usdc)), address(ua), delivered);

        Call[] memory calls = new Call[](1);
        calls[0] = Call({to: address(swapper), value: 0, data: callData});

        uint256 balBefore = usdc.balanceOf(address(this));
        ua.start(usdc, ZERO_SALT, calls, "");
        uint256 balAfter = usdc.balanceOf(address(this));

        // UA should now hold the original deposit *plus* the deficit & delivered
        uint256 expectedBal = amount * 2; // deposit + delivered + deficit == 2x
        assertEq(usdc.balanceOf(address(ua)), expectedBal);
        assertEq(balBefore - balAfter, amount - delivered);
    }

    function testSwapSurplusRefunded() public {
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 required = 100e6;
        vm.prank(ALICE);
        usdc.transfer(address(ua), required);

        DummySwapper swapper = new DummySwapper();
        uint256 surplus = 50e6;
        // Fund swapper so it can send required + surplus across two calls
        vm.prank(ALICE);
        usdc.transfer(address(swapper), required + surplus);

        bytes memory call1 = abi.encodeWithSelector(swapper.swap.selector, IERC20(address(usdc)), address(ua), required);
        bytes memory call2 = abi.encodeWithSelector(swapper.swap.selector, IERC20(address(usdc)), address(ua), surplus);

        Call[] memory calls = new Call[](2);
        calls[0] = Call(address(swapper), 0, call1);
        calls[1] = Call(address(swapper), 0, call2);

        uint256 balBefore = usdc.balanceOf(address(this));
        ua.start(usdc, ZERO_SALT, calls, "");
        uint256 balAfter = usdc.balanceOf(address(this));

        // Surplus should be refunded to msg.sender (this contract)
        assertEq(balAfter - balBefore, surplus);
    }

    /*──────────────────────────────────────────────────────────────────────────
        fastFinish() paths
    ──────────────────────────────────────────────────────────────────────────*/

    function testFastFinishHappyPath() public {
        // Deploy UA on source chain, then switch to dest chain
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 bridged = 200e6;
        vm.chainId(DEST_CHAIN_ID);

        // Relayer provides liquidity
        vm.startPrank(RELAYER);
        usdc.approve(address(ua), bridged * 2);
        ua.fastFinish(bridged, ZERO_SALT, new Call[](0));
        vm.stopPrank();

        // Beneficiary received funds
        assertEq(usdc.balanceOf(BOB), bridged);

        // Mapping recorded relayer
        bytes32 salt = keccak256(abi.encodePacked("receiver", address(ua), ZERO_SALT, bridged));
        assertEq(ua.receiverFiller(salt), RELAYER);
    }

    function testFastFinishAlreadyFinishedReverts() public {
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 bridged = 50e6;
        vm.chainId(DEST_CHAIN_ID);
        vm.startPrank(RELAYER);
        usdc.approve(address(ua), bridged * 2);
        ua.fastFinish(bridged, ZERO_SALT, new Call[](0));
        // second call should revert
        vm.expectRevert("UA: already finished");
        ua.fastFinish(bridged, ZERO_SALT, new Call[](0));
        vm.stopPrank();
    }

    /*──────────────────────────────────────────────────────────────────────────
        claim() branches
    ──────────────────────────────────────────────────────────────────────────*/

    function _computeReceiver(address uaAddr, bytes32 salt) internal view returns (address) {
        bytes memory initCode = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(IERC20(address(usdc))));
        bytes32 hash = keccak256(abi.encodePacked(hex"ff", uaAddr, salt, keccak256(initCode)));
        return address(uint160(uint256(hash)));
    }

    function testClaimWithoutFastFinish() public {
        // Ensure ALICE has enough USDC for the transfer
        deal(address(usdc), ALICE, 1_000_000e6);

        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 bridged = 120e6;
        bytes32 salt = keccak256(abi.encodePacked("receiver", address(ua), ZERO_SALT, bridged));
        address receiverAddr = _computeReceiver(address(ua), salt);

        // Switch to destination chain first, then have ALICE fund receiver
        vm.chainId(DEST_CHAIN_ID);
        deal(address(usdc), ALICE, 1_000_000e6);
        vm.prank(ALICE);
        usdc.transfer(receiverAddr, bridged);

        ua.claim(bridged, ZERO_SALT);

        // Beneficiary got the funds
        assertEq(usdc.balanceOf(BOB), bridged);
    }

    function testClaimWithFastFinishRepaysRelayer() public {
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 bridged = 90e6;
        bytes32 salt = keccak256(abi.encodePacked("receiver", address(ua), ZERO_SALT, bridged));
        address receiverAddr = _computeReceiver(address(ua), salt);

        // -------- fastFinish beforehand ----------
        vm.chainId(DEST_CHAIN_ID);
        vm.startPrank(RELAYER);
        usdc.approve(address(ua), bridged * 2);
        ua.fastFinish(bridged, ZERO_SALT, new Call[](0));
        vm.stopPrank();

        // Simulate bridge arrival via ALICE transfer
        vm.prank(ALICE);
        usdc.transfer(receiverAddr, bridged);

        uint256 relayerBefore = usdc.balanceOf(RELAYER);
        ua.claim(bridged, ZERO_SALT);
        uint256 relayerAfter = usdc.balanceOf(RELAYER);

        assertEq(relayerAfter - relayerBefore, bridged);
    }

    /*──────────────────────────────────────────────────────────────────────────
        refund() unsupported token
    ──────────────────────────────────────────────────────────────────────────*/

    function testRefundUnsupportedToken() public {
        // Mint DAI to ALICE
        deal(address(dai), ALICE, 10e18);

        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 amt = 1e18;
        vm.prank(ALICE);
        dai.transfer(address(ua), amt);

        IERC20[] memory toks = new IERC20[](1);
        toks[0] = dai;

        // Call refund
        ua.refund(toks);

        // ALICE sent 1 DAI and received the same 1 DAI back → net 0 change
        assertEq(dai.balanceOf(ALICE), 10e18);
        assertEq(dai.balanceOf(address(ua)), 0);
    }
}
