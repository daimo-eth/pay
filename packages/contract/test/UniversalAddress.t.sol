// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {Create2} from "openzeppelin-contracts/contracts/utils/Create2.sol";

import {UniversalAddressManager} from "../src/UniversalAddressManager.sol";
import {UAIntentFactory} from "../src/UAIntentFactory.sol";
import {UAIntent} from "../src/UAIntent.sol";
import {SharedConfig} from "../src/SharedConfig.sol";
import {Call} from "../src/DaimoPayExecutor.sol";

import {TestUSDC} from "./utils/DummyUSDC.sol";
import {DummyUniversalBridger} from "./utils/DummyUniversalBridger.sol";
import {BridgeReceiver} from "../src/UniversalAddressManager.sol";

contract UniversalAddressTest is Test {
    // ---------------------------------------------------------------------
    // Test constants & actors
    // ---------------------------------------------------------------------
    address private constant ALICE = address(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa);
    address private constant ALEX = address(0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB);
    address private constant RELAYER = address(0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC);

    uint256 private constant SRC_CHAIN_ID = 1;
    uint256 private constant DST_CHAIN_ID = 10;

    uint256 private constant AMOUNT = 100e6; // 100 USDC (6-decimals)
    bytes32 private constant USER_SALT = bytes32(uint256(123));

    // ---------------------------------------------------------------------
    // Deployed contracts
    // ---------------------------------------------------------------------
    TestUSDC private usdc;
    UAIntentFactory private intentFactory;
    SharedConfig private cfg;
    DummyUniversalBridger private bridger;
    UniversalAddressManager private mgr;

    // ---------------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------------
    function setUp() public {
        // Token & balances
        usdc = new TestUSDC();
        usdc.transfer(ALICE, 500_000e6);
        usdc.transfer(RELAYER, 500_000e6);

        // Config
        cfg = new SharedConfig();
        cfg.initialize(address(this));
        cfg.setWhitelistedStable(address(usdc), true);

        // Core components
        intentFactory = new UAIntentFactory();
        bridger = new DummyUniversalBridger();
        mgr = new UniversalAddressManager(intentFactory, bridger, cfg);

        // Approvals so mgr can pull funds when needed
        vm.prank(ALICE);
        usdc.approve(address(mgr), type(uint256).max);
        vm.prank(RELAYER);
        usdc.approve(address(mgr), type(uint256).max);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------
    function _intent() internal view returns (UAIntent memory intent) {
        intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: usdc, toAddress: ALEX, refundAddress: ALICE});
    }

    function _intentAddr(UAIntent memory intent) internal view returns (address) {
        return intentFactory.getIntentAddress(intent, address(mgr));
    }

    function _receiverSalt(address uaAddr) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("receiver", uaAddr, USER_SALT, AMOUNT, IERC20(address(0))));
    }

    // ---------------------------------------------------------------------
    // 1. Source-chain startIntent
    // ---------------------------------------------------------------------
    function testStartIntent() public {
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Alice funds her UA vault.
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        // Start – no swap, same coin in/out.
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        assertTrue(mgr.intentSent(intentAddr));
    }

    // ---------------------------------------------------------------------
    // 2. Destination-chain fastFinishIntent
    // ---------------------------------------------------------------------
    function testFastFinishIntent() public {
        testStartIntent(); // registers bridgedCoin mapping

        vm.chainId(DST_CHAIN_ID);
        UAIntent memory intent = _intent();

        vm.prank(RELAYER);
        mgr.fastFinishIntent(intent, AMOUNT, USER_SALT, usdc, new Call[](0));

        assertEq(usdc.balanceOf(ALEX), AMOUNT);
    }

    // ---------------------------------------------------------------------
    // 3. Claim flow without fast-finish
    // ---------------------------------------------------------------------
    function testClaimIntent_NoFastFinish() public {
        testStartIntent();

        // Pre-place bridged funds at the deterministic BridgeReceiver address.
        UAIntent memory intent = _intent();
        address uaAddr = _intentAddr(intent);
        bytes32 salt = keccak256(abi.encodePacked("receiver", uaAddr, USER_SALT, AMOUNT, usdc));
        bytes memory init = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(usdc));
        address receiver = Create2.computeAddress(salt, keccak256(init));
        vm.prank(ALICE);
        usdc.transfer(receiver, AMOUNT);

        vm.chainId(DST_CHAIN_ID);
        mgr.claimIntent(intent, AMOUNT, AMOUNT, USER_SALT, usdc, new Call[](0));

        assertEq(usdc.balanceOf(ALEX), AMOUNT);
    }
}
