// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../src/DaimoPay.sol";
import "../src/DaimoPayBridger.sol";
import "../src/DaimoPayCCTPBridger.sol";
import "../src/DaimoPayCCTPV2Bridger.sol";
import "../src/DaimoPayAcrossBridger.sol";
import "../src/DaimoPayAxelarBridger.sol";
import "./dummy/DummyUSDC.sol";
import "./dummy/across.sol";
import "./dummy/axelar.sol";
import "./dummy/cctp.sol";
import "./dummy/cctpv2.sol";

address constant CCTP_INTENT_ADDR = 0xBEbbe9338034f09E68054661794A97403E146517;
address constant CCTP_V2_INTENT_ADDR = 0xBeC35d1e3eB87d88A53496ee311B6cfB661f7AA7;
address constant ACROSS_INTENT_ADDR = 0xe29Ef804A32274b11165809875c58D3a88079d3e;
address constant AXELAR_INTENT_ADDR = 0x2Ccf02a1247440355856dbfF1Ec99Aa4FfF41a6d;

contract DaimoPayTest is Test {
    // Daimo Pay contracts
    DaimoPay public dp;
    PayIntentFactory public intentFactory;

    // Bridging contracts
    DaimoPayBridger public bridger;
    DaimoPayCCTPBridger public cctpBridger;
    DaimoPayCCTPV2Bridger public cctpV2Bridger;
    DaimoPayAcrossBridger public acrossBridger;
    DaimoPayAxelarBridger public axelarBridger;

    // CCTP dummy contracts
    DummyTokenMinter public tokenMinter;
    DummyCCTPMessenger public messenger;

    // CCTPV2 dummy contracts
    DummyTokenMinterV2 public tokenMinterV2;
    DummyCCTPMessengerV2 public messengerV2;

    // Across dummy contracts
    DummySpokePool public spokePool;

    // Axelar dummy contracts
    DummyAxelarGatewayWithToken public axelarGateway;
    DummyAxelarGasService public axelarGasService;

    // Account addresses
    address immutable _alice = 0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa;
    address immutable _bob = 0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB;
    address immutable _lp = 0x2222222222222222222222222222222222222222;

    uint256 immutable _lpToTokenInitBalance = 1000;

    // Tokens
    IERC20 immutable _fromToken = new TestUSDC{salt: bytes32(uint256(1))}();
    IERC20 immutable _toToken = new TestUSDC{salt: bytes32(uint256(2))}();
    IERC20 immutable _bridgeTokenOption =
        new TestUSDC{salt: bytes32(uint256(3))}();

    // Token that's not registered in the token minter and Across
    IERC20 immutable _unregisteredToken =
        new TestUSDC{salt: bytes32(uint256(420))}();

    // Chains
    uint256 immutable _fromChainId = 10; // Optimism
    uint256 immutable _cctpDestchainId = 8453; // Base
    uint32 immutable _cctpDestDomain = 6; // Base
    uint256 immutable _cctpV2DestChainId = 42161; // Arbitrum
    uint32 immutable _cctpV2DestDomain = 3; // Arbitrum
    uint256 immutable _acrossDestChainId = 59144; // Linea
    uint256 immutable _axelarDestChainId = 56; // BNB Chain

    // Intent data
    uint256 immutable _toAmount = 100;
    uint256 immutable _bridgeTokenOptionToAmount = 10;

    uint256 immutable _nonce = 1;

    function setUp() public {
        intentFactory = new PayIntentFactory();

        // Initialize CCTP bridger
        tokenMinter = new DummyTokenMinter();
        tokenMinter.setLocalToken(
            _cctpDestDomain,
            bytes32(uint256(uint160(address(_toToken)))),
            address(_fromToken)
        );
        messenger = new DummyCCTPMessenger(_cctpDestDomain, CCTP_INTENT_ADDR, address(_fromToken));

        uint256[] memory cctpChainIds = new uint256[](1);
        DaimoPayCCTPBridger.CCTPBridgeRoute[]
            memory cctpBridgeRoutes = new DaimoPayCCTPBridger.CCTPBridgeRoute[](
                1
            );
        cctpChainIds[0] = _cctpDestchainId;
        cctpBridgeRoutes[0] = DaimoPayCCTPBridger.CCTPBridgeRoute({
            domain: _cctpDestDomain,
            bridgeTokenOut: address(_toToken)
        });
        cctpBridger = new DaimoPayCCTPBridger({
            _owner: address(this),
            _tokenMinter: tokenMinter,
            _cctpMessenger: messenger,
            _toChainIds: cctpChainIds,
            _bridgeRoutes: cctpBridgeRoutes
        });

        // Initialize CCTP v2 bridger
        tokenMinterV2 = new DummyTokenMinterV2();
        tokenMinterV2.setLocalToken(
            _cctpV2DestDomain,
            bytes32(uint256(uint160(address(_toToken)))),
            address(_fromToken)
        );
        messengerV2 = new DummyCCTPMessengerV2(_cctpV2DestDomain, CCTP_V2_INTENT_ADDR, address(_fromToken));

        uint256[] memory cctpV2ChainIds = new uint256[](1);
        DaimoPayCCTPV2Bridger.CCTPBridgeRoute[]
            memory cctpV2BridgeRoutes = new DaimoPayCCTPV2Bridger.CCTPBridgeRoute[](
                1
            );
        cctpV2ChainIds[0] = _cctpV2DestChainId;
        cctpV2BridgeRoutes[0] = DaimoPayCCTPV2Bridger.CCTPBridgeRoute({
            domain: _cctpV2DestDomain,
            bridgeTokenOut: address(_toToken)
        });
        cctpV2Bridger = new DaimoPayCCTPV2Bridger({
            _owner: address(this),
            _tokenMinterV2: tokenMinterV2,
            _cctpMessengerV2: messengerV2,
            _toChainIds: cctpV2ChainIds,
            _bridgeRoutes: cctpV2BridgeRoutes
        });

        // Initialize Across bridger
        spokePool = new DummySpokePool(address(_fromToken), address(_toToken), ACROSS_INTENT_ADDR);

        uint256[] memory acrossChainIds = new uint256[](1);
        DaimoPayAcrossBridger.AcrossBridgeRoute[]
            memory acrossBridgeRoutes = new DaimoPayAcrossBridger.AcrossBridgeRoute[](
                1
            );
        acrossChainIds[0] = _acrossDestChainId;
        acrossBridgeRoutes[0] = DaimoPayAcrossBridger.AcrossBridgeRoute({
            bridgeTokenIn: address(_fromToken),
            bridgeTokenOut: address(_toToken),
            pctFee: 1e16, // 1% fee
            flatFee: 10 // (=$0.00001)
        });

        acrossBridger = new DaimoPayAcrossBridger({
            _owner: address(this),
            _spokePool: spokePool,
            _toChainIds: acrossChainIds,
            _bridgeRoutes: acrossBridgeRoutes
        });

        // Initialize Axelar bridger
        axelarGateway = new DummyAxelarGatewayWithToken(
            "binance",
            address(0xdead),
            AXELAR_INTENT_ADDR
        );
        axelarGasService = new DummyAxelarGasService(
            "binance",
            address(0xdead),
            AXELAR_INTENT_ADDR,
            _toAmount,
            address(_alice)
        );

        uint256[] memory axelarChainIds = new uint256[](1);
        DaimoPayAxelarBridger.AxelarBridgeRoute[]
            memory axelarBridgeRoutes = new DaimoPayAxelarBridger.AxelarBridgeRoute[](
                1
            );
        axelarChainIds[0] = _axelarDestChainId;
        axelarBridgeRoutes[0] = DaimoPayAxelarBridger.AxelarBridgeRoute({
            destChainName: "binance",
            bridgeTokenIn: address(_fromToken),
            bridgeTokenOut: address(_toToken),
            bridgeTokenOutSymbol: "axlUSDC",
            receiverContract: address(0xdead),
            fee: 10 // 10 wei
        });

        axelarBridger = new DaimoPayAxelarBridger({
            _owner: address(this),
            _axelarGateway: axelarGateway,
            _axelarGasService: axelarGasService,
            _toChainIds: axelarChainIds,
            _bridgeRoutes: axelarBridgeRoutes
        });

        // Map _cctpDestchainId to cctpBridger, _acrossDestChainId to acrossBridger,
        // and _axelarDestChainId to axelarBridger
        uint256[] memory chainIds = new uint256[](4);
        chainIds[0] = _cctpDestchainId;
        chainIds[1] = _cctpV2DestChainId;
        chainIds[2] = _acrossDestChainId;
        chainIds[3] = _axelarDestChainId;
        IDaimoPayBridger[] memory bridgers = new IDaimoPayBridger[](4);
        bridgers[0] = cctpBridger;
        bridgers[1] = cctpV2Bridger;
        bridgers[2] = acrossBridger;
        bridgers[3] = axelarBridger;

        bridger = new DaimoPayBridger({
            _owner: address(this),
            _chainIds: chainIds,
            _bridgers: bridgers
        });

        dp = new DaimoPay(intentFactory, bridger);

        // Log addresses of initialized contracts
        console.log("PayIntentFactory address:", address(intentFactory));
        console.log("DummyTokenMinter address:", address(tokenMinter));
        console.log("DummyCCTPMessenger address:", address(messenger));
        console.log("DummyTokenMinterV2 address:", address(tokenMinterV2));
        console.log("DummyCCTPMessengerV2 address:", address(messengerV2));
        console.log("DaimoPayCCTPBridger address:", address(cctpBridger));
        console.log("DaimoPayCCTPV2Bridger address:", address(cctpV2Bridger));
        console.log("DaimoPayAcrossBridger address:", address(acrossBridger));
        console.log("DaimoPayAxelarBridger address:", address(axelarBridger));
        console.log("DaimoPayBridger address:", address(bridger));
        console.log("DaimoPay address:", address(dp));
        console.log("TestUSDC (fromToken) address:", address(_fromToken));
        console.log("TestUSDC (toToken) address:", address(_toToken));
        console.log(
            "TestUSDC (bridgeTokenOption) address:",
            address(_bridgeTokenOption)
        );
    }

    function getBridgeTokenOutOptions()
        public
        view
        returns (TokenAmount[] memory)
    {
        TokenAmount[] memory bridgeTokenOutOptions = new TokenAmount[](2);
        bridgeTokenOutOptions[0] = TokenAmount({
            token: _toToken,
            amount: _toAmount
        });
        bridgeTokenOutOptions[1] = TokenAmount({
            token: _bridgeTokenOption,
            amount: _bridgeTokenOptionToAmount
        });
        return bridgeTokenOutOptions;
    }

    function testGetIntentAddr() public view {
        PayIntent memory cctpIntent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        address actualCCTPIntentAddr = intentFactory.getIntentAddress(
            cctpIntent
        );
        console.log("actual CCTP intent addr:", actualCCTPIntentAddr);

        PayIntent memory cctpV2Intent = PayIntent({
            toChainId: _cctpV2DestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        address actualCCTPV2IntentAddr = intentFactory.getIntentAddress(
            cctpV2Intent
        );
        console.log("actual CCTP v2 intent addr:", actualCCTPV2IntentAddr);

        // Get the intent address for the Linea chain
        PayIntent memory acrossIntent = PayIntent({
            toChainId: _acrossDestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });
        address actualAcrossIntentAddr = intentFactory.getIntentAddress(
            acrossIntent
        );
        console.log("actual across intent addr:", actualAcrossIntentAddr);

        // Get the intent address for the BNB chain
        PayIntent memory axelarIntent = PayIntent({
            toChainId: _axelarDestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });
        address actualAxelarIntentAddr = intentFactory.getIntentAddress(axelarIntent);
        console.log("actual axelar intent addr:", actualAxelarIntentAddr);

        assertEq(actualCCTPIntentAddr, CCTP_INTENT_ADDR);
        assertEq(actualCCTPV2IntentAddr, CCTP_V2_INTENT_ADDR);
        assertEq(actualAcrossIntentAddr, ACROSS_INTENT_ADDR);
        assertEq(actualAxelarIntentAddr, AXELAR_INTENT_ADDR);
    }

    function getSimpleSameChainPayIntent()
        public
        view
        returns (PayIntent memory intent)
    {
        intent = PayIntent({
            toChainId: _fromChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({
                token: IERC20(address(0)),
                amount: _toAmount
            }),
            finalCall: Call({to: _bob, value: _toAmount, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });
    }

    // Test that startIntent succeeds when the intent is on the same chain.
    // Simple = no swap, no finalCall.
    function testSimpleSameChainStart() public {
        vm.chainId(_fromChainId);

        // Give Alice some USDC
        _toToken.transfer(_alice, 555);

        // Create a payment intent which specifies the native token as output.
        PayIntent memory intent = getSimpleSameChainPayIntent();
        address intentAddr = intentFactory.getIntentAddress(intent);

        // Alice sends some TestUSDC to the intent address
        vm.prank(_alice);
        require(_toToken.transfer(intentAddr, 100));
        require(_toToken.balanceOf(intentAddr) == 100);

        // Since we're already on dest chain, startIntent verifies that we have
        // enough of bridgeTokenOut (see bridgeTokenOutOptions) post swap.
        // Simplest case: no swap, initial payment was already in correct token.
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: ""
        });
        require(_toToken.balanceOf(intentAddr) == 100);
    }

    // Test refundIntent for a same-chain intent. The refund should only be
    // possible after the intent has been claimed.
    function testSameChainRefundAfterClaim() public {
        testSimpleSameChainStart();

        PayIntent memory intent = getSimpleSameChainPayIntent();
        address intentAddr = intentFactory.getIntentAddress(intent);

        // Since we are on the dest chain already, we *cannot* refund after
        // startIntent.
        vm.expectRevert(bytes("DP: not claimed"));
        dp.refundIntent({intent: intent, token: _toToken});

        // Fast-finish it, fronting some native token.
        (bool success, ) = payable(address(dp)).call{value: 100}("");
        require(success, "send failed");
        dp.fastFinishIntent({intent: intent, calls: new Call[](0)});

        // We still can't refund.
        vm.expectRevert(bytes("DP: not claimed"));
        dp.refundIntent({intent: intent, token: _toToken});

        // Claim the intent.
        require(_toToken.balanceOf(intentAddr) == 100);
        dp.claimIntent({intent: intent, calls: new Call[](0)});
        require(_toToken.balanceOf(intentAddr) == 0);

        // Nothing to refund.
        vm.expectRevert(bytes("PI: no funds to refund"));
        dp.refundIntent({intent: intent, token: _toToken});

        // Double-pay the intent...
        vm.prank(_alice);
        require(_toToken.transfer(intentAddr, 100));
        assertEq(_toToken.balanceOf(intentAddr), 100);
        assertEq(_toToken.balanceOf(_alice), 355);

        // ...and refund.
        dp.refundIntent({intent: intent, token: _toToken});

        // Check that the intent was refunded.
        assertEq(_toToken.balanceOf(intentAddr), 0);
        assertEq(_toToken.balanceOf(_alice), 455);
    }

    function getSimpleCrossChainPayIntent()
        public
        view
        returns (PayIntent memory intent)
    {
        intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });
    }

    // Test a simple startIntent call that bridges using CCTP.
    // Simple = no pre-swap, no post-call.
    function testSimpleCCTPStart() public {
        vm.chainId(_fromChainId);

        // Give Alice some coins
        _fromToken.transfer(_alice, 555);

        // Alice initiates a transfer
        vm.startPrank(_alice);

        PayIntent memory intent = getSimpleCrossChainPayIntent();

        // Alice sends some coins to the intent address
        address intentAddr = intentFactory.getIntentAddress(intent);
        _fromToken.transfer(intentAddr, _toAmount);

        vm.expectEmit(address(cctpBridger));
        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: address(bridger),
            fromToken: address(_fromToken),
            fromAmount: _toAmount,
            toChainId: _cctpDestchainId,
            toAddress: CCTP_INTENT_ADDR,
            toToken: address(_toToken),
            toAmount: _toAmount
        });
        vm.expectEmit(address(dp));
        emit DaimoPay.Start(CCTP_INTENT_ADDR, intent);

        uint256 gasBefore = gasleft();
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: ""
        });
        uint256 gasAfter = gasleft();

        console.log("gas used", gasBefore - gasAfter);

        vm.stopPrank();

        assertEq(dp.intentSent(intentAddr), true, "intent not sent");
        // Check that the CCTP messenger burned tokens
        assertEq(
            messenger.amountBurned(),
            _toAmount,
            "incorrect CCTP amount burned"
        );
        // Check that the Across bridger did not receive tokens
        assertEq(
            spokePool.totalInputAmount(),
            0,
            "incorrect Across amount received"
        );
        // Check that the Axelar bridger didn't receive tokens
        assertEq(
            axelarGateway.totalAmount(),
            0,
            "incorrect Axelar amount received"
        );
    }

    // Test refundIntent for a cross-chain intent. The refund should only be
    // possible after the intent has been started.
    function testCrossChainRefundAfterStart() public {
        PayIntent memory intent = getSimpleCrossChainPayIntent();
        address intentAddr = intentFactory.getIntentAddress(intent);

        // The intent hasn't been started yet, so we can't refund.
        vm.expectRevert(bytes("DP: not started"));
        dp.refundIntent({intent: intent, token: _toToken});

        // Start the intent.
        testSimpleCCTPStart();

        // Nothing to refund.
        vm.expectRevert(bytes("PI: no funds to refund"));
        dp.refundIntent({intent: intent, token: _toToken});

        // Double-pay the intent...
        vm.chainId(_fromChainId);
        vm.prank(_alice);
        require(_fromToken.transfer(intentAddr, 100));
        assertEq(_fromToken.balanceOf(intentAddr), 100);
        assertEq(_fromToken.balanceOf(_alice), 355);

        // ...and refund.
        dp.refundIntent({intent: intent, token: _fromToken});

        // Check that the intent was refunded.
        assertEq(_fromToken.balanceOf(intentAddr), 0);
        assertEq(_fromToken.balanceOf(_alice), 455);
    }

    // Test a simple startIntent call that bridges using CCTPV2.
    // Simple = no pre-swap, no post-call.
    function testSimpleCCTPV2Start() public {
        vm.chainId(_fromChainId);

        // Give Alice some coins
        _fromToken.transfer(_alice, 555);

        // Alice initiates a transfer
        vm.startPrank(_alice);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpV2DestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // Alice sends some coins to the intent address
        address intentAddr = intentFactory.getIntentAddress(intent);
        _fromToken.transfer(intentAddr, _toAmount);

        vm.expectEmit(address(cctpV2Bridger));
        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: address(bridger),
            fromToken: address(_fromToken),
            fromAmount: _toAmount,
            toChainId: _cctpV2DestChainId,
            toAddress: CCTP_V2_INTENT_ADDR,
            toToken: address(_toToken),
            toAmount: _toAmount
        });
        vm.expectEmit(address(dp));
        emit DaimoPay.Start(CCTP_V2_INTENT_ADDR, intent);

        // Create the ExtraData struct for CCTP v2 bridging
        DaimoPayCCTPV2Bridger.ExtraData memory extraData = DaimoPayCCTPV2Bridger
            .ExtraData({
                maxFee: 0,
                minFinalityThreshold: 2000
            });

        uint256 gasBefore = gasleft();
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: abi.encode(extraData)
        });
        uint256 gasAfter = gasleft();

        console.log("gas used", gasBefore - gasAfter);

        vm.stopPrank();

        assertEq(dp.intentSent(intentAddr), true, "intent not sent");
        // Check that the CCTP v2 messenger burned tokens
        assertEq(
            messengerV2.amountBurned(),
            _toAmount,
            "incorrect CCTPV2 amount burned"
        );
        // Check that the CCTP v1 messenger didn't burn tokens
        assertEq(messenger.amountBurned(), 0, "incorrect CCTP amount burned");
        // Check that the Across bridger did not receive tokens
        assertEq(
            spokePool.totalInputAmount(),
            0,
            "incorrect Across amount received"
        );
        // Check that the Axelar bridger didn't receive tokens
        assertEq(
            axelarGateway.totalAmount(),
            0,
            "incorrect Axelar amount received"
        );
    }

    // Test a simple startIntent call that bridges using Across.
    // Simple = no pre-swap, no post-call.
    function testSimpleAcrossStart() public {
        vm.chainId(_fromChainId);

        // Give Alice some coins
        _fromToken.transfer(_alice, 555);

        // Alice initiates a transfer
        vm.startPrank(_alice);

        PayIntent memory intent = PayIntent({
            toChainId: _acrossDestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // Create the ExtraData struct for Across bridging
        DaimoPayAcrossBridger.ExtraData memory extraData = DaimoPayAcrossBridger
            .ExtraData({
                exclusiveRelayer: address(0),
                quoteTimestamp: uint32(block.timestamp),
                fillDeadline: uint32(block.timestamp + 1 hours),
                exclusivityDeadline: 0,
                message: "gm ser"
            });

        // Alice sends some coins to the intent address. The Across bridger
        // expects the maximum of either a 1% fee or 10 USDC (=$0.00001) flat
        // fee. Send more than enough for the fee.
        uint256 inputAmount = 120;
        address intentAddr = intentFactory.getIntentAddress(intent);
        _fromToken.transfer(intentAddr, inputAmount);

        // The Across bridger should only take what is needed to cover the fee.
        uint256 expectedInputAmount = 110; // _toAmount with 10 USDC flat fee

        vm.expectEmit(address(acrossBridger));
        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: address(bridger),
            fromToken: address(_fromToken),
            fromAmount: expectedInputAmount,
            toChainId: _acrossDestChainId,
            toAddress: ACROSS_INTENT_ADDR,
            toToken: address(_toToken),
            toAmount: _toAmount
        });

        // Extra tokens should be refunded to the caller
        vm.expectEmit(address(_fromToken));
        emit IERC20.Transfer(ACROSS_INTENT_ADDR, _alice, 10);

        vm.expectEmit(address(dp));
        emit DaimoPay.Start(ACROSS_INTENT_ADDR, intent);

        uint256 gasBefore = gasleft();
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: abi.encode(extraData)
        });
        uint256 gasAfter = gasleft();

        console.log("gas used", gasBefore - gasAfter);

        vm.stopPrank();

        assertEq(dp.intentSent(intentAddr), true, "intent not sent");
        // Check that the Across bridger received tokens
        assertEq(
            spokePool.totalInputAmount(),
            expectedInputAmount,
            "incorrect Across amount received"
        );
        // Check that the CCTP messenger didn't burn tokens
        assertEq(messenger.amountBurned(), 0, "incorrect CCTP amount burned");
        // Check that the Axelar bridger didn't receive tokens
        assertEq(
            axelarGateway.totalAmount(),
            0,
            "incorrect Axelar amount received"
        );

        // Check that the extra tokens were refunded to the caller
        assertEq(_fromToken.balanceOf(_alice), 555 - 120 + 10);
    }

    // Test a simple startIntent call that bridges using Axelar.
    // Simple = no pre-swap, no post-call.
    function testSimpleAxelarStart() public {
        vm.chainId(_fromChainId);

        // Give Alice some coins
        _fromToken.transfer(_alice, 555);

        // Alice initiates a transfer
        vm.startPrank(_alice);

        PayIntent memory intent = PayIntent({
            toChainId: _axelarDestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // Alice sends some coins to the intent address
        address intentAddr = intentFactory.getIntentAddress(intent);
        _fromToken.transfer(intentAddr, _toAmount);

        // Give the DaimoPayAxelarBridger some native token to pay for gas
        vm.deal(address(axelarBridger), 10);

        vm.expectEmit(address(axelarBridger));
        emit IDaimoPayBridger.BridgeInitiated({
            fromAddress: address(bridger),
            fromToken: address(_fromToken),
            fromAmount: _toAmount,
            toChainId: _axelarDestChainId,
            toAddress: intentAddr,
            toToken: address(_toToken),
            toAmount: _toAmount
        });

        vm.expectEmit(address(dp));
        emit DaimoPay.Start(intentAddr, intent);

        // Encode the refund address in the bridgeExtraData
        bytes memory bridgeExtraData = abi.encode(
            DaimoPayAxelarBridger.ExtraData({
                gasRefundAddress: _alice,
                useExpress: false
            })
        );

        uint256 gasBefore = gasleft();
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: bridgeExtraData
        });
        uint256 gasAfter = gasleft();

        console.log("gas used", gasBefore - gasAfter);

        vm.stopPrank();

        assertEq(dp.intentSent(intentAddr), true, "intent not sent");
        // Check that the gas service received the correct amount
        assertEq(
            address(axelarGasService).balance,
            10,
            "incorrect gas service balance"
        );
        // Check that the Axelar bridger received tokens
        assertEq(
            axelarGateway.totalAmount(),
            _toAmount,
            "incorrect Axelar amount received"
        );
        // Check that the CCTP messenger didn't burn tokens
        assertEq(messenger.amountBurned(), 0, "incorrect CCTP amount burned");
        // Check that the Across bridger didn't receive tokens
        assertEq(
            spokePool.totalInputAmount(),
            0,
            "incorrect Across amount received"
        );
    }

    // Test that a simple fastFinishIntent completes successfully.
    // Simple = no swap, no finalCall, just a transfer to the recipient.
    function testSimpleFastFinish() public {
        vm.chainId(_cctpDestchainId);

        // Seed the LP with an initial balance
        _toToken.transfer(_lp, _lpToTokenInitBalance);

        // Immediately after Alice's tx confirms, LP sends to Bob
        vm.startPrank(_lp);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // LP transfers the token to the intent address
        _toToken.transfer({to: address(dp), value: _toAmount});

        vm.expectEmit(address(dp));
        emit DaimoPay.IntentFinished({
            intentAddr: CCTP_INTENT_ADDR,
            destinationAddr: _bob,
            success: true,
            intent: intent
        });
        vm.expectEmit(address(dp));
        emit DaimoPay.FastFinish({
            intentAddr: CCTP_INTENT_ADDR,
            newRecipient: _lp
        });

        dp.fastFinishIntent({intent: intent, calls: new Call[](0)});

        vm.stopPrank();

        // LP sent funds to the recipient
        assertEq(_toToken.balanceOf(_lp), _lpToTokenInitBalance - _toAmount);
        assertEq(_toToken.balanceOf(_bob), _toAmount);
    }

    // Test that the LP gets refunded any surplus tokens after fast finishing
    // the intent.
    function testSimpleFastFinishWithLeftover() public {
        vm.chainId(_cctpDestchainId);

        // Seed the LP with an initial balance
        _toToken.transfer(_lp, _lpToTokenInitBalance);

        // Immediately after Alice's tx confirms, LP sends to Bob
        vm.startPrank(_lp);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: 1}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // LP transfers too much of finalCallToken to finish the intent.
        // Only 1 is needed, but 10 is sent.
        _toToken.transfer({to: address(dp), value: 10});

        // An extra 9 of finalCallToken should be sent back to the LP
        vm.expectEmit(address(_toToken));
        emit IERC20.Transfer(address(dp), _lp, 9);

        dp.fastFinishIntent({intent: intent, calls: new Call[](0)});

        vm.stopPrank();

        // LP sent only 1 of finalCallToken to the recipient and 9 were sent back
        assertEq(_toToken.balanceOf(_lp), _lpToTokenInitBalance - 1);
        assertEq(_toToken.balanceOf(_bob), 1);
    }

    // Test that the LP can claim the funds after the bridged funds arrive.
    function testSimpleLPClaim() public {
        testSimpleFastFinish();

        // Wait for CCTP to relay the message
        vm.warp(block.timestamp + 20 minutes);

        // CCTP receiveMessage() sends funds to the intent address
        _toToken.transfer(CCTP_INTENT_ADDR, _toAmount);

        // Then, LP claims the funds
        vm.prank(_lp);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        vm.expectEmit(address(dp));
        emit DaimoPay.Claim({
            intentAddr: CCTP_INTENT_ADDR,
            finalRecipient: _lp
        });

        dp.claimIntent({intent: intent, calls: new Call[](0)});

        // LP received funds from intent, and intent is destroyed. Bob has
        // _toAmount tokens from the fast finish.
        assertEq(_toToken.balanceOf(CCTP_INTENT_ADDR), 0);
        assertEq(_toToken.balanceOf(_lp), _lpToTokenInitBalance);
        assertEq(_toToken.balanceOf(_bob), _toAmount);
    }

    // Test that the funds are sent to the final recipient if no LP claims.
    function testClaimWithoutFastFinish() public {
        vm.chainId(_cctpDestchainId);

        // Wait for CCTP to relay the message
        vm.warp(block.timestamp + 20 minutes);

        // CCTP receiveMessage() sends funds to the intent address
        _toToken.transfer(CCTP_INTENT_ADDR, _toAmount);

        // Then, a third party calls claimIntent
        vm.prank(_lp);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        vm.expectEmit(address(dp));
        emit DaimoPay.IntentFinished({
            intentAddr: CCTP_INTENT_ADDR,
            destinationAddr: _bob,
            success: true,
            intent: intent
        });
        vm.expectEmit(address(dp));
        emit DaimoPay.Claim({
            intentAddr: CCTP_INTENT_ADDR,
            finalRecipient: _bob
        });

        dp.claimIntent({intent: intent, calls: new Call[](0)});

        // LP doesn't receive funds, intent is destroyed, and funds are sent
        // to Bob
        assertEq(_toToken.balanceOf(CCTP_INTENT_ADDR), 0);
        assertEq(_toToken.balanceOf(_lp), 0);
        assertEq(_toToken.balanceOf(_bob), _toAmount);
    }

    // Test that the contract reverts when the intent address doesn't have
    // sufficient balance of any bridge token option.
    function testClaimWithInsufficientBalance() public {
        vm.chainId(_cctpDestchainId);

        // Send insufficient funds to the intent address
        _toToken.transfer(CCTP_INTENT_ADDR, _toAmount - 1);
        _bridgeTokenOption.transfer(
            CCTP_INTENT_ADDR,
            _bridgeTokenOptionToAmount - 1
        );

        // Then, LP claims the funds
        vm.prank(_lp);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        vm.expectRevert("PI: insufficient token received");

        dp.claimIntent({intent: intent, calls: new Call[](0)});

        // LP didn't receive funds from intent and the tokens are still in the
        // intent address
        assertEq(_toToken.balanceOf(CCTP_INTENT_ADDR), _toAmount - 1);
        assertEq(
            _bridgeTokenOption.balanceOf(CCTP_INTENT_ADDR),
            _bridgeTokenOptionToAmount - 1
        );
        assertEq(_toToken.balanceOf(_lp), 0);
        assertEq(_bridgeTokenOption.balanceOf(_lp), 0);
    }

    // Test that the contract reverts when the fromToken doesn't match the
    // localToken returned by the CCTP TokenMinter.
    function testCCTPFromAndToTokenMismatch() public {
        vm.chainId(_cctpDestchainId);

        // Give Alice some coins
        _unregisteredToken.transfer(_alice, 555);

        // Alice initiates a transfer
        vm.startPrank(_alice);

        PayIntent memory intent = PayIntent({
            toChainId: _cctpDestchainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // Alice sends some coins to the intent address
        address intentAddr = intentFactory.getIntentAddress(intent);
        _unregisteredToken.transfer(intentAddr, _toAmount);

        // Expect revert due to token mismatch
        vm.expectRevert();
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: ""
        });
        vm.stopPrank();
    }

    // Test that the contract reverts when the fromToken doesn't match the
    // inputToken stored in the DaimoPayAcrossBridger.
    function testAcrossFromAndToTokenMismatch() public {
        vm.chainId(_fromChainId);

        // Give Alice some coins
        _unregisteredToken.transfer(_alice, 555);

        // Alice initiates a transfer
        vm.startPrank(_alice);

        PayIntent memory intent = PayIntent({
            toChainId: _acrossDestChainId,
            bridgeTokenOutOptions: getBridgeTokenOutOptions(),
            finalCallToken: TokenAmount({token: _toToken, amount: _toAmount}),
            finalCall: Call({to: _bob, value: 0, data: ""}),
            escrow: payable(address(dp)),
            refundAddress: _alice,
            nonce: _nonce
        });

        // Alice sends some coins to the intent address
        address intentAddr = intentFactory.getIntentAddress(intent);
        _unregisteredToken.transfer(intentAddr, _toAmount);

        // Expect revert due to token mismatch
        vm.expectRevert();
        dp.startIntent({
            intent: intent,
            calls: new Call[](0),
            bridgeExtraData: ""
        });
        vm.stopPrank();
    }

    // Test that the Across bridger correctly calculates the input amount with
    // a fees included.
    function testAcrossFeeCalculation() public view {
        // 1% fee is higher than the 10 USDC flat fee for 1,000,000 USDC, so
        // the input amount should use the 1% fee.
        uint256 largeOutputAmount = 1000000;
        uint256 expectedLargeInputAmount = 1010000;
        TokenAmount[] memory bridgeTokenOutOptions = new TokenAmount[](2);
        bridgeTokenOutOptions[0] = TokenAmount({
            token: _toToken,
            amount: largeOutputAmount
        });
        bridgeTokenOutOptions[1] = TokenAmount({
            token: _bridgeTokenOption,
            amount: 1
        });
        (
            address actualLargeInputToken,
            uint256 actualLargeInputAmount
        ) = acrossBridger.getBridgeTokenIn({
                toChainId: _acrossDestChainId,
                bridgeTokenOutOptions: bridgeTokenOutOptions
            });
        assertEq(
            actualLargeInputAmount,
            expectedLargeInputAmount,
            "incorrect large input amount"
        );
        // The Linea bridge route uses (_fromToken, _toToken) as the bridge token
        assertEq(actualLargeInputToken, address(_fromToken), "incorrect token");

        // 10 USDC flat fee is higher than the 1% fee for 1 USDC, so the input
        // amount should use the flat fee.
        uint256 smallOutputAmount = 1;
        uint256 expectedSmallInputAmount = 11;
        bridgeTokenOutOptions[0] = TokenAmount({
            token: _toToken,
            amount: smallOutputAmount
        });
        (
            address actualSmallInputToken,
            uint256 actualSmallInputAmount
        ) = acrossBridger.getBridgeTokenIn({
                toChainId: _acrossDestChainId,
                bridgeTokenOutOptions: bridgeTokenOutOptions
            });
        assertEq(
            actualSmallInputAmount,
            expectedSmallInputAmount,
            "incorrect small input amount"
        );
        // The Linea bridge route uses (_fromToken, _toToken) as the bridge token
        assertEq(actualSmallInputToken, address(_fromToken), "incorrect token");
    }
}
