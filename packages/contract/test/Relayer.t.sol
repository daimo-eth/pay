// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../src/relayer/DaimoPayRelayer.sol";
import "./utils/DummyUSDC.sol";

contract RelayerTest is Test {
    DaimoPayRelayer public relayerContract;
    MockDaimoPay public mockDp;
    MockSwap public mockSwap;
    DaimoPayBridger public mockBridger;

    address immutable _admin = 0x2222222222222222222222222222222222222222;
    address immutable _relayer = 0x3333333333333333333333333333333333333333;
    address immutable _noRole = 0x4444444444444444444444444444444444444444;
    address immutable _bob = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB;

    IERC20 immutable _token1 = new TestUSDC{salt: bytes32(uint256(1))}();
    IERC20 immutable _token2 = new TestUSDC{salt: bytes32(uint256(2))}();

    function setUp() public {
        relayerContract = new DaimoPayRelayer(_admin);
        mockDp = new MockDaimoPay();
        mockSwap = new MockSwap(_token1, _token2);
        uint256[] memory toChainIds = new uint256[](0);
        IDaimoPayBridger[] memory bridgers = new IDaimoPayBridger[](0);
        mockBridger = new DaimoPayBridger(toChainIds, bridgers);

        vm.startPrank(_admin);
        relayerContract.grantRelayerEOARole(_relayer);
        vm.stopPrank();

        // Give tokens to mockSwap for swap output
        _token2.transfer(address(mockSwap), 1000);
    }

    // Helper function to create a sample PayIntent
    function createSampleIntent() internal view returns (PayIntent memory) {
        TokenAmount[] memory bridgeTokenOutOptions = new TokenAmount[](1);
        bridgeTokenOutOptions[0] = TokenAmount(_token1, 100);

        return
            PayIntent({
                toChainId: 1,
                bridger: mockBridger,
                bridgeTokenOutOptions: bridgeTokenOutOptions,
                finalCallToken: TokenAmount(_token1, 100),
                finalCall: Call({to: _bob, value: 0, data: ""}),
                escrow: payable(address(mockDp)),
                refundAddress: address(_bob),
                nonce: 1,
                expirationTimestamp: block.timestamp + 100_000
            });
    }

    function testOnlyRelayerRoleCanStartIntent() public {
        IERC20[] memory paymentTokens = new IERC20[](1);
        paymentTokens[0] = _token1;

        vm.startPrank(_noRole);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _noRole,
                relayerContract.RELAYER_EOA_ROLE()
            )
        );
        relayerContract.startIntent({
            preCalls: new Call[](0),
            dp: DaimoPay(payable(address(mockDp))),
            intent: createSampleIntent(),
            paymentTokens: paymentTokens,
            startCalls: new Call[](0),
            bridgeExtraData: "",
            postCalls: new Call[](0),
            swapAndTipHash: bytes32(0)
        });
        vm.stopPrank();

        vm.startPrank(_relayer);
        relayerContract.startIntent({
            preCalls: new Call[](0),
            dp: DaimoPay(payable(address(mockDp))),
            intent: createSampleIntent(),
            paymentTokens: paymentTokens,
            startCalls: new Call[](0),
            bridgeExtraData: "",
            postCalls: new Call[](0),
            swapAndTipHash: bytes32(0)
        });
        vm.stopPrank();
    }

    function testOnlyRelayerRoleCanFastFinish() public {
        vm.startPrank(_noRole);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _noRole,
                relayerContract.RELAYER_EOA_ROLE()
            )
        );
        relayerContract.fastFinish({
            dp: DaimoPay(payable(address(0))),
            intent: createSampleIntent(),
            tokenIn: TokenAmount(_token1, 0),
            calls: new Call[](0)
        });
        vm.stopPrank();

        vm.startPrank(_relayer);
        relayerContract.fastFinish({
            dp: DaimoPay(payable(address(mockDp))),
            intent: createSampleIntent(),
            tokenIn: TokenAmount(_token1, 0),
            calls: new Call[](0)
        });
        vm.stopPrank();
    }

    function testOnlyRelayerRoleCanClaimAndKeep() public {
        vm.startPrank(_noRole);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _noRole,
                relayerContract.RELAYER_EOA_ROLE()
            )
        );
        relayerContract.claimAndKeep({
            preCalls: new Call[](0),
            dp: DaimoPay(payable(address(0))),
            intent: createSampleIntent(),
            claimCalls: new Call[](0),
            postCalls: new Call[](0),
            swapAndTipHash: bytes32(0)
        });
        vm.stopPrank();

        vm.startPrank(_relayer);
        relayerContract.claimAndKeep({
            preCalls: new Call[](0),
            dp: DaimoPay(payable(address(mockDp))),
            intent: createSampleIntent(),
            claimCalls: new Call[](0),
            postCalls: new Call[](0),
            swapAndTipHash: bytes32(0)
        });
        vm.stopPrank();
    }

    function testOnlyAdminCanGrantRelayerEOARole() public {
        vm.startPrank(_noRole);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _noRole,
                relayerContract.DEFAULT_ADMIN_ROLE()
            )
        );
        relayerContract.grantRelayerEOARole(_relayer);
        vm.stopPrank();

        vm.startPrank(_relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _relayer,
                relayerContract.DEFAULT_ADMIN_ROLE()
            )
        );
        relayerContract.grantRelayerEOARole(_relayer);
        vm.stopPrank();

        vm.startPrank(_admin);
        relayerContract.grantRelayerEOARole(_relayer);
        vm.stopPrank();
    }

    function testOnlyAdminCanWithdrawAmount() public {
        _token1.transfer(address(relayerContract), 1000);

        vm.startPrank(_noRole);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _noRole,
                relayerContract.DEFAULT_ADMIN_ROLE()
            )
        );
        relayerContract.withdrawAmount(_token1, 100);
        vm.stopPrank();

        vm.startPrank(_relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _relayer,
                relayerContract.DEFAULT_ADMIN_ROLE()
            )
        );
        relayerContract.withdrawAmount(_token1, 100);
        vm.stopPrank();

        vm.startPrank(_admin);
        relayerContract.withdrawAmount(_token1, 100);
        vm.stopPrank();
    }

    function testOnlyAdminCanWithdrawBalance() public {
        _token1.transfer(address(relayerContract), 1000);

        vm.startPrank(_noRole);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _noRole,
                relayerContract.DEFAULT_ADMIN_ROLE()
            )
        );
        relayerContract.withdrawBalance(_token1);
        vm.stopPrank();

        vm.startPrank(_relayer);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                _relayer,
                relayerContract.DEFAULT_ADMIN_ROLE()
            )
        );
        relayerContract.withdrawBalance(_token1);
        vm.stopPrank();

        vm.startPrank(_admin);
        relayerContract.withdrawBalance(_token1);
        vm.stopPrank();
    }

    function testWithdrawAmountERC20() public {
        _token1.transfer(address(relayerContract), 1000);

        vm.startPrank(_admin);
        relayerContract.withdrawAmount(_token1, 100);
        vm.stopPrank();

        assertEq(_token1.balanceOf(_admin), 100);
    }

    function testWithdrawAmountNative() public {
        vm.deal(address(relayerContract), 1000);

        vm.startPrank(_admin);
        relayerContract.withdrawAmount(IERC20(address(0)), 100);
        vm.stopPrank();

        assertEq(address(_admin).balance, 100);
    }

    function testWithdrawBalance() public {
        _token1.transfer(address(relayerContract), 1000);

        vm.startPrank(_admin);
        uint256 withdrawnAmount = relayerContract.withdrawBalance(_token1);
        vm.stopPrank();

        assertEq(_token1.balanceOf(_admin), 1000);
        assertEq(withdrawnAmount, 1000);
    }

    function testWithdrawBalanceNative() public {
        vm.deal(address(relayerContract), 1000);

        vm.startPrank(_admin);
        uint256 withdrawnAmount = relayerContract.withdrawBalance(
            IERC20(address(0))
        );
        vm.stopPrank();

        assertEq(address(_admin).balance, 1000);
        assertEq(withdrawnAmount, 1000);
    }

    function getSimpleSwapAndTipParams()
        public
        view
        returns (DaimoPayRelayer.SwapAndTipParams memory)
    {
        return
            DaimoPayRelayer.SwapAndTipParams({
                requiredTokenIn: TokenAmount(_token1, 0),
                suppliedAmountIn: 0,
                requiredTokenOut: TokenAmount(_token1, 0),
                maxPreTip: 0,
                maxPostTip: 0,
                innerSwap: Call(address(0), 0, ""),
                refundAddress: payable(address(0))
            });
    }

    function testCheckSwapAndTipHash() public view {
        DaimoPayRelayer.SwapAndTipParams
            memory params = getSimpleSwapAndTipParams();
        bytes32 EXPECTED_SWAP_AND_TIP_HASH = 0xaffbe61b726412fdd454deff26aedd565d35fc4b9a7005218acbbf3c910e9cfa;
        assertEq(EXPECTED_SWAP_AND_TIP_HASH, keccak256(abi.encode(params)));
    }

    function testSwapAndTipAuth() public {
        DaimoPayRelayer.SwapAndTipParams
            memory params = getSimpleSwapAndTipParams();

        // swapAndTip is accepts only a single, preauthorized call
        vm.expectRevert("DPR: wrong hash");
        relayerContract.swapAndTip(params);

        // Pre-approve the call
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // Execute the call
        relayerContract.swapAndTip(params);
    }

    function testSwapAndTipEmptyCall() public {
        // Setup: send tokens to relayerContract for tipping
        _token1.transfer(address(relayerContract), 200);

        // Setup: send tokens to bob for providing swap input
        _token1.transfer(_bob, 800);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 800);
        vm.stopPrank();

        // bob wants to swap 1000 token1 but only supplies 800
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 1000);
        uint256 suppliedAmountIn = 800;
        TokenAmount memory requiredTokenOut = TokenAmount(_token1, 1000);
        uint256 maxPreTip = 200;
        uint256 maxPostTip = 0;

        // Prepare the swapAndTip hash
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: Call(address(0), 0, ""), // empty call
                refundAddress: payable(address(0))
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // Execute swap
        vm.startPrank(_bob);
        vm.expectEmit(address(relayerContract));
        emit DaimoPayRelayer.SwapAndTip({
            caller: _bob,
            requiredTokenIn: address(requiredTokenIn.token),
            suppliedAmountIn: suppliedAmountIn,
            requiredTokenOut: address(requiredTokenOut.token),
            swapAmountOut: 1000,
            maxPreTip: 200,
            maxPostTip: 0,
            preTip: 200, // preTip = 1000 required - 800 supplied
            postTip: 0
        });
        relayerContract.swapAndTip(params);
        vm.stopPrank();

        // Verify results
        // 1. msg.sender should receive exactly the required output amount
        assertEq(_token1.balanceOf(_bob), requiredTokenOut.amount);

        // 2. Contract should have tipped 200 tokenIn (1000 required - 800 supplied)
        assertEq(
            _token1.balanceOf(address(relayerContract)),
            0 // Initial balance - tip amount
        );
    }

    // Test case where relayer tips before the swap to ensure the swap goes
    // through
    function testSwapAndTipPreSwap() public {
        // Setup: send tokens to relayerContract for tipping
        _token1.transfer(address(relayerContract), 200);

        // Setup: send tokens to bob for providing swap input
        _token1.transfer(_bob, 800);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 800);
        vm.stopPrank();

        // bob wants to swap 1000 token1 but only supplies 800
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 1000);
        uint256 suppliedAmountIn = 800;
        TokenAmount memory requiredTokenOut = TokenAmount(_token2, 1000);
        uint256 maxPreTip = 300;
        uint256 maxPostTip = 0;

        // Prepare the inner swap call
        bytes memory swapData = abi.encodeCall(
            MockSwap.swap,
            (1000, 1000) // Swap 1000 token1 for 1000 token2
        );
        Call memory innerSwap = Call(address(mockSwap), 0, swapData);

        // Prepare the swapAndTip hash
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: innerSwap,
                refundAddress: payable(address(0))
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // Execute swap
        vm.startPrank(_bob);
        vm.expectEmit(address(relayerContract));
        emit DaimoPayRelayer.SwapAndTip({
            caller: _bob,
            requiredTokenIn: address(requiredTokenIn.token),
            suppliedAmountIn: suppliedAmountIn,
            requiredTokenOut: address(requiredTokenOut.token),
            swapAmountOut: 1000, // we know mockSwap returns 1000 tokens
            maxPreTip: 300,
            maxPostTip: 0,
            preTip: 200, // preTip = 1000 required - 800 supplied
            postTip: 0
        });
        relayerContract.swapAndTip(params);
        vm.stopPrank();

        // Verify results
        // 1. msg.sender should receive exactly the required output amount
        assertEq(_token2.balanceOf(_bob), requiredTokenOut.amount);

        // 2. Contract should have tipped 200 tokenIn (1000 required - 800 supplied)
        assertEq(
            _token1.balanceOf(address(relayerContract)),
            0 // Initial balance - tip amount
        );
    }

    // Test case where the relayer tips after the swap to ensure the required
    // output amount is received
    function testSwapAndTipPostSwap() public {
        // Setup: send tokens to relayerContract for tipping
        _token2.transfer(address(relayerContract), 200);

        // Setup: send tokens to bob for providing swap input
        _token1.transfer(_bob, 1000);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 1000);
        vm.stopPrank();

        // bob sends 1000 token1 as input and wants to receive 1000 token2
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 1000);
        uint256 suppliedAmountIn = 1000;
        TokenAmount memory requiredTokenOut = TokenAmount(_token2, 1000);
        uint256 maxPreTip = 0;
        uint256 maxPostTip = 300;

        // Prepare the inner swap call
        bytes memory swapData = abi.encodeCall(
            MockSwap.swap,
            (1000, 800) // Swap 1000 token1 for 800 token2
        );
        Call memory innerSwap = Call(address(mockSwap), 0, swapData);

        // Prepare the swapAndTip hash
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: innerSwap,
                refundAddress: payable(address(0))
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // Execute swap
        vm.startPrank(_bob);
        vm.expectEmit(address(relayerContract));
        emit DaimoPayRelayer.SwapAndTip({
            caller: _bob,
            requiredTokenIn: address(requiredTokenIn.token),
            suppliedAmountIn: suppliedAmountIn,
            requiredTokenOut: address(requiredTokenOut.token),
            swapAmountOut: 800, // we know mockSwap returns 800 tokens
            maxPreTip: 0,
            maxPostTip: 300, // postTip = 1000 required - 800 swap output
            preTip: 0,
            postTip: 200
        });
        relayerContract.swapAndTip(params);
        vm.stopPrank();

        // Verify results
        // 1. msg.sender should receive exactly the required output amount
        assertEq(_token2.balanceOf(_bob), requiredTokenOut.amount);

        // 2. Owner should have tipped 200 tokenOut (1000 required - 800 supplied)
        assertEq(
            _token2.balanceOf(address(relayerContract)),
            0 // Initial balance - tip amount
        );
    }

    // Test case where required pre-swap tip is too high
    function testSwapAndTipPreSwapExcessiveTip() public {
        // Setup: send some tokens to relayerContract for tipping
        _token1.transfer(address(relayerContract), 200);

        // Setup: send tokens to bob for providing swap input
        _token1.transfer(_bob, 700);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 700);
        vm.stopPrank();

        // bob wants to swap 1000 token1 but only supplies 700
        // The owner is willing to tip 200, but a 1000 - 700 = 300 tip is
        // required to make the swap succeed
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 1000);
        uint256 suppliedAmountIn = 700;
        TokenAmount memory requiredTokenOut = TokenAmount(_token2, 1000);
        uint256 maxPreTip = 200;
        uint256 maxPostTip = 0;

        // Prepare the inner swap call
        bytes memory swapData = abi.encodeCall(
            MockSwap.swap,
            (1000, 1000) // Swap 1000 token1 for 1000 token2
        );
        Call memory innerSwap = Call(address(mockSwap), 0, swapData);

        // Prepare the swapAndTip hash
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: innerSwap,
                refundAddress: payable(address(0))
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // Execute swap where tx.origin is relayer and msg.sender is bob
        vm.startPrank(_bob, _relayer);
        vm.expectRevert("DPR: excessive pre tip");
        relayerContract.swapAndTip(params);
        vm.stopPrank();
    }

    // Test case where required post-swap tip is too high
    function testSwapAndTipPostSwapExcessiveTip() public {
        // Setup: send some tokens to relayerContract for tipping
        _token2.transfer(address(relayerContract), 200);

        // Setup: send tokens to bob for providing swap input
        _token1.transfer(_bob, 1000);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 1000);
        vm.stopPrank();

        // bob sends 1000 token1 as input and wants to receive 1000 token2
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 1000);
        uint256 suppliedAmountIn = 1000;
        TokenAmount memory requiredTokenOut = TokenAmount(_token2, 1000);
        uint256 maxPreTip = 0;
        uint256 maxPostTip = 200;

        // The inner swap call only returns 700 token2. owner is willing
        // to tip 200, but a 1000 - 700 = 300 tip is required
        bytes memory swapData = abi.encodeCall(
            MockSwap.swap,
            (1000, 700) // Swap 1000 token1 for 700 token2
        );
        Call memory innerSwap = Call(address(mockSwap), 0, swapData);

        // Execute swap where tx.origin is relayer and msg.sender is bob
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: innerSwap,
                refundAddress: payable(address(0))
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        vm.startPrank(_bob);
        vm.expectRevert("DPR: excessive post tip");
        relayerContract.swapAndTip(params);
        vm.stopPrank();
    }

    function testExcessOutputKeptByContract() public {
        // Setup: send some tokens to bob
        _token1.transfer(_bob, 1000);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 1000);
        vm.stopPrank();

        // bob sends 1000 token1 as input and wants to receive 900 token2
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 1000);
        uint256 suppliedAmountIn = 1000;
        TokenAmount memory requiredTokenOut = TokenAmount(_token2, 900);
        uint256 maxPreTip = 0;
        uint256 maxPostTip = 0;

        // Prepare the inner swap call
        bytes memory swapData = abi.encodeCall(
            MockSwap.swap,
            (1000, 1000) // Swap 1000 token1 for 1000 token2
        );
        Call memory innerSwap = Call(address(mockSwap), 0, swapData);

        // Prepare the swapAndTip hash
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: innerSwap,
                refundAddress: payable(address(0))
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // Execute swap where tx.origin is relayer and msg.sender is bob
        vm.startPrank(_bob, _relayer);
        relayerContract.swapAndTip(params);
        vm.stopPrank();

        // Verify results
        // 1. msg.sender should receive exactly the required output amount
        assertEq(_token2.balanceOf(_bob), requiredTokenOut.amount);

        // 2. Contract should receive the excess output 1000 - 900 = 100
        assertEq(_token2.balanceOf(address(relayerContract)), 100);
    }

    // Test case where the user provides more tokens than required. They should
    // receive the excess tokens back.
    function testOverPaymentRefunded() public {
        // Setup: send some tokens to bob
        _token1.transfer(_bob, 1000);

        // Setup: bob approves relayer contract to spend tokens for swap
        vm.startPrank(_bob);
        _token1.approve(address(relayerContract), 1000);
        vm.stopPrank();

        // bob sends 1000 token1 as input but only 500 of token1 is required
        TokenAmount memory requiredTokenIn = TokenAmount(_token1, 500);
        uint256 suppliedAmountIn = 1000;
        TokenAmount memory requiredTokenOut = TokenAmount(_token2, 500);
        uint256 maxPreTip = 0;
        uint256 maxPostTip = 0;

        // Prepare the inner swap call
        bytes memory swapData = abi.encodeCall(
            MockSwap.swap,
            (500, 500) // Swap 500 token1 for 500 token2
        );
        Call memory innerSwap = Call(address(mockSwap), 0, swapData);

        // Prepare the swapAndTip hash
        DaimoPayRelayer.SwapAndTipParams memory params = DaimoPayRelayer
            .SwapAndTipParams({
                requiredTokenIn: requiredTokenIn,
                suppliedAmountIn: suppliedAmountIn,
                requiredTokenOut: requiredTokenOut,
                maxPreTip: maxPreTip,
                maxPostTip: maxPostTip,
                innerSwap: innerSwap,
                refundAddress: payable(_bob)
            });
        bytes32 swapAndTipHash = keccak256(abi.encode(params));
        vm.store(address(relayerContract), bytes32(uint256(1)), swapAndTipHash);

        // bob should get refunded 500 of token1
        // 1000 supplied - 500 required = 500 refunded
        vm.expectEmit(true, true, true, true);
        emit DaimoPayRelayer.OverPaymentRefunded({
            refundAddress: _bob,
            token: address(_token1),
            amount: 500
        });

        // Execute swap where tx.origin is relayer and msg.sender is bob
        vm.startPrank(_bob, _relayer);
        relayerContract.swapAndTip(params);
        vm.stopPrank();

        // Verify results
        // 1. Bob should receive exactly the required output amount
        assertEq(_token2.balanceOf(_bob), requiredTokenOut.amount);

        // 2. Bob should receive the excess input amount
        assertEq(_token1.balanceOf(_bob), 500);
    }
}

// Helper contract which swaps token1 for token2
contract MockSwap {
    IERC20 public token1;
    IERC20 public token2;

    constructor(IERC20 _token1, IERC20 _token2) {
        token1 = _token1;
        token2 = _token2;
    }

    function swap(uint256 amountIn, uint256 amountOut) external {
        token1.transferFrom(msg.sender, address(this), amountIn);
        token2.transfer(msg.sender, amountOut);
    }
}

contract MockDaimoPay {
    constructor() {}

    function startIntent(
        PayIntent calldata intent,
        IERC20[] calldata paymentTokens,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) public {}

    function fastFinishIntent(
        PayIntent calldata intent,
        Call[] calldata calls,
        IERC20[] calldata tokens
    ) public {}

    function claimIntent(
        PayIntent calldata intent,
        Call[] calldata calls
    ) public {}
}
