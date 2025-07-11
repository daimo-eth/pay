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
import {DaimoPayExecutor} from "../src/DaimoPayExecutor.sol";

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

    // ---------------------------------------------------------------------
    // 4. Claim flow WITH fast-finish (relayer reimbursement)
    // ---------------------------------------------------------------------
    function testClaimIntent_WithFastFinish() public {
        // 1) Source chain start
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Alice funds her UA vault with the full amount
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // 2) Destination chain – relayer performs fast-fill
        vm.chainId(DST_CHAIN_ID);

        uint256 relayerStartBal = usdc.balanceOf(RELAYER);
        vm.prank(RELAYER);
        mgr.fastFinishIntent(intent, AMOUNT, USER_SALT, usdc, new Call[](0));

        // Beneficiary should have already received the funds
        assertEq(usdc.balanceOf(ALEX), AMOUNT);
        // Relayer paid the amount upfront
        assertEq(usdc.balanceOf(RELAYER), relayerStartBal - AMOUNT);

        // 3) Simulate slow bridge landing at deterministic BridgeReceiver
        bytes32 salt = keccak256(abi.encodePacked("receiver", intentAddr, USER_SALT, AMOUNT, usdc));
        bytes memory init = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(usdc));
        address receiver = Create2.computeAddress(salt, keccak256(init));
        vm.prank(ALICE); // any account can transfer, acts as the bridge contract
        usdc.transfer(receiver, AMOUNT);

        // 4) Anyone can now call claimIntent – relayer must be reimbursed
        vm.prank(address(0xdead));
        mgr.claimIntent(intent, AMOUNT, AMOUNT, USER_SALT, usdc, new Call[](0));

        // Relayer balance should be restored
        assertEq(usdc.balanceOf(RELAYER), relayerStartBal);
        // Beneficiary balance remains unchanged (no double-pay)
        assertEq(usdc.balanceOf(ALEX), AMOUNT);
    }

    // ---------------------------------------------------------------------
    // 5. startIntent with non-whitelisted token should revert
    // ---------------------------------------------------------------------
    function testStartIntent_NonWhitelistedToken_Reverts() public {
        // Deploy a second USDC-like token that is NOT whitelisted in cfg
        TestUSDC other = new TestUSDC();
        other.transfer(ALICE, 1_000e6);

        // Give approvals so manager can pull funds
        vm.prank(ALICE);
        other.approve(address(mgr), type(uint256).max);

        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: other, toAddress: ALEX, refundAddress: ALICE});
        address intentAddr = intentFactory.getIntentAddress(intent, address(mgr));

        // Alice funds her UA vault with the un-whitelisted token
        vm.prank(ALICE);
        other.transfer(intentAddr, AMOUNT);

        // Expect revert because token is not whitelisted
        vm.expectRevert(bytes("UAM: token not whitelisted"));
        mgr.startIntent(intent, other, other, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");
    }

    // ---------------------------------------------------------------------
    // 6. Duplicate fastFinishIntent should revert (salt already used)
    // ---------------------------------------------------------------------
    function testFastFinishIntent_Duplicate_Reverts() public {
        testFastFinishIntent(); // performs the first fast-finish

        vm.chainId(DST_CHAIN_ID);
        UAIntent memory intent = _intent();

        // Second attempt – should fail
        vm.expectRevert(bytes("UAM: already finished"));
        vm.prank(RELAYER);
        mgr.fastFinishIntent(intent, AMOUNT, USER_SALT, usdc, new Call[](0));
    }

    // ---------------------------------------------------------------------
    // 7. fastFinishIntent on the wrong chain should revert
    // ---------------------------------------------------------------------
    function testFastFinishIntent_WrongChain_Reverts() public {
        testStartIntent();

        // We are still on the source chain (SRC_CHAIN_ID) instead of destination
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();

        vm.expectRevert(bytes("UAM: wrong chain"));
        vm.prank(RELAYER);
        mgr.fastFinishIntent(intent, AMOUNT, USER_SALT, usdc, new Call[](0));
    }

    // ---------------------------------------------------------------------
    // 8. startIntent below MIN_START_USDC should revert
    // ---------------------------------------------------------------------
    function testStartIntent_BelowMinimum_Reverts() public {
        // Increase the minimum so that 100 USDC is below the threshold
        bytes32 minKey = keccak256("MIN_START_USDC");
        cfg.setNum(minKey, 150e6); // 150 USDC minimum

        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Alice deposits more (200 USDC) but tries to start with only 100 USDC
        vm.prank(ALICE);
        usdc.transfer(intentAddr, 200e6);

        vm.expectRevert(bytes("UAM: swapAmountOut below minimum"));
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");
    }

    // ---------------------------------------------------------------------
    // 9. startIntent with paymentToken != bridgeToken (swap path via executor)
    // ---------------------------------------------------------------------
    function testStartIntent_SwapPath() public {
        // Deploy second stable-coin (pretend USDT)
        TestUSDC usdt = new TestUSDC();
        cfg.setWhitelistedStable(address(usdt), true);

        vm.chainId(SRC_CHAIN_ID);

        UAIntent memory intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: usdt, toAddress: ALEX, refundAddress: ALICE});
        address intentAddr = intentFactory.getIntentAddress(intent, address(mgr));

        // Alice funds her UA vault with USDC
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        // Prefund the executor with bridgeToken so balance check passes
        DaimoPayExecutor exec = DaimoPayExecutor(mgr.executor());
        usdt.transfer(address(exec), AMOUNT);

        // Alice kicks off startIntent (so she will also be refund recipient if needed)
        vm.prank(ALICE);
        mgr.startIntent(intent, usdc, usdt, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // Manager immediately bridged the tokens; its balance should be zero
        assertEq(usdt.balanceOf(address(mgr)), 0);

        // Bridged funds should now sit at the deterministic BridgeReceiver addr on the *source* chain
        bytes32 salt = keccak256(abi.encodePacked("receiver", intentAddr, USER_SALT, AMOUNT, usdt));
        bytes memory init = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(usdt));
        address receiver = Create2.computeAddress(salt, keccak256(init), address(mgr));
        assertEq(usdt.balanceOf(receiver), AMOUNT);

        // intentSent flag set
        assertTrue(mgr.intentSent(intentAddr));
    }

    // ---------------------------------------------------------------------
    // 10. Surplus refund path – manager held extra requiredToken before swap
    // ---------------------------------------------------------------------
    function testStartIntent_SurplusRefund() public {
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Manager pre-holds surplus 50 USDC (e.g. previous dust)
        vm.prank(ALICE);
        usdc.transfer(address(mgr), 50e6);

        // Alice deposits full 100 USDC into her UA vault
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        uint256 aliceBalBefore = usdc.balanceOf(ALICE);

        // Alice initiates the intent so she is swapFunder
        vm.prank(ALICE);
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // Alice should have received the 50 USDC surplus back
        assertEq(usdc.balanceOf(ALICE), aliceBalBefore + 50e6);
    }
}
