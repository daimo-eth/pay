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
import {UniversalAddressBridger} from "../src/UniversalAddressBridger.sol";
import {IDaimoPayBridger} from "../src/interfaces/IDaimoPayBridger.sol";
import {DummyBridger} from "./utils/DummyBridger.sol";
import {UAIntentContract} from "../src/UAIntent.sol";
import {ReentrantToken} from "./utils/ReentrantToken.sol";

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

    // ---------------------------------------------------------------------
    // 11. claimIntent swap path – executor already holds requiredToken
    // ---------------------------------------------------------------------
    function testClaimIntent_SwapEqual() public {
        // Deploy alternate stablecoin USDT and whitelist
        TestUSDC usdt = new TestUSDC();
        cfg.setWhitelistedStable(address(usdt), true);

        // 1) Source chain startIntent: pay in USDC, will bridge USDC, final token USDT
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: usdt, toAddress: ALEX, refundAddress: ALICE});
        address intentAddr = intentFactory.getIntentAddress(intent, address(mgr));

        // Alice deposits USDC into her UA vault
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        // Prefund executor with USDT so the destination-chain swap succeeds
        vm.prank(ALICE);
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // 2) Destination chain – place bridged USDC at deterministic receiver
        vm.chainId(DST_CHAIN_ID);
        bytes32 saltR = keccak256(abi.encodePacked("receiver", intentAddr, USER_SALT, AMOUNT, usdc));
        bytes memory init = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(usdc));
        address receiver = Create2.computeAddress(saltR, keccak256(init));
        vm.prank(ALICE);
        usdc.transfer(receiver, AMOUNT);

        // Prefund the executor with the required USDT so checkBalance passes (exact amount)
        DaimoPayExecutor exec = DaimoPayExecutor(mgr.executor());
        usdt.transfer(address(exec), AMOUNT);
        // Approve manager to pull if it sees a deficit (should be none here)
        usdt.approve(address(mgr), type(uint256).max);

        uint256 callerBalBefore = usdt.balanceOf(address(this));

        // Trigger claimIntent from the test contract itself
        mgr.claimIntent(intent, AMOUNT, AMOUNT, USER_SALT, usdc, new Call[](0));

        // Beneficiary got USDT
        assertEq(usdt.balanceOf(ALEX), AMOUNT);
        // Manager has zero balances after transfer
        assertEq(usdt.balanceOf(address(mgr)), 0);

        // Caller balance unchanged (no deficit pull)
        assertEq(usdt.balanceOf(address(this)), callerBalBefore);
    }

    // ---------------------------------------------------------------------
    // 12. claimIntent swap path – manager pulls deficit from relayer
    // ---------------------------------------------------------------------
    function testClaimIntent_SwapDeficitPull() public {
        // Alternate stablecoin (pretend USDT) and whitelist
        TestUSDC usdt = new TestUSDC();
        cfg.setWhitelistedStable(address(usdt), true);

        // Fund relayer with plenty of USDT and approve manager for deficit pull
        usdt.transfer(RELAYER, 500_000e6);
        vm.prank(RELAYER);
        usdt.approve(address(mgr), type(uint256).max);

        // 1) Source chain – Alice starts an intent to receive USDT on dst chain
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: usdt, toAddress: ALEX, refundAddress: ALICE});
        address intentAddr = intentFactory.getIntentAddress(intent, address(mgr));

        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // 2) Destination chain – place bridged USDC at deterministic receiver
        vm.chainId(DST_CHAIN_ID);
        bytes32 saltR = keccak256(abi.encodePacked("receiver", intentAddr, USER_SALT, AMOUNT, usdc));
        bytes memory init = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(usdc));
        address receiver = Create2.computeAddress(saltR, keccak256(init));
        vm.prank(ALICE);
        usdc.transfer(receiver, AMOUNT);

        // Prefund executor with only 60 USDT (< required 100) so manager will pull deficit
        DaimoPayExecutor exec = DaimoPayExecutor(mgr.executor());
        usdt.transfer(address(exec), 60e6);

        uint256 relayerBalBefore = usdt.balanceOf(RELAYER);

        // Relayer triggers claimIntent and will cover deficit (40 USDT)
        vm.prank(RELAYER);
        mgr.claimIntent(intent, AMOUNT, AMOUNT, USER_SALT, usdc, new Call[](0));

        // Beneficiary received the full 100 USDT
        assertEq(usdt.balanceOf(ALEX), AMOUNT);

        // Relayer paid exactly the deficit (40 USDT)
        assertEq(usdt.balanceOf(RELAYER), relayerBalBefore - 40e6);

        // Manager ends with zero USDT balance
        assertEq(usdt.balanceOf(address(mgr)), 0);
    }

    // ---------------------------------------------------------------------
    // 13. startIntent deficit pull – executor returns < requiredAmount
    // ---------------------------------------------------------------------
    function testStartIntent_DeficitPull() public {
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Alice funds her UA vault with 100 USDC
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        uint256 aliceBalBefore = usdc.balanceOf(ALICE);

        // Craft swap call that moves 90 USDC from executor to dummy address,
        // leaving only 10 USDC so the manager must top-up 90 from Alice.
        Call[] memory swapCalls = new Call[](1);
        swapCalls[0] = Call({
            to: address(usdc),
            value: 0,
            data: abi.encodeWithSelector(IERC20.transfer.selector, address(0xdead), 90e6)
        });

        // Execute startIntent. Alice (msg.sender) will act as swapFunder.
        vm.prank(ALICE);
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, swapCalls, "");

        uint256 aliceBalAfter = usdc.balanceOf(ALICE);

        // Alice should have paid the 90 USDC deficit.
        assertEq(aliceBalBefore - aliceBalAfter, 90e6);

        // Manager should hold exactly requiredAmount (100 USDC) for bridging (subsequently spent).
        assertEq(usdc.balanceOf(address(mgr)), 0);

        // intentSent flag must be set
        assertTrue(mgr.intentSent(intentAddr));
    }

    // ---------------------------------------------------------------------
    // 14. startIntent insufficient-output revert – executor returns 0 of requiredToken
    // ---------------------------------------------------------------------
    function testStartIntent_InsufficientOutput_Reverts() public {
        // Deploy alternate stable-coin (pretend USDT) and whitelist it
        TestUSDC usdt = new TestUSDC();
        cfg.setWhitelistedStable(address(usdt), true);

        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: usdt, toAddress: ALEX, refundAddress: ALICE});
        address intentAddr = intentFactory.getIntentAddress(intent, address(mgr));

        // Alice deposits USDC into her UA vault
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        // Expect the call to revert because executor will return zero USDT,
        // triggering "DPCE: insufficient output" inside DaimoPayExecutor.
        vm.prank(ALICE);
        vm.expectRevert(bytes("DPCE: insufficient output"));
        mgr.startIntent(intent, usdc, usdt, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");
    }

    // ---------------------------------------------------------------------
    // 15. UniversalAddressBridger token mismatch should revert on quoteIn and bridge
    // ---------------------------------------------------------------------
    function testUniversalAddressBridger_TokenMismatch_Reverts() public {
        // Prepare tokens
        TestUSDC usdt = new TestUSDC();
        // Dummy adapter implementing IDaimoPayBridger
        DummyBridger adapter = new DummyBridger();

        uint256[] memory chains = new uint256[](1);
        chains[0] = DST_CHAIN_ID;
        IDaimoPayBridger[] memory bridgers = new IDaimoPayBridger[](1);
        bridgers[0] = adapter;
        address[] memory usdOut = new address[](1);
        usdOut[0] = address(usdc); // Configure USDC as stableOut for the chain
        
        UniversalAddressBridger ub = new UniversalAddressBridger(chains, bridgers, usdOut);

        // quoteIn with a different token (usdt) should revert
        vm.expectRevert(bytes("UA: token mismatch"));
        ub.quoteIn(DST_CHAIN_ID, IERC20(address(usdt)), AMOUNT);

        // bridge with mismatched token should also revert
        vm.expectRevert(bytes("UA: token mismatch"));
        ub.bridge(DST_CHAIN_ID, ALEX, IERC20(address(usdt)), AMOUNT, "");
    }

    // ---------------------------------------------------------------------
    // 16. claimIntent called before bridged funds arrive should revert (underflow)
    // ---------------------------------------------------------------------
    function testClaimIntent_Underflow_Reverts() public {
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Alice funds her UA vault
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // Switch to destination chain but do NOT pre-place additional bridged funds.
        vm.chainId(DST_CHAIN_ID);

        // Pass bridgeAmountOut larger than what will be swept (AMOUNT+1) to force underflow.
        vm.expectRevert(bytes("UAM: underflow"));
        mgr.claimIntent(intent, AMOUNT, AMOUNT + 1, USER_SALT, usdc, new Call[](0));
    }

    // ---------------------------------------------------------------------
    // 17. startIntent invoked on destination chain should revert
    // ---------------------------------------------------------------------
    function testStartIntent_OnDestinationChain_Reverts() public {
        vm.chainId(DST_CHAIN_ID); // Same as intent.toChainId
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        vm.expectRevert(bytes("UAM: on destination chain"));
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");
    }

    // ---------------------------------------------------------------------
    // 18. refundIntent with whitelisted stable-coin should revert
    // ---------------------------------------------------------------------
    function testRefundIntent_WhitelistedToken_Reverts() public {
        vm.chainId(DST_CHAIN_ID); // Destination chain bypasses intentSent requirement
        UAIntent memory intent = _intent();

        IERC20[] memory toks = new IERC20[](1);
        toks[0] = usdc; // whitelisted by default

        vm.expectRevert(bytes("UAM: can't refund whitelisted coin"));
        mgr.refundIntent(intent, toks);
    }

    // ---------------------------------------------------------------------
    // 19. refundIntent sweeping multiple arbitrary tokens succeeds
    // ---------------------------------------------------------------------
    function testRefundIntent_MultipleTokens() public {
        vm.chainId(DST_CHAIN_ID); // skip intentSent check
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Deploy two non-whitelisted ERC-20s and pre-fund the vault
        TestUSDC tok1 = new TestUSDC();
        TestUSDC tok2 = new TestUSDC();

        uint256 amt1 = 70e6;
        uint256 amt2 = 30e6;

        tok1.transfer(intentAddr, amt1);
        tok2.transfer(intentAddr, amt2);

        // Prepare token list for refund
        IERC20[] memory toks = new IERC20[](2);
        toks[0] = IERC20(address(tok1));
        toks[1] = IERC20(address(tok2));

        uint256 aliceTok1Before = tok1.balanceOf(ALICE);
        uint256 aliceTok2Before = tok2.balanceOf(ALICE);

        mgr.refundIntent(intent, toks);

        // Alice should now hold the swept amounts
        assertEq(tok1.balanceOf(ALICE), aliceTok1Before + amt1);
        assertEq(tok2.balanceOf(ALICE), aliceTok2Before + amt2);
    }

    // ---------------------------------------------------------------------
    // 20. refundIntent on source chain before intentSent should revert
    // ---------------------------------------------------------------------
    function testRefundIntent_NotStarted_Reverts() public {
        vm.chainId(SRC_CHAIN_ID); // Source chain – intentSent is required
        UAIntent memory intent = _intent();

        // Use non-whitelisted token to avoid earlier revert
        TestUSDC other = new TestUSDC();
        IERC20[] memory toks = new IERC20[](1);
        toks[0] = IERC20(address(other));

        vm.expectRevert(bytes("UAM: not started"));
        mgr.refundIntent(intent, toks);
    }

    // ---------------------------------------------------------------------
    // 21. refundIntent success on source chain after startIntent (intentSent == true)
    // ---------------------------------------------------------------------
    function testRefundIntent_SourceChain_Succeeds() public {
        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Step 1: Alice funds UA vault with USDC and starts the intent
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");

        // Step 2: Deposit a non-whitelisted token into the vault AFTER startIntent
        TestUSDC stray = new TestUSDC();
        uint256 strayAmt = 42e6;
        stray.transfer(intentAddr, strayAmt);

        // Step 3: Call refundIntent to sweep the stray token back to refundAddress (ALICE)
        IERC20[] memory toks = new IERC20[](1);
        toks[0] = IERC20(address(stray));

        uint256 aliceBalBefore = stray.balanceOf(ALICE);
        mgr.refundIntent(intent, toks);
        assertEq(stray.balanceOf(ALICE), aliceBalBefore + strayAmt);
    }

    // ---------------------------------------------------------------------
    // 22. refundIntent with empty token list should be a no-op (no revert)
    // ---------------------------------------------------------------------
    function testRefundIntent_EmptyArray_NoOp() public {
        vm.chainId(DST_CHAIN_ID); // destination chain avoids intentSent check
        UAIntent memory intent = _intent();

        uint256 aliceBalBefore = usdc.balanceOf(ALICE);
        IERC20[] memory emptyTokens = new IERC20[](0);
        mgr.refundIntent(intent, emptyTokens);
        // No balance changes expected
        assertEq(usdc.balanceOf(ALICE), aliceBalBefore);
    }

    // ---------------------------------------------------------------------
    // 23. Global pause switch – all mutating calls should revert
    // ---------------------------------------------------------------------
    function testGlobalPause_Reverts() public {
        // Pause via SharedConfig
        cfg.setPaused(true);

        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = _intent();
        address intentAddr = _intentAddr(intent);

        // Fund UA vault
        vm.prank(ALICE);
        usdc.transfer(intentAddr, AMOUNT);

        // Any state-changing call (e.g. startIntent) should now revert
        vm.expectRevert(bytes("UAM: paused"));
        mgr.startIntent(intent, usdc, usdc, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");
    }

    // ---------------------------------------------------------------------
    // 24. UAIntentContract cannot be initialised twice
    // ---------------------------------------------------------------------
    function testUAIntent_Reinitialise_Reverts() public {
        UAIntent memory intent = _intent();
        // Deploy proxy via factory
        UAIntentContract vault = UAIntentContract(intentFactory.createIntent(intent, address(mgr)));

        // Attempt to call initialize again – should revert (already initialised)
        bytes32 hash = keccak256(abi.encode(intent));
        vm.expectRevert(abi.encodeWithSignature("InvalidInitialization()"));
        vault.initialize(hash, address(this));
    }

    // ---------------------------------------------------------------------
    // 25. Reentrancy attack against startIntent should be blocked by ReentrancyGuard
    // ---------------------------------------------------------------------
    function testStartIntent_ReentrancyBlocked() public {
        // Deploy malicious re-entrant token that will attempt a nested call
        ReentrantToken evil = new ReentrantToken(payable(address(mgr)));
        cfg.setWhitelistedStable(address(evil), true);

        // Give Alice plenty of the token & approve manager
        evil.transfer(ALICE, 1_000_000e6);
        vm.prank(ALICE);
        evil.approve(address(mgr), type(uint256).max);

        vm.chainId(SRC_CHAIN_ID);
        UAIntent memory intent = UAIntent({toChainId: DST_CHAIN_ID, toToken: evil, toAddress: ALEX, refundAddress: ALICE});
        address intentAddr = intentFactory.getIntentAddress(intent, address(mgr));

        // Alice deposits funds into her UA vault
        vm.prank(ALICE);
        evil.transfer(intentAddr, AMOUNT);

        // Expect the nested call in token.transfer to trigger ReentrancyGuard revert
        vm.prank(ALICE);
        vm.expectRevert(abi.encodeWithSignature("ReentrancyGuardReentrantCall()"));
        mgr.startIntent(intent, evil, evil, AMOUNT, AMOUNT, USER_SALT, new Call[](0), "");
    }
}
