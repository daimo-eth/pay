// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {SharedConfig} from "../src/SharedConfig.sol";
import {UniversalAddressFactory} from "../src/UniversalAddressFactory.sol";
import {UniversalAddress, BridgeReceiver, PayRoute} from "../src/UniversalAddress.sol";
import {UpgradeableBeacon} from "openzeppelin-contracts/contracts/proxy/beacon/UpgradeableBeacon.sol";
import {BeaconProxy} from "openzeppelin-contracts/contracts/proxy/beacon/BeaconProxy.sol";
import {Call} from "../src/DaimoPayExecutor.sol";
import {IDaimoPayBridger} from "../src/interfaces/IDaimoPayBridger.sol";
import {DummySwapper} from "./utils/DummySwapper.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {TestUSDC} from "./utils/DummyUSDC.sol";
import {TestUSDT} from "./utils/DummyUSDT.sol";
import {TestDAI} from "./utils/DummyDAI.sol";
import {DummyBridger} from "./utils/DummyBridger.sol";

/// @notice Abstract contract that bootstraps a full Universal Address stack for tests.
abstract contract UA_Setup is Test {
    // Accounts
    address internal constant ALICE = address(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa);
    address internal constant ALEX = address(0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB);
    address internal constant RELAYER = address(0x2222222222222222222222222222222222222222);

    // Core protocol components
    SharedConfig internal cfg;
    UniversalAddressFactory internal factory;
    UpgradeableBeacon internal beacon;
    DummyBridger internal bridger;

    // Tokens
    TestUSDC internal usdc;
    TestUSDT internal usdt;
    TestDAI internal dai;

    // Constants
    uint256 internal constant DEST_CHAIN_ID = 137; // polygon
    bytes32 internal constant USDC_KEY = keccak256("USDC_KEY");
    bytes32 internal constant BRIDGER_KEY = keccak256("BRIDGER_KEY");

    function setUp() public virtual {
        // 1. Deploy tokens
        usdc = new TestUSDC();
        usdt = new TestUSDT();
        dai = new TestDAI();

        // 2. Deploy SharedConfig and populate
        cfg = new SharedConfig();
        cfg.initialize(address(this)); // set owner to this test contract
        cfg.setAddr(USDC_KEY, address(usdc));
        // Dummy bridger will be deployed later
        // Allow-list stablecoins
        cfg.setWhitelistedStable(address(usdc), true);
        cfg.setWhitelistedStable(address(usdt), true);

        // 3. Deploy DummyBridger and write to config
        bridger = new DummyBridger();
        cfg.setAddr(BRIDGER_KEY, address(bridger));

        // 4. Deploy beacon and factory
        UniversalAddress impl = new UniversalAddress();
        beacon = new UpgradeableBeacon(address(impl), address(this));
        factory = new UniversalAddressFactory(cfg, beacon);

        // Prefund actors
        usdc.transfer(ALICE, 500_000e6);
        usdc.transfer(RELAYER, 500_000e6);
    }

    /// Deploys a Universal Address for tests and returns the instance.
    function _deployUniversalAddress(address beneficiary, address refund) internal returns (UniversalAddress ua) {
        address uaAddr = factory.deployUA(DEST_CHAIN_ID, IERC20(address(usdc)), beneficiary, refund);
        ua = UniversalAddress(payable(uaAddr));
    }
}

/*──────────────────────────────────────────────────────────────────────────────
    Deployment-related tests
──────────────────────────────────────────────────────────────────────────────*/

contract UniversalAddressDeployTest is UA_Setup {
    function testDeterministicDeployment() public {
        // Prepare params
        address beneficiary = ALEX;
        address refund = ALICE;

        // Deploy
        address deployed = factory.deployUA(DEST_CHAIN_ID, usdc, beneficiary, refund);

        // Verify proxy code exists
        uint256 codeSize = deployed.code.length;
        assertGt(codeSize, 0, "Proxy not deployed");

        // Deployment should be idempotent
        address deployedAgain = factory.deployUA(DEST_CHAIN_ID, usdc, beneficiary, refund);
        assertEq(deployedAgain, deployed, "Duplicate deployment must yield same address");

        // Sanity: implementation exists
        address implAddr = beacon.implementation();
        assertTrue(implAddr != address(0));
    }
}

/*──────────────────────────────────────────────────────────────────────────────
    start() positive-path tests
──────────────────────────────────────────────────────────────────────────────*/

contract UniversalAddressStartTest is UA_Setup {
    bytes32 internal constant ZERO_SALT = bytes32(0);

    function _depositToUA(UniversalAddress ua, uint256 amount) internal {
        // Alice transfers tokens to UA directly
        vm.prank(ALICE);
        usdc.transfer(address(ua), amount);
    }

    function testStartSameChain() public {
        // Make source chain equal to dest chain
        uint256 origChain = block.chainid;
        vm.chainId(DEST_CHAIN_ID);

        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
        uint256 amount = 100e6;
        _depositToUA(ua, amount);

        // Expect Start event with full routing information
        vm.expectEmit(address(ua));
        emit UniversalAddress.Start(
            ZERO_SALT,
            amount,
            ALEX,
            PayRoute({toChainId: DEST_CHAIN_ID, toCoin: IERC20(address(usdc)), toAddr: ALEX, refundAddr: ALICE})
        );

        ua.start(usdc, ZERO_SALT, new Call[](0), "");

        // Funds should have been delivered to beneficiary
        assertEq(usdc.balanceOf(ALEX), amount);
        assertEq(usdc.balanceOf(address(ua)), 0);

        // reset chain id for other tests
        vm.chainId(origChain);
    }

    function testStartCrossChainNoSwap() public {
        // Source chain remains as default (likely 1)
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
        uint256 amount = 200e6;
        _depositToUA(ua, amount);

        bytes32 expectedSalt = keccak256(abi.encodePacked("receiver", address(ua), ZERO_SALT, amount));
        address expectedReceiver = _computeReceiver(address(ua), expectedSalt);

        // ------------------------------------------------------------------
        // Prepare dummy swap so _swapInPlace produces >= requiredAmount.
        // ------------------------------------------------------------------
        DummySwapper swapper = new DummySwapper();
        // fund swapper with "amount" USDC so it can deliver funds back
        vm.prank(ALICE);
        usdc.transfer(address(swapper), amount);

        // encode call data for swapper.swap(token, recipient, amount)
        bytes memory callData =
            abi.encodeWithSelector(swapper.swap.selector, IERC20(address(usdc)), address(ua), amount);

        Call[] memory calls = new Call[](1);
        calls[0] = Call({to: address(swapper), value: 0, data: callData});

        // expect DummyBridger events
        vm.expectEmit(address(bridger));
        emit DummyBridger.Send(DEST_CHAIN_ID, expectedReceiver, address(usdc), amount, "");

        vm.expectEmit(address(bridger));
        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: address(ua),
            fromToken: address(usdc),
            fromAmount: amount,
            toChainId: DEST_CHAIN_ID,
            toAddress: expectedReceiver,
            toToken: address(usdc),
            toAmount: amount
        });

        ua.start(usdc, ZERO_SALT, calls, "");

        // DummyBridger does not pull tokens, so UA keeps its USDC. Ensure it still holds at least the original deposit.
        assertGe(usdc.balanceOf(address(ua)), amount);
    }

    function _computeReceiver(address uaAddr, bytes32 salt) internal view returns (address) {
        bytes memory initCode = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(IERC20(address(usdc))));
        bytes32 hash = keccak256(abi.encodePacked(hex"ff", uaAddr, salt, keccak256(initCode)));
        return address(uint160(uint256(hash)));
    }
}

/*──────────────────────────────────────────────────────────────────────────────
    Edge-case & negative-path tests for start(), swap, fastFinish, etc.
──────────────────────────────────────────────────────────────────────────────*/

contract UniversalAddressEdgeTest is UA_Setup {
    bytes32 internal constant ZERO_SALT = bytes32(0);

    /*──────────────────────────────────────────────────────────────────────────
        start() negative-path coverage
    ──────────────────────────────────────────────────────────────────────────*/

    function testStartTokenNotWhitelisted() public {
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
        uint256 amount = 100e18; // DAI has 18 decimals
        // Transfer unsupported token (DAI) into the UA
        dai.transfer(address(ua), amount);
        // Expect revert because DAI is not on the whitelist
        vm.expectRevert("UA: token not whitelisted");
        ua.start(dai, ZERO_SALT, new Call[](0), "");
    }

    function testStartPaused() public {
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
        uint256 amount = 100e6;
        vm.prank(ALICE);
        usdc.transfer(address(ua), amount);
        // Pause all UAs via SharedConfig
        cfg.setPaused(true);
        vm.expectRevert("UA: paused");
        ua.start(usdc, ZERO_SALT, new Call[](0), "");
    }

    function testStartNoBalance() public {
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
        vm.expectRevert("UA: no balance");
        ua.start(usdc, ZERO_SALT, new Call[](0), "");
    }

    function testStartBridgerMissing() public {
        // Ensure both this contract and ALICE have fresh balances for this test
        deal(address(usdc), address(this), 1_000_000e6);
        deal(address(usdc), ALICE, 1_000_000e6);

        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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

        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
        uint256 bridged = 200e6;
        vm.chainId(DEST_CHAIN_ID);

        // Relayer provides liquidity
        vm.startPrank(RELAYER);
        usdc.approve(address(ua), bridged * 2);
        ua.fastFinish(bridged, ZERO_SALT, new Call[](0));
        vm.stopPrank();

        // Beneficiary received funds
        assertEq(usdc.balanceOf(ALEX), bridged);

        // Mapping recorded relayer
        bytes32 salt = keccak256(abi.encodePacked("receiver", address(ua), ZERO_SALT, bridged));
        assertEq(ua.receiverFiller(salt), RELAYER);
    }

    function testFastFinishAlreadyFinishedReverts() public {
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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

        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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
        assertEq(usdc.balanceOf(ALEX), bridged);
    }

    function testClaimWithFastFinishRepaysRelayer() public {
        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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

        UniversalAddress ua = _deployUniversalAddress(ALEX, ALICE);
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

/*──────────────────────────────────────────────────────────────────────────────
    Factory helper tests
──────────────────────────────────────────────────────────────────────────────*/

contract UniversalAddressFactoryAdditionalTest is UA_Setup {
    function testGetUAAddressMatchesDeployment() public {
        address beneficiary = ALEX;
        address refund = ALICE;
        bytes memory initData =
            abi.encodeCall(UniversalAddress.initialize, (cfg, DEST_CHAIN_ID, usdc, beneficiary, refund));
        address predicted = factory.getUAAddress(initData);
        address deployed = factory.deployUA(DEST_CHAIN_ID, usdc, beneficiary, refund);
        assertEq(predicted, deployed);
    }

    function testDifferentInitDataDifferentAddress() public {
        address addrA = factory.deployUA(DEST_CHAIN_ID, usdc, ALEX, ALICE);
        address addrB = factory.deployUA(DEST_CHAIN_ID, usdc, ALICE, ALEX);
        assertTrue(addrA != addrB);
    }
}
