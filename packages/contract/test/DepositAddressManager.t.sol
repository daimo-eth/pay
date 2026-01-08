// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {
    DepositAddressManager,
    DepositAddressReceiver
} from "../src/DepositAddressManager.sol";
import {DepositAddressFactory} from "../src/DepositAddressFactory.sol";
import {
    DepositAddress,
    DepositAddressRoute,
    DepositAddressIntent
} from "../src/DepositAddress.sol";
import {DaimoPayPricer} from "../src/DaimoPayPricer.sol";
import {PriceData} from "../src/interfaces/IDaimoPayPricer.sol";
import {
    IUniversalAddressBridger
} from "../src/interfaces/IUniversalAddressBridger.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {Call} from "../src/DaimoPayExecutor.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";
import {DummyUniversalBridger} from "./utils/DummyUniversalBridger.sol";
import {ReentrantToken} from "./utils/ReentrantToken.sol";

contract DepositAddressManagerTest is Test {
    // ---------------------------------------------------------------------
    // Test constants & actors
    // ---------------------------------------------------------------------
    uint256 private constant SOURCE_CHAIN_ID = 1; // Ethereum
    uint256 private constant DEST_CHAIN_ID = 8453; // Base

    address private constant RECIPIENT = address(0x1234);
    address private constant REFUND_ADDRESS = address(0x5678);
    address private constant RELAYER = address(0x9ABC);

    uint256 private constant TRUSTED_SIGNER_KEY = 0xa11ce;
    uint256 private constant MAX_PRICE_AGE = 300; // 5 minutes

    uint256 private constant MAX_START_SLIPPAGE_BPS = 100; // 1%
    uint256 private constant MAX_FAST_FINISH_SLIPPAGE_BPS = 50; // 0.5%
    uint256 private constant MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS = 120; // 1.20%

    uint256 private constant USDC_PRICE = 1e18; // $1 with 18 decimals
    uint256 private constant PAYMENT_AMOUNT = 100e6; // 100 USDC (6 decimals)
    uint256 private constant BRIDGE_AMOUNT = 99e6; // After slippage

    // ---------------------------------------------------------------------
    // Deployed contracts
    // ---------------------------------------------------------------------
    DepositAddressManager private manager;
    DepositAddressFactory private factory;
    DaimoPayPricer private pricer;
    DummyUniversalBridger private bridger;
    TestUSDC private usdc;

    address private trustedSigner;

    // ---------------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------------
    function setUp() public {
        // Set chain ID for source chain
        vm.chainId(SOURCE_CHAIN_ID);

        // Setup trusted signer
        trustedSigner = vm.addr(TRUSTED_SIGNER_KEY);

        // Deploy contracts
        pricer = new DaimoPayPricer(trustedSigner, MAX_PRICE_AGE);
        bridger = new DummyUniversalBridger();
        factory = new DepositAddressFactory();

        // Deploy manager as upgradeable proxy
        DepositAddressManager managerImpl = new DepositAddressManager();
        ERC1967Proxy managerProxy = new ERC1967Proxy(
            address(managerImpl),
            abi.encodeCall(
                DepositAddressManager.initialize,
                (address(this), factory)
            )
        );
        manager = DepositAddressManager(payable(address(managerProxy)));

        manager.setRelayer(RELAYER, true);

        // Deploy test USDC and mint to test contracts
        usdc = new TestUSDC();
    }

    // ---------------------------------------------------------------------
    // Helper functions
    // ---------------------------------------------------------------------

    /// @dev Creates a standard route for testing
    function _createRoute() internal view returns (DepositAddressRoute memory) {
        return
            DepositAddressRoute({
                toChainId: DEST_CHAIN_ID,
                toToken: usdc,
                toAddress: RECIPIENT,
                refundAddress: REFUND_ADDRESS,
                escrow: address(manager),
                bridger: IUniversalAddressBridger(address(bridger)),
                pricer: pricer,
                maxStartSlippageBps: MAX_START_SLIPPAGE_BPS,
                maxFastFinishSlippageBps: MAX_FAST_FINISH_SLIPPAGE_BPS,
                maxSameChainFinishSlippageBps: MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS,
                expiresAt: block.timestamp + 1000
            });
    }

    /// @dev Creates price data and signs it with the trusted signer
    function _createSignedPriceData(
        address token,
        uint256 priceUsd,
        uint256 timestamp
    ) internal view returns (PriceData memory) {
        PriceData memory priceData = PriceData({
            token: token,
            priceUsd: priceUsd,
            timestamp: timestamp,
            signature: ""
        });

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);
        return priceData;
    }

    /// @dev Signs price data
    function _signPriceData(
        PriceData memory priceData,
        uint256 signerKey
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                priceData.token,
                priceData.priceUsd,
                priceData.timestamp,
                block.chainid
            )
        );

        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerKey,
            ethSignedMessageHash
        );
        return abi.encodePacked(r, s, v);
    }

    /// @dev Funds a deposit address with USDC
    function _fundDepositAddress(
        DepositAddress vault,
        uint256 amount
    ) internal {
        usdc.transfer(address(vault), amount);
    }

    // ---------------------------------------------------------------------
    // startIntent - Success cases
    // ---------------------------------------------------------------------

    function test_startIntent_Success() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create bridge token out
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // No swap calls needed (USDC -> USDC)
        Call[] memory calls = new Call[](0);

        bytes memory bridgeExtraData = "";

        // Execute startIntent
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });

        // Verify receiver is marked as used
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);
        assertTrue(manager.receiverUsed(receiverAddress));

        // Verify bridger burned the tokens
        assertTrue(usdc.balanceOf(address(0xdead)) == BRIDGE_AMOUNT);
    }

    function test_startIntent_EmitsStartEvent() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Create expected intent
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Expect Start event
        vm.expectEmit(true, true, false, true);
        emit DepositAddressManager.Start({
            depositAddress: address(vault),
            receiverAddress: receiverAddress,
            route: route,
            intent: intent,
            paymentToken: address(usdc),
            paymentAmount: PAYMENT_AMOUNT
        });

        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_MultipleDifferentSalts() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Start with three different salts
        bytes32[] memory salts = new bytes32[](3);
        salts[0] = keccak256("salt-1");
        salts[1] = keccak256("salt-2");
        salts[2] = keccak256("salt-3");

        for (uint256 i = 0; i < salts.length; i++) {
            // Fund vault before each transfer (sendBalance transfers entire balance)
            _fundDepositAddress(vault, PAYMENT_AMOUNT);

            vm.prank(RELAYER);
            manager.startIntent({
                route: route,
                paymentToken: usdc,
                bridgeTokenOut: bridgeTokenOut,
                paymentTokenPrice: paymentTokenPrice,
                bridgeTokenInPrice: bridgeTokenInPrice,
                relaySalt: salts[i],
                calls: calls,
                bridgeExtraData: bridgeExtraData
            });

            // Verify each receiver is marked as used
            DepositAddressIntent memory intent = DepositAddressIntent({
                depositAddress: address(vault),
                relaySalt: salts[i],
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
            (address receiverAddress, ) = manager.computeReceiverAddress(
                intent
            );
            assertTrue(manager.receiverUsed(receiverAddress));
        }
    }

    // ---------------------------------------------------------------------
    // startIntent - Validation failures
    // ---------------------------------------------------------------------

    function test_startIntent_RevertsOnDestChain() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: start on dest chain"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsWrongEscrow() public {
        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0xDEAD); // Wrong escrow

        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: wrong escrow"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsExpired() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Expect revert
        vm.prank(RELAYER);
        vm.expectRevert("DAM: expired");
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsInvalidPaymentPrice() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data signed by wrong signer
        PriceData memory paymentTokenPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        paymentTokenPrice.signature = _signPriceData(paymentTokenPrice, 0xBAD);

        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: payment price invalid"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsInvalidBridgePrice() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data signed by wrong signer
        PriceData memory bridgeTokenInPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        bridgeTokenInPrice.signature = _signPriceData(
            bridgeTokenInPrice,
            0xBAD
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: bridge price invalid"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsReceiverAlreadyUsed() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // First call succeeds
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });

        // Fund vault again for second attempt
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Second call with same salt should revert
        vm.expectRevert(bytes("DAM: receiver used"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsBridgeTokenPriceMismatch() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data for wrong token
        address wrongToken = address(0x999);
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            wrongToken,
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: bridge token mismatch"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsBridgeInputTooLow() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Bridge amount too low - less than minimum after slippage
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: 50e6 // Much less than expected
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: bridge input low"));
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_startIntent_RevertsNotRelayer() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.expectRevert(bytes("DAM: not relayer"));
        vm.prank(address(0x1111));
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });
    }

    // ---------------------------------------------------------------------
    // computeReceiverAddress tests
    // ---------------------------------------------------------------------

    function test_computeReceiverAddress_Deterministic() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });

        (address addr1, bytes32 salt1) = manager.computeReceiverAddress(intent);
        (address addr2, bytes32 salt2) = manager.computeReceiverAddress(intent);

        // Should be deterministic
        assertEq(addr1, addr2);
        assertEq(salt1, salt2);
    }

    function test_computeReceiverAddress_DifferentForDifferentSalts() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        DepositAddressIntent memory intent1 = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: keccak256("salt-1"),
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });

        DepositAddressIntent memory intent2 = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: keccak256("salt-2"),
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });

        (address addr1, ) = manager.computeReceiverAddress(intent1);
        (address addr2, ) = manager.computeReceiverAddress(intent2);

        // Should be different
        assertTrue(addr1 != addr2);
    }

    function test_computeReceiverAddress_DifferentForDifferentAmounts() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent1 = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: TokenAmount({token: usdc, amount: 100e6}),
            sourceChainId: SOURCE_CHAIN_ID
        });

        DepositAddressIntent memory intent2 = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: TokenAmount({token: usdc, amount: 200e6}),
            sourceChainId: SOURCE_CHAIN_ID
        });

        (address addr1, ) = manager.computeReceiverAddress(intent1);
        (address addr2, ) = manager.computeReceiverAddress(intent2);

        // Should be different
        assertTrue(addr1 != addr2);
    }

    // ---------------------------------------------------------------------
    // Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_startIntent_DifferentAmounts(uint256 amount) public {
        // Bound to reasonable amounts (1 USDC to 1M USDC)
        amount = bound(amount, 1e6, 1_000_000e6);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, amount);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Bridge amount should account for slippage
        uint256 bridgeAmount = (amount * (10_000 - MAX_START_SLIPPAGE_BPS)) /
            10_000;
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: bridgeAmount
        });

        bytes32 relaySalt = keccak256(abi.encodePacked("salt", amount));
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: usdc,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });

        // Verify receiver is marked as used
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);
        assertTrue(manager.receiverUsed(receiverAddress));
    }

    function testFuzz_computeReceiverAddress_UniqueSalts(
        bytes32 salt1,
        bytes32 salt2
    ) public {
        vm.assume(salt1 != salt2);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        DepositAddressIntent memory intent1 = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: salt1,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });

        DepositAddressIntent memory intent2 = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: salt2,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });

        (address addr1, ) = manager.computeReceiverAddress(intent1);
        (address addr2, ) = manager.computeReceiverAddress(intent2);

        // Different salts should produce different addresses
        assertTrue(addr1 != addr2);
    }

    // ---------------------------------------------------------------------
    // fastFinishIntent - Success cases
    // ---------------------------------------------------------------------

    function test_fastFinishIntent_Success() public {
        // Switch to destination chain for fastFinish
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        // Create bridge token out
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // Create price data (on dest chain)
        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // No swap calls needed (USDC -> USDC)
        Call[] memory calls = new Call[](0);

        // Fund relayer with tokens to deliver early
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        // Compute expected receiver address
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Execute fastFinishIntent
        // Relayer transfers tokens to manager first (required by the contract)
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Verify relayer is recorded as recipient for the receiver address
        assertEq(manager.receiverToRecipient(receiverAddress), RELAYER);

        // Verify recipient received the toToken
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT);
    }

    function test_fastFinishIntent_EmitsFastFinishEvent() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        // Create expected intent
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Relayer transfers tokens to manager first
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);

        // Expect FastFinish event
        vm.expectEmit(true, true, true, true);
        emit DepositAddressManager.FastFinish({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            newRecipient: RELAYER,
            route: route,
            intent: intent,
            outputAmount: BRIDGE_AMOUNT
        });

        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_MultipleDifferentSalts() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Multiple salts
        bytes32[] memory salts = new bytes32[](3);
        salts[0] = keccak256("salt-1");
        salts[1] = keccak256("salt-2");
        salts[2] = keccak256("salt-3");

        for (uint256 i = 0; i < salts.length; i++) {
            // Fund relayer for each fast finish
            usdc.transfer(RELAYER, BRIDGE_AMOUNT);

            vm.startPrank(RELAYER);
            usdc.transfer(address(manager), BRIDGE_AMOUNT);
            manager.fastFinishIntent({
                route: route,
                calls: calls,
                token: usdc,
                bridgeTokenOutPrice: bridgeTokenOutPrice,
                toTokenPrice: toTokenPrice,
                bridgeTokenOut: bridgeTokenOut,
                relaySalt: salts[i],
                sourceChainId: SOURCE_CHAIN_ID
            });
            vm.stopPrank();

            // Verify relayer recorded for each receiver address
            DepositAddressIntent memory intent = DepositAddressIntent({
                depositAddress: depositAddress,
                relaySalt: salts[i],
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
            (address receiverAddress, ) = manager.computeReceiverAddress(
                intent
            );
            assertEq(manager.receiverToRecipient(receiverAddress), RELAYER);
        }

        // Verify recipient received all tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT * 3);
    }

    // ---------------------------------------------------------------------
    // fastFinishIntent - Validation failures
    // ---------------------------------------------------------------------

    function test_fastFinishIntent_RevertsSameChain() public {
        // Stay on source chain (same as sourceChainId)
        vm.chainId(SOURCE_CHAIN_ID);

        // Create route that points to source chain
        DepositAddressRoute memory route = DepositAddressRoute({
            toChainId: SOURCE_CHAIN_ID,
            toToken: usdc,
            toAddress: RECIPIENT,
            refundAddress: REFUND_ADDRESS,
            escrow: address(manager),
            bridger: IUniversalAddressBridger(address(bridger)),
            pricer: pricer,
            maxStartSlippageBps: MAX_START_SLIPPAGE_BPS,
            maxFastFinishSlippageBps: MAX_FAST_FINISH_SLIPPAGE_BPS,
            maxSameChainFinishSlippageBps: MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS,
            expiresAt: block.timestamp + 1000
        });

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: same chain finish"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_RevertsWrongChain() public {
        // Call on wrong chain
        vm.chainId(999999999);

        DepositAddressRoute memory route = _createRoute(); // toChainId = DEST_CHAIN_ID

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: wrong chain"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_RevertsWrongEscrow() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0xDEAD); // Wrong escrow

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: wrong escrow"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_RevertsExpired() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Fund relayer with tokens to fast finish
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);

        // Expect revert
        vm.prank(RELAYER);
        vm.expectRevert("DAM: expired");
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_fastFinishIntent_RevertsInvalidBridgeTokenOutPrice() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // Create price data signed by wrong signer
        PriceData memory bridgeTokenOutPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        bridgeTokenOutPrice.signature = _signPriceData(
            bridgeTokenOutPrice,
            0xBAD
        );

        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: bridge token out price invalid"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_RevertsInvalidToTokenPrice() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data signed by wrong signer
        PriceData memory toTokenPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        toTokenPrice.signature = _signPriceData(toTokenPrice, 0xBAD);

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: toToken price invalid"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_RevertsAlreadyFinished() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Fund relayer for first fast finish
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        // First fast finish succeeds
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Fund relayer for second attempt
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        // Second fast finish with same salt should revert
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: already finished"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    function test_fastFinishIntent_RevertsNotRelayer() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        address notRelayer = address(0x1111);
        usdc.transfer(notRelayer, BRIDGE_AMOUNT);

        vm.startPrank(notRelayer);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: not relayer"));
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();
    }

    // ---------------------------------------------------------------------
    // fastFinishIntent - Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_fastFinishIntent_DifferentAmounts(uint256 amount) public {
        // Bound to reasonable amounts (1 USDC to 1M USDC)
        amount = bound(amount, 1e6, 1_000_000e6);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        // Calculate toAmount accounting for slippage
        uint256 toAmount = (amount * (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) /
            10_000;

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: amount
        });

        bytes32 relaySalt = keccak256(abi.encodePacked("salt", amount));

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, amount);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), amount);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Verify relayer is recorded as recipient
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);
        assertEq(manager.receiverToRecipient(receiverAddress), RELAYER);

        // Verify recipient got at least toAmount
        assertTrue(usdc.balanceOf(RECIPIENT) >= toAmount);
    }

    function testFuzz_fastFinishIntent_UniqueSalts(
        bytes32 salt1,
        bytes32 salt2
    ) public {
        vm.assume(salt1 != salt2);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Fast finish with first salt
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: salt1,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Fast finish with second salt should succeed
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: salt2,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Verify both receiver addresses recorded relayer
        DepositAddressIntent memory intent1 = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: salt1,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        DepositAddressIntent memory intent2 = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: salt2,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });

        (address receiverAddress1, ) = manager.computeReceiverAddress(intent1);
        (address receiverAddress2, ) = manager.computeReceiverAddress(intent2);

        assertEq(manager.receiverToRecipient(receiverAddress1), RELAYER);
        assertEq(manager.receiverToRecipient(receiverAddress2), RELAYER);
        assertTrue(receiverAddress1 != receiverAddress2);
    }

    // ---------------------------------------------------------------------
    // sameChainFinishIntent - Success cases
    // ---------------------------------------------------------------------

    function test_sameChainFinishIntent_Success() public {
        // Switch to destination chain for same chain finish
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Calculate expected min output after slippage
        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        // No swap calls needed (USDC -> USDC)
        Call[] memory calls = new Call[](0);

        // Execute sameChainFinishIntent
        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });

        // Verify recipient received the tokens
        assertEq(usdc.balanceOf(RECIPIENT), PAYMENT_AMOUNT);
    }

    function test_sameChainFinishIntent_EmitsSameChainFinishEvent() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        // Expect SameChainFinish event
        vm.expectEmit(true, false, false, true);
        emit DepositAddressManager.SameChainFinish({
            depositAddress: address(vault),
            route: route,
            paymentToken: address(usdc),
            paymentAmount: PAYMENT_AMOUNT,
            outputAmount: PAYMENT_AMOUNT
        });

        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_MultipleFinishes() public {
        vm.chainId(DEST_CHAIN_ID);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        // Create multiple routes with different recipients
        address[] memory recipients = new address[](3);
        recipients[0] = address(0x1111);
        recipients[1] = address(0x2222);
        recipients[2] = address(0x3333);

        for (uint256 i = 0; i < recipients.length; i++) {
            DepositAddressRoute memory route = _createRoute();
            route.toAddress = recipients[i];

            DepositAddress vault = factory.createDepositAddress(route);
            _fundDepositAddress(vault, PAYMENT_AMOUNT);

            vm.prank(RELAYER);
            manager.sameChainFinishIntent({
                route: route,
                paymentToken: usdc,
                paymentTokenPrice: paymentTokenPrice,
                toTokenPrice: toTokenPrice,
                toAmount: minOutput,
                calls: calls
            });

            // Verify each recipient received the tokens
            assertEq(usdc.balanceOf(recipients[i]), PAYMENT_AMOUNT);
        }
    }

    // ---------------------------------------------------------------------
    // sameChainFinishIntent - Validation failures
    // ---------------------------------------------------------------------

    function test_sameChainFinishIntent_RevertsWrongChain() public {
        // Stay on source chain (wrong chain for same chain finish)
        vm.chainId(SOURCE_CHAIN_ID);

        // _createRoute() returns toChainId = DEST_CHAIN_ID, different from current
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: wrong chain"));
        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_RevertsWrongEscrow() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0xDEAD); // Wrong escrow

        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: wrong escrow"));
        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_RevertsExpired() public {
        // Switch to destination chain for same-chain finish
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Expect revert
        vm.prank(RELAYER);
        vm.expectRevert("DAM: expired");
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: PAYMENT_AMOUNT,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_RevertsInvalidPaymentPrice() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data signed by wrong signer
        PriceData memory paymentTokenPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        paymentTokenPrice.signature = _signPriceData(paymentTokenPrice, 0xBAD);

        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: payment price invalid"));
        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_RevertsInvalidToTokenPrice() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data signed by wrong signer
        PriceData memory toTokenPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        toTokenPrice.signature = _signPriceData(toTokenPrice, 0xBAD);

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: toToken price invalid"));
        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_RevertsToAmountTooLow() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // toAmount too low - well below minimum after slippage
        uint256 tooLowAmount = 50e6;

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: toAmount low"));
        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: tooLowAmount,
            calls: calls
        });
    }

    function test_sameChainFinishIntent_RevertsNotRelayer() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        uint256 minOutput = (PAYMENT_AMOUNT *
            (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: not relayer"));
        vm.prank(address(0x1111)); // Not the relayer
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });
    }

    // ---------------------------------------------------------------------
    // sameChainFinishIntent - Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_sameChainFinishIntent_DifferentAmounts(
        uint256 amount
    ) public {
        // Bound to reasonable amounts (1 USDC to 1M USDC)
        amount = bound(amount, 1e6, 1_000_000e6);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, amount);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Calculate minimum output after slippage
        uint256 minOutput = (amount * (10_000 - MAX_FAST_FINISH_SLIPPAGE_BPS)) /
            10_000;

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });

        // Verify recipient received the full amount
        assertEq(usdc.balanceOf(RECIPIENT), amount);
    }

    function testFuzz_sameChainFinishIntent_DifferentSlippages(
        uint256 slippageBps
    ) public {
        // Bound slippage to 0-10%
        slippageBps = bound(slippageBps, 0, 1000);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        route.maxSameChainFinishSlippageBps = slippageBps;

        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Calculate minimum output after slippage
        uint256 minOutput = (PAYMENT_AMOUNT * (10_000 - slippageBps)) / 10_000;

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: minOutput,
            calls: calls
        });

        // Verify recipient received the full amount
        assertEq(usdc.balanceOf(RECIPIENT), PAYMENT_AMOUNT);
    }

    // ---------------------------------------------------------------------
    // claimIntent - Success cases (no fast finish)
    // ---------------------------------------------------------------------

    function test_claimIntent_Success_NoFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // Compute receiver address and fund it (simulating bridge arrival)
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Fund the receiver address (simulating bridged tokens arriving)
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Create price data
        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Execute claimIntent
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify intent marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress),
            manager.ADDR_MAX()
        );

        // Verify recipient received the tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT);
    }

    function test_claimIntent_Success_AfterFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // First: relayer fast finishes
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Verify recipient received tokens from fast finish
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT);

        // Compute receiver address and fund it (simulating bridge arrival)
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Fund the receiver address (simulating bridged tokens arriving)
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Record relayer balance before claim
        uint256 relayerBalanceBefore = usdc.balanceOf(RELAYER);

        // Execute claimIntent - should repay the relayer
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify intent marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress),
            manager.ADDR_MAX()
        );

        // Verify relayer was repaid
        assertEq(usdc.balanceOf(RELAYER), relayerBalanceBefore + BRIDGE_AMOUNT);
    }

    function test_claimIntent_EmitsClaimEvent_NoFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Expect Claim event with recipient as route.toAddress
        vm.expectEmit(true, true, true, true);
        emit DepositAddressManager.Claim({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            finalRecipient: RECIPIENT,
            route: route,
            intent: intent,
            outputAmount: BRIDGE_AMOUNT
        });

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_EmitsClaimEvent_AfterFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // First: relayer fast finishes
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Expect Claim event with recipient as RELAYER (who fast finished)
        vm.expectEmit(true, true, true, true);
        emit DepositAddressManager.Claim({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            finalRecipient: RELAYER,
            route: route,
            intent: intent,
            outputAmount: BRIDGE_AMOUNT
        });

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_MultipleDifferentSalts() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        bytes32[] memory salts = new bytes32[](3);
        salts[0] = keccak256("salt-1");
        salts[1] = keccak256("salt-2");
        salts[2] = keccak256("salt-3");

        for (uint256 i = 0; i < salts.length; i++) {
            DepositAddressIntent memory intent = DepositAddressIntent({
                depositAddress: depositAddress,
                relaySalt: salts[i],
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
            (address receiverAddress, ) = manager.computeReceiverAddress(
                intent
            );

            // Fund receiver
            usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

            vm.prank(RELAYER);
            manager.claimIntent({
                route: route,
                calls: calls,
                bridgeTokenOut: bridgeTokenOut,
                bridgeTokenOutPrice: bridgeTokenOutPrice,
                toTokenPrice: toTokenPrice,
                relaySalt: salts[i],
                sourceChainId: SOURCE_CHAIN_ID
            });

            // Verify intent marked as claimed
            assertEq(
                manager.receiverToRecipient(receiverAddress),
                manager.ADDR_MAX()
            );
        }

        // Verify recipient received all tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT * 3);
    }

    function test_claimIntent_DeploysDepositAddressReceiver() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Verify receiver not deployed yet
        assertEq(receiverAddress.code.length, 0);

        // Fund the receiver address
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify receiver was deployed
        assertTrue(receiverAddress.code.length > 0);
    }

    function test_claimIntent_WithExistingDepositAddressReceiver() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, bytes32 recvSalt) = manager
            .computeReceiverAddress(intent);

        // Deploy DepositAddressReceiver as the manager (so CREATE2 address matches)
        vm.prank(address(manager));
        DepositAddressReceiver receiver = new DepositAddressReceiver{
            salt: recvSalt
        }();
        assertEq(address(receiver), receiverAddress);

        // Verify receiver is deployed
        assertTrue(receiverAddress.code.length > 0);

        // Fund the receiver address
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Should work with existing receiver
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify recipient received tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT);
    }

    function test_claimIntent_WithSurplusBridgeAmount() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Fund with more than expected
        uint256 surplusAmount = BRIDGE_AMOUNT + 10e6;
        usdc.transfer(receiverAddress, surplusAmount);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify recipient received the full surplus amount
        assertEq(usdc.balanceOf(RECIPIENT), surplusAmount);
    }

    // ---------------------------------------------------------------------
    // claimIntent - Validation failures
    // ---------------------------------------------------------------------

    function test_claimIntent_RevertsWrongChain() public {
        // Call on wrong chain
        vm.chainId(999999999);

        DepositAddressRoute memory route = _createRoute(); // toChainId = DEST_CHAIN_ID

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: wrong chain"));
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_RevertsWrongEscrow() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0xDEAD); // Wrong escrow

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: wrong escrow"));
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_RevertsAlreadyClaimed() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Fund receiver for first claim
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // First claim succeeds
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Fund receiver again for second attempt
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Second claim with same salt should revert
        vm.expectRevert(bytes("DAM: already claimed"));
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_RevertsInsufficientBridge() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Fund with less than expected
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT - 10e6);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: insufficient bridge"));
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_RevertsInvalidBridgeTokenOutPrice_NoFastFinish()
        public
    {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Create price data signed by wrong signer
        PriceData memory bridgeTokenOutPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        bridgeTokenOutPrice.signature = _signPriceData(
            bridgeTokenOutPrice,
            0xBAD
        );

        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: bridge token out price invalid"));
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_RevertsInvalidToTokenPrice_NoFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data signed by wrong signer
        PriceData memory toTokenPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        toTokenPrice.signature = _signPriceData(toTokenPrice, 0xBAD);

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: toToken price invalid"));
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claimIntent_RevertsNotRelayer() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: not relayer"));
        vm.prank(address(0x1111)); // Not the relayer
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    // ---------------------------------------------------------------------
    // claimIntent - Price validation skipped for fast finish repayments
    // ---------------------------------------------------------------------

    function test_claimIntent_SkipsPriceValidation_AfterFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // Valid prices for fast finish
        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // First: relayer fast finishes
        usdc.transfer(RELAYER, BRIDGE_AMOUNT);
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinishIntent({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Create INVALID price data for claim - should still succeed because
        // price validation is skipped when repaying relayer
        PriceData memory invalidBridgeTokenOutPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        invalidBridgeTokenOutPrice.signature = _signPriceData(
            invalidBridgeTokenOutPrice,
            0xBAD
        );

        PriceData memory invalidToTokenPrice = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        invalidToTokenPrice.signature = _signPriceData(
            invalidToTokenPrice,
            0xBAD
        );

        uint256 relayerBalanceBefore = usdc.balanceOf(RELAYER);

        // Should succeed despite invalid prices
        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: invalidBridgeTokenOutPrice,
            toTokenPrice: invalidToTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify relayer was repaid
        assertEq(usdc.balanceOf(RELAYER), relayerBalanceBefore + BRIDGE_AMOUNT);
    }

    // ---------------------------------------------------------------------
    // claimIntent - Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_claimIntent_DifferentAmounts(uint256 amount) public {
        // Bound to reasonable amounts (1 USDC to 1M USDC)
        amount = bound(amount, 1e6, 1_000_000e6);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: amount
        });

        bytes32 relaySalt = keccak256(abi.encodePacked("salt", amount));

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        usdc.transfer(receiverAddress, amount);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify intent marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress),
            manager.ADDR_MAX()
        );

        // Verify recipient received tokens
        assertEq(usdc.balanceOf(RECIPIENT), amount);
    }

    function testFuzz_claimIntent_UniqueSalts(
        bytes32 salt1,
        bytes32 salt2
    ) public {
        vm.assume(salt1 != salt2);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // Claim with first salt
        DepositAddressIntent memory intent1 = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: salt1,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress1, ) = manager.computeReceiverAddress(intent1);
        usdc.transfer(receiverAddress1, BRIDGE_AMOUNT);

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: salt1,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Claim with second salt should succeed
        DepositAddressIntent memory intent2 = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: salt2,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress2, ) = manager.computeReceiverAddress(intent2);
        usdc.transfer(receiverAddress2, BRIDGE_AMOUNT);

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: salt2,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify both marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress1),
            manager.ADDR_MAX()
        );
        assertEq(
            manager.receiverToRecipient(receiverAddress2),
            manager.ADDR_MAX()
        );
        assertTrue(receiverAddress1 != receiverAddress2);

        // Verify recipient received all tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT * 2);
    }

    function testFuzz_claimIntent_SurplusAmounts(uint256 surplus) public {
        // Bound surplus to 0-100 USDC extra
        surplus = bound(surplus, 0, 100e6);

        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256(abi.encodePacked("salt", surplus));

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);

        // Fund with surplus
        uint256 totalAmount = BRIDGE_AMOUNT + surplus;
        usdc.transfer(receiverAddress, totalAmount);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.claimIntent({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify recipient received the full surplus amount
        assertEq(usdc.balanceOf(RECIPIENT), totalAmount);
    }

    // ---------------------------------------------------------------------
    // refundIntent - Success cases
    // ---------------------------------------------------------------------

    function test_refundIntent_Success() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund
        manager.refundIntent({route: route, tokens: tokens});

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), PAYMENT_AMOUNT);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_refundIntent_EmitsRefundEvent() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Prepare expected amounts
        uint256[] memory expectedAmounts = new uint256[](1);
        expectedAmounts[0] = PAYMENT_AMOUNT;

        // Expect the Refund event
        vm.expectEmit(true, false, false, true, address(manager));
        emit DepositAddressManager.Refund({
            depositAddress: address(vault),
            route: route,
            refundAddress: REFUND_ADDRESS,
            tokens: tokens,
            amounts: expectedAmounts
        });

        // Execute refund
        manager.refundIntent({route: route, tokens: tokens});
    }

    function test_refundIntent_MultipleTokens() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Deploy a second token
        TestUSDC usdc2 = new TestUSDC();

        // Fund the vault with both tokens
        uint256 amount1 = PAYMENT_AMOUNT;
        uint256 amount2 = 50e6;
        usdc.transfer(address(vault), amount1);
        usdc2.transfer(address(vault), amount2);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array with both tokens
        IERC20[] memory tokens = new IERC20[](2);
        tokens[0] = usdc;
        tokens[1] = IERC20(address(usdc2));

        // Execute refund
        manager.refundIntent({route: route, tokens: tokens});

        // Verify refund address received both tokens
        assertEq(usdc.balanceOf(REFUND_ADDRESS), amount1);
        assertEq(usdc2.balanceOf(REFUND_ADDRESS), amount2);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(usdc2.balanceOf(address(vault)), 0);
    }

    function test_refundIntent_AtExactExpiration() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Warp to exact expiration timestamp
        vm.warp(route.expiresAt);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund - should succeed at exact expiration
        manager.refundIntent({route: route, tokens: tokens});

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), PAYMENT_AMOUNT);
    }

    function test_refundIntent_ZeroBalance() public {
        DepositAddressRoute memory route = _createRoute();
        factory.createDepositAddress(route);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund - should succeed with zero balance
        manager.refundIntent({route: route, tokens: tokens});

        // Verify no funds transferred (no revert)
        assertEq(usdc.balanceOf(REFUND_ADDRESS), 0);
    }

    // ---------------------------------------------------------------------
    // refundIntent - Revert cases
    // ---------------------------------------------------------------------

    function test_refundIntent_RevertsNotExpired() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Don't warp past expiration

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Expect revert
        vm.expectRevert("DAM: not expired");
        manager.refundIntent({route: route, tokens: tokens});
    }

    function test_refundIntent_RevertsWrongEscrow() public {
        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0x1234); // Wrong escrow

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Expect revert
        vm.expectRevert("DAM: wrong escrow");
        manager.refundIntent({route: route, tokens: tokens});
    }

    // ---------------------------------------------------------------------
    // isRouteExpired - View function tests
    // ---------------------------------------------------------------------

    function test_isRouteExpired_ReturnsFalseBeforeExpiration() public view {
        DepositAddressRoute memory route = _createRoute();
        assertFalse(manager.isRouteExpired(route));
    }

    function test_isRouteExpired_ReturnsTrueAtExpiration() public {
        DepositAddressRoute memory route = _createRoute();
        vm.warp(route.expiresAt);
        assertTrue(manager.isRouteExpired(route));
    }

    function test_isRouteExpired_ReturnsTrueAfterExpiration() public {
        DepositAddressRoute memory route = _createRoute();
        vm.warp(route.expiresAt + 1);
        assertTrue(manager.isRouteExpired(route));
    }

    // ---------------------------------------------------------------------
    // Reentrancy Protection Tests
    // ---------------------------------------------------------------------

    function test_startIntent_BlocksReentrancy() public {
        // Deploy malicious token
        ReentrantToken evilToken = new ReentrantToken(payable(address(manager)));

        // Create route using the reentrant token
        DepositAddressRoute memory route = _createRoute();
        route.toToken = evilToken;

        // Create deposit address
        address vault = address(factory.createDepositAddress(route));

        // Fund vault with malicious tokens (won't trigger reentrancy since
        // we're not transferring to executor)
        evilToken.transfer(vault, PAYMENT_AMOUNT);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(evilToken),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Prepare intent parameters
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        Call[] memory startCalls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Attempt to start intent - the malicious token will try to re-enter
        // via refundIntent, but ReentrancyGuard should block it
        vm.prank(RELAYER);
        vm.expectRevert(
            abi.encodeWithSignature("ReentrancyGuardReentrantCall()")
        );
        manager.startIntent({
            route: route,
            paymentToken: evilToken,
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: bytes32(uint256(1)),
            calls: startCalls,
            bridgeExtraData: bridgeExtraData
        });
    }

    function test_fastFinishIntent_BlocksReentrancy() public {
        // Switch to destination chain for fast finish
        vm.chainId(DEST_CHAIN_ID);

        // Deploy malicious token
        ReentrantToken evilToken = new ReentrantToken(payable(address(manager)));

        // Create route
        DepositAddressRoute memory route = _createRoute();
        route.toToken = evilToken;

        // Mint tokens to relayer
        evilToken.transfer(RELAYER, PAYMENT_AMOUNT);

        // Create price data
        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(evilToken),
            USDC_PRICE,
            block.timestamp
        );

        // Prepare intent parameters
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        Call[] memory finishCalls = new Call[](0);

        // Attempt fast finish - malicious token will try to re-enter
        // Relayer must transfer tokens to manager first
        vm.startPrank(RELAYER);
        evilToken.transfer(address(manager), PAYMENT_AMOUNT);

        vm.expectRevert(
            abi.encodeWithSignature("ReentrancyGuardReentrantCall()")
        );
        manager.fastFinishIntent({
            route: route,
            calls: finishCalls,
            token: evilToken,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: bytes32(uint256(1)),
            sourceChainId: SOURCE_CHAIN_ID
        });
        vm.stopPrank();

        // Switch back to source chain
        vm.chainId(SOURCE_CHAIN_ID);
    }

    function test_sameChainFinishIntent_BlocksReentrancy() public {
        // Deploy malicious token
        ReentrantToken evilToken = new ReentrantToken(payable(address(manager)));

        // Create route with same source and dest chain
        DepositAddressRoute memory route = _createRoute();
        route.toChainId = SOURCE_CHAIN_ID; // Same chain
        route.toToken = evilToken;

        // Create deposit address and fund it
        address vault = address(factory.createDepositAddress(route));
        evilToken.transfer(vault, PAYMENT_AMOUNT);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(evilToken),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(evilToken),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory finishCalls = new Call[](0);

        // Attempt same chain finish - malicious token will try to re-enter
        vm.prank(RELAYER);
        vm.expectRevert(
            abi.encodeWithSignature("ReentrancyGuardReentrantCall()")
        );
        manager.sameChainFinishIntent({
            route: route,
            paymentToken: evilToken,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            toAmount: PAYMENT_AMOUNT,
            calls: finishCalls
        });
    }
}
