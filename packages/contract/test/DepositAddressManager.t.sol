// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {
    DepositAddressManager,
    DepositAddressReceiver
} from "../src/DepositAddressManager.sol";
import {DepositAddressFactory} from "../src/DepositAddressFactory.sol";
import {
    DepositAddress,
    DepositAddressRoute,
    DepositAddressFulfillment
} from "../src/DepositAddress.sol";
import {DaimoPayPricer} from "../src/DaimoPayPricer.sol";
import {PriceData} from "../src/interfaces/IDaimoPayPricer.sol";
import {
    IDepositAddressBridger
} from "../src/interfaces/IDepositAddressBridger.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {DaimoPayExecutor, Call} from "../src/DaimoPayExecutor.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";
import {DummyDepositAddressBridger} from "./utils/DummyDepositBridger.sol";
import {ReentrantToken} from "./utils/ReentrantToken.sol";
import {
    MockDepositAdapter,
    PartialDepositAdapter
} from "./utils/MockDepositAdapter.sol";

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
    DummyDepositAddressBridger private bridger;
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
        bridger = new DummyDepositAddressBridger();
        factory = new DepositAddressFactory();

        // Compute the manager address so we can deploy executor pointing to it
        address predictedManager = vm.computeCreateAddress(
            address(this),
            vm.getNonce(address(this)) + 1
        );
        DaimoPayExecutor executor = new DaimoPayExecutor(predictedManager);

        manager = new DepositAddressManager(address(this), factory, executor);
        require(
            address(manager) == predictedManager,
            "Manager address mismatch"
        );

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
                finalCallData: "",
                escrow: address(manager),
                bridger: IDepositAddressBridger(address(bridger)),
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
    // start - Success cases
    // ---------------------------------------------------------------------

    function test_start_Success() public {
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

        // Execute start
        vm.prank(RELAYER);
        manager.start({
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
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );
        assertTrue(manager.receiverUsed(receiverAddress));

        // Verify bridger burned the tokens
        assertTrue(usdc.balanceOf(address(0xdead)) == BRIDGE_AMOUNT);
    }

    function test_start_EmitsStartEvent() public {
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

        // Create expected fulfillment
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Expect Start event
        vm.expectEmit(true, true, false, true);
        emit DepositAddressManager.Start({
            depositAddress: address(vault),
            receiverAddress: receiverAddress,
            route: route,
            fulfillment: fulfillment,
            paymentToken: address(usdc),
            paymentAmount: PAYMENT_AMOUNT,
            paymentTokenPriceUsd: USDC_PRICE,
            bridgeTokenInPriceUsd: USDC_PRICE
        });

        vm.prank(RELAYER);
        manager.start({
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

    function test_start_MultipleDifferentSalts() public {
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
            manager.start({
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
            DepositAddressFulfillment
                memory fulfillment = DepositAddressFulfillment({
                    depositAddress: address(vault),
                    relaySalt: salts[i],
                    bridgeTokenOut: bridgeTokenOut,
                    sourceChainId: SOURCE_CHAIN_ID
                });
            (address receiverAddress, ) = manager.computeReceiverAddress(
                fulfillment
            );
            assertTrue(manager.receiverUsed(receiverAddress));
        }
    }

    // ---------------------------------------------------------------------
    // start - Validation failures
    // ---------------------------------------------------------------------

    function test_start_RevertsOnDestChain() public {
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
        manager.start({
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

    function test_start_RevertsWrongEscrow() public {
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
        manager.start({
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

    function test_start_RevertsExpired() public {
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
        manager.start({
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

    function test_start_RevertsInvalidPaymentPrice() public {
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
        manager.start({
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

    function test_start_RevertsInvalidBridgePrice() public {
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
        manager.start({
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

    function test_start_RevertsReceiverAlreadyUsed() public {
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
        manager.start({
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
        manager.start({
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

    function test_start_RevertsBridgeTokenPriceMismatch() public {
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
        manager.start({
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

    function test_start_RevertsPaymentTokenMismatch() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data for wrong token (mismatch with paymentToken)
        address wrongToken = address(0x999);
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            wrongToken,
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

        vm.expectRevert(bytes("DAM: payment token mismatch"));
        vm.prank(RELAYER);
        manager.start({
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

    function test_start_RevertsBridgeInputTooLow() public {
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
        manager.start({
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

    function test_start_RevertsNotRelayer() public {
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
        manager.start({
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

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });

        (address addr1, bytes32 salt1) = manager.computeReceiverAddress(
            fulfillment
        );
        (address addr2, bytes32 salt2) = manager.computeReceiverAddress(
            fulfillment
        );

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

        DepositAddressFulfillment
            memory fulfillment1 = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: keccak256("salt-1"),
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });

        DepositAddressFulfillment
            memory fulfillment2 = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: keccak256("salt-2"),
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });

        (address addr1, ) = manager.computeReceiverAddress(fulfillment1);
        (address addr2, ) = manager.computeReceiverAddress(fulfillment2);

        // Should be different
        assertTrue(addr1 != addr2);
    }

    function test_computeReceiverAddress_DifferentForDifferentAmounts() public {
        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment1 = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: relaySalt,
                bridgeTokenOut: TokenAmount({token: usdc, amount: 100e6}),
                sourceChainId: SOURCE_CHAIN_ID
            });

        DepositAddressFulfillment
            memory fulfillment2 = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: relaySalt,
                bridgeTokenOut: TokenAmount({token: usdc, amount: 200e6}),
                sourceChainId: SOURCE_CHAIN_ID
            });

        (address addr1, ) = manager.computeReceiverAddress(fulfillment1);
        (address addr2, ) = manager.computeReceiverAddress(fulfillment2);

        // Should be different
        assertTrue(addr1 != addr2);
    }

    // ---------------------------------------------------------------------
    // Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_start_DifferentAmounts(uint256 amount) public {
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
        manager.start({
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
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );
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

        DepositAddressFulfillment
            memory fulfillment1 = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: salt1,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });

        DepositAddressFulfillment
            memory fulfillment2 = DepositAddressFulfillment({
                depositAddress: address(vault),
                relaySalt: salt2,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });

        (address addr1, ) = manager.computeReceiverAddress(fulfillment1);
        (address addr2, ) = manager.computeReceiverAddress(fulfillment2);

        // Different salts should produce different addresses
        assertTrue(addr1 != addr2);
    }

    // ---------------------------------------------------------------------
    // fastFinish - Success cases
    // ---------------------------------------------------------------------

    function test_fastFinish_Success() public {
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
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Execute fastFinish
        // Relayer transfers tokens to manager first (required by the contract)
        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        manager.fastFinish({
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

    function test_fastFinish_EmitsFastFinishEvent() public {
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

        // Create expected fulfillment
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
            fulfillment: fulfillment,
            outputAmount: BRIDGE_AMOUNT,
            bridgeTokenOutPriceUsd: USDC_PRICE,
            toTokenPriceUsd: USDC_PRICE
        });

        manager.fastFinish({
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

    function test_fastFinish_MultipleDifferentSalts() public {
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
            manager.fastFinish({
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
            DepositAddressFulfillment
                memory fulfillment = DepositAddressFulfillment({
                    depositAddress: depositAddress,
                    relaySalt: salts[i],
                    bridgeTokenOut: bridgeTokenOut,
                    sourceChainId: SOURCE_CHAIN_ID
                });
            (address receiverAddress, ) = manager.computeReceiverAddress(
                fulfillment
            );
            assertEq(manager.receiverToRecipient(receiverAddress), RELAYER);
        }

        // Verify recipient received all tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT * 3);
    }

    // ---------------------------------------------------------------------
    // fastFinish - Validation failures
    // ---------------------------------------------------------------------

    function test_fastFinish_RevertsSameChain() public {
        // Stay on source chain (same as sourceChainId)
        vm.chainId(SOURCE_CHAIN_ID);

        // Create route that points to source chain
        DepositAddressRoute memory route = DepositAddressRoute({
            toChainId: SOURCE_CHAIN_ID,
            toToken: usdc,
            toAddress: RECIPIENT,
            refundAddress: REFUND_ADDRESS,
            finalCallData: "",
            escrow: address(manager),
            bridger: IDepositAddressBridger(address(bridger)),
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
        manager.fastFinish({
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

    function test_fastFinish_RevertsWrongChain() public {
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
        manager.fastFinish({
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

    function test_fastFinish_RevertsWrongEscrow() public {
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
        manager.fastFinish({
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

    function test_fastFinish_RevertsExpired() public {
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
        manager.fastFinish({
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

    function test_fastFinish_RevertsInvalidBridgeTokenOutPrice() public {
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
        vm.expectRevert(bytes("DAM: bridgeTokenOut price invalid"));
        manager.fastFinish({
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

    function test_fastFinish_RevertsInvalidToTokenPrice() public {
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
        manager.fastFinish({
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

    function test_fastFinish_RevertsAlreadyFinished() public {
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
        manager.fastFinish({
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
        manager.fastFinish({
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

    function test_fastFinish_RevertsBridgeTokenOutMismatch() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // Create price data for wrong token (mismatch with bridgeTokenOut.token)
        address wrongToken = address(0x999);
        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            wrongToken,
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
        vm.expectRevert(bytes("DAM: bridgeTokenOut mismatch"));
        manager.fastFinish({
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

    function test_fastFinish_RevertsToTokenMismatch() public {
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

        // Create price data for wrong token (mismatch with route.toToken)
        address wrongToken = address(0x999);
        PriceData memory toTokenPrice = _createSignedPriceData(
            wrongToken,
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        usdc.transfer(RELAYER, BRIDGE_AMOUNT);

        vm.startPrank(RELAYER);
        usdc.transfer(address(manager), BRIDGE_AMOUNT);
        vm.expectRevert(bytes("DAM: toToken mismatch"));
        manager.fastFinish({
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

    function test_fastFinish_RevertsNotRelayer() public {
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
        manager.fastFinish({
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
    // fastFinish - Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_fastFinish_DifferentAmounts(uint256 amount) public {
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
        manager.fastFinish({
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
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );
        assertEq(manager.receiverToRecipient(receiverAddress), RELAYER);

        // Verify recipient got at least toAmount
        assertTrue(usdc.balanceOf(RECIPIENT) >= toAmount);
    }

    function testFuzz_fastFinish_UniqueSalts(
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
        manager.fastFinish({
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
        manager.fastFinish({
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
        DepositAddressFulfillment
            memory fulfillment1 = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: salt1,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        DepositAddressFulfillment
            memory fulfillment2 = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: salt2,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });

        (address receiverAddress1, ) = manager.computeReceiverAddress(
            fulfillment1
        );
        (address receiverAddress2, ) = manager.computeReceiverAddress(
            fulfillment2
        );

        assertEq(manager.receiverToRecipient(receiverAddress1), RELAYER);
        assertEq(manager.receiverToRecipient(receiverAddress2), RELAYER);
        assertTrue(receiverAddress1 != receiverAddress2);
    }

    // ---------------------------------------------------------------------
    // sameChainFinish - Success cases
    // ---------------------------------------------------------------------

    function test_sameChainFinish_Success() public {
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

        // No swap calls needed (USDC -> USDC)
        Call[] memory calls = new Call[](0);

        // Execute sameChainFinish
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });

        // Verify recipient received the tokens
        assertEq(usdc.balanceOf(RECIPIENT), PAYMENT_AMOUNT);
    }

    function test_sameChainFinish_EmitsSameChainFinishEvent() public {
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

        Call[] memory calls = new Call[](0);

        // Expect SameChainFinish event
        vm.expectEmit(true, false, false, true);
        emit DepositAddressManager.SameChainFinish({
            depositAddress: address(vault),
            route: route,
            paymentToken: address(usdc),
            paymentAmount: PAYMENT_AMOUNT,
            outputAmount: PAYMENT_AMOUNT,
            paymentTokenPriceUsd: USDC_PRICE,
            toTokenPriceUsd: USDC_PRICE
        });

        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_MultipleFinishes() public {
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
            manager.sameChainFinish({
                route: route,
                paymentToken: usdc,
                paymentTokenPrice: paymentTokenPrice,
                toTokenPrice: toTokenPrice,
                calls: calls
            });

            // Verify each recipient received the tokens
            assertEq(usdc.balanceOf(recipients[i]), PAYMENT_AMOUNT);
        }
    }

    // ---------------------------------------------------------------------
    // sameChainFinish - Validation failures
    // ---------------------------------------------------------------------

    function test_sameChainFinish_RevertsWrongChain() public {
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

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: wrong chain"));
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsWrongEscrow() public {
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

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: wrong escrow"));
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsExpired() public {
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
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsInvalidPaymentPrice() public {
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

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: payment price invalid"));
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsInvalidToTokenPrice() public {
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

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: toToken price invalid"));
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsPaymentTokenMismatch() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data for wrong token (mismatch with paymentToken)
        address wrongToken = address(0x999);
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            wrongToken,
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: payment token mismatch"));
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsToTokenMismatch() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        DepositAddress vault = factory.createDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data for wrong token (mismatch with route.toToken)
        address wrongToken = address(0x999);
        PriceData memory toTokenPrice = _createSignedPriceData(
            wrongToken,
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: toToken mismatch"));
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_RevertsNotRelayer() public {
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

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: not relayer"));
        vm.prank(address(0x1111)); // Not the relayer
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    // ---------------------------------------------------------------------
    // sameChainFinish - Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_sameChainFinish_DifferentAmounts(uint256 amount) public {
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

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });

        // Verify recipient received the full amount
        assertEq(usdc.balanceOf(RECIPIENT), amount);
    }

    function testFuzz_sameChainFinish_DifferentSlippages(
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

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });

        // Verify recipient received the full amount
        assertEq(usdc.balanceOf(RECIPIENT), PAYMENT_AMOUNT);
    }

    // ---------------------------------------------------------------------
    // claim - Success cases (no fast finish)
    // ---------------------------------------------------------------------

    function test_claim_Success_NoFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        // Compute receiver address and fund it (simulating bridge arrival)
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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

        // Execute claim
        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify fulfillment marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress),
            manager.ADDR_MAX()
        );

        // Verify recipient received the tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT);
    }

    function test_claim_Success_AfterFastFinish() public {
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
        manager.fastFinish({
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
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund the receiver address (simulating bridged tokens arriving)
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Record relayer balance before claim
        uint256 relayerBalanceBefore = usdc.balanceOf(RELAYER);

        // Execute claim - should repay the relayer
        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify fulfillment marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress),
            manager.ADDR_MAX()
        );

        // Verify relayer was repaid
        assertEq(usdc.balanceOf(RELAYER), relayerBalanceBefore + BRIDGE_AMOUNT);
    }

    function test_claim_EmitsClaimEvent_NoFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
            fulfillment: fulfillment,
            outputAmount: BRIDGE_AMOUNT,
            bridgeTokenOutPriceUsd: USDC_PRICE,
            toTokenPriceUsd: USDC_PRICE
        });

        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_EmitsClaimEvent_AfterFastFinish() public {
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
        manager.fastFinish({
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

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Expect Claim event with recipient as RELAYER (who fast finished)
        vm.expectEmit(true, true, true, true);
        emit DepositAddressManager.Claim({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            finalRecipient: RELAYER,
            route: route,
            fulfillment: fulfillment,
            outputAmount: BRIDGE_AMOUNT,
            bridgeTokenOutPriceUsd: USDC_PRICE,
            toTokenPriceUsd: USDC_PRICE
        });

        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_MultipleDifferentSalts() public {
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
            DepositAddressFulfillment
                memory fulfillment = DepositAddressFulfillment({
                    depositAddress: depositAddress,
                    relaySalt: salts[i],
                    bridgeTokenOut: bridgeTokenOut,
                    sourceChainId: SOURCE_CHAIN_ID
                });
            (address receiverAddress, ) = manager.computeReceiverAddress(
                fulfillment
            );

            // Fund receiver
            usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

            vm.prank(RELAYER);
            manager.claim({
                route: route,
                calls: calls,
                bridgeTokenOut: bridgeTokenOut,
                bridgeTokenOutPrice: bridgeTokenOutPrice,
                toTokenPrice: toTokenPrice,
                relaySalt: salts[i],
                sourceChainId: SOURCE_CHAIN_ID
            });

            // Verify fulfillment marked as claimed
            assertEq(
                manager.receiverToRecipient(receiverAddress),
                manager.ADDR_MAX()
            );
        }

        // Verify recipient received all tokens
        assertEq(usdc.balanceOf(RECIPIENT), BRIDGE_AMOUNT * 3);
    }

    function test_claim_DeploysDepositAddressReceiver() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
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

    function test_claim_WithExistingDepositAddressReceiver() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, bytes32 recvSalt) = manager
            .computeReceiverAddress(fulfillment);

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
        manager.claim({
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

    function test_claim_WithSurplusBridgeAmount() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
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
    // claim - Validation failures
    // ---------------------------------------------------------------------

    function test_claim_RevertsWrongChain() public {
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
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsWrongEscrow() public {
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
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsBridgeTokenOutMismatch() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund receiver with bridged tokens
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Create price data for wrong token (mismatch with bridgeTokenOut.token)
        address wrongToken = address(0x999);
        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            wrongToken,
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory toTokenPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: bridgeTokenOut mismatch"));
        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsToTokenMismatch() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund receiver with bridged tokens
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        PriceData memory bridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Create price data for wrong token (mismatch with route.toToken)
        address wrongToken = address(0x999);
        PriceData memory toTokenPrice = _createSignedPriceData(
            wrongToken,
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectRevert(bytes("DAM: toToken mismatch"));
        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsAlreadyClaimed() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
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
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsInsufficientBridge() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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

        vm.expectRevert(bytes("DPCE: output below min"));
        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsInvalidBridgeTokenOutPrice_NoFastFinish()
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

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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

        vm.expectRevert(bytes("DAM: bridgeTokenOut price invalid"));
        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsInvalidToTokenPrice_NoFastFinish() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });
    }

    function test_claim_RevertsNotRelayer() public {
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
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
    // claim - Price validation skipped for fast finish repayments
    // ---------------------------------------------------------------------

    function test_claim_SkipsPriceValidation_AfterFastFinish() public {
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
        manager.fastFinish({
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

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
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
    // claim - Fuzz tests
    // ---------------------------------------------------------------------

    function testFuzz_claim_DifferentAmounts(uint256 amount) public {
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

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify fulfillment marked as claimed
        assertEq(
            manager.receiverToRecipient(receiverAddress),
            manager.ADDR_MAX()
        );

        // Verify recipient received tokens
        assertEq(usdc.balanceOf(RECIPIENT), amount);
    }

    function testFuzz_claim_UniqueSalts(bytes32 salt1, bytes32 salt2) public {
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
        DepositAddressFulfillment
            memory fulfillment1 = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: salt1,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress1, ) = manager.computeReceiverAddress(
            fulfillment1
        );
        usdc.transfer(receiverAddress1, BRIDGE_AMOUNT);

        vm.prank(RELAYER);
        manager.claim({
            route: route,
            calls: calls,
            bridgeTokenOut: bridgeTokenOut,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            relaySalt: salt1,
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Claim with second salt should succeed
        DepositAddressFulfillment
            memory fulfillment2 = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: salt2,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress2, ) = manager.computeReceiverAddress(
            fulfillment2
        );
        usdc.transfer(receiverAddress2, BRIDGE_AMOUNT);

        vm.prank(RELAYER);
        manager.claim({
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

    function testFuzz_claim_SurplusAmounts(uint256 surplus) public {
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

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

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
        manager.claim({
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
    // refundDepositAddress - Success cases
    // ---------------------------------------------------------------------

    function test_refundDepositAddress_Success() public {
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
        manager.refundDepositAddress({route: route, tokens: tokens});

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), PAYMENT_AMOUNT);
        assertEq(usdc.balanceOf(address(vault)), 0);
    }

    function test_refundDepositAddress_EmitsRefundEvent() public {
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

        // Expect the RefundDepositAddress event
        vm.expectEmit(true, false, false, true, address(manager));
        emit DepositAddressManager.RefundDepositAddress({
            depositAddress: address(vault),
            route: route,
            refundAddress: REFUND_ADDRESS,
            tokens: tokens,
            amounts: expectedAmounts
        });

        // Execute refund
        manager.refundDepositAddress({route: route, tokens: tokens});
    }

    function test_refundDepositAddress_MultipleTokens() public {
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
        manager.refundDepositAddress({route: route, tokens: tokens});

        // Verify refund address received both tokens
        assertEq(usdc.balanceOf(REFUND_ADDRESS), amount1);
        assertEq(usdc2.balanceOf(REFUND_ADDRESS), amount2);
        assertEq(usdc.balanceOf(address(vault)), 0);
        assertEq(usdc2.balanceOf(address(vault)), 0);
    }

    function test_refundDepositAddress_AtExactExpiration() public {
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
        manager.refundDepositAddress({route: route, tokens: tokens});

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), PAYMENT_AMOUNT);
    }

    function test_refundDepositAddress_ZeroBalance() public {
        DepositAddressRoute memory route = _createRoute();
        factory.createDepositAddress(route);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund - should succeed with zero balance
        manager.refundDepositAddress({route: route, tokens: tokens});

        // Verify no funds transferred (no revert)
        assertEq(usdc.balanceOf(REFUND_ADDRESS), 0);
    }

    // ---------------------------------------------------------------------
    // refundDepositAddress - Revert cases
    // ---------------------------------------------------------------------

    function test_refundDepositAddress_RevertsNotExpired() public {
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
        manager.refundDepositAddress({route: route, tokens: tokens});
    }

    function test_refundDepositAddress_RevertsWrongEscrow() public {
        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0x1234); // Wrong escrow

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Expect revert
        vm.expectRevert("DAM: wrong escrow");
        manager.refundDepositAddress({route: route, tokens: tokens});
    }

    // ---------------------------------------------------------------------
    // refundFulfillment - Success cases
    // ---------------------------------------------------------------------

    function test_refundFulfillment_Success() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Compute receiver address
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund the receiver address (simulating bridged tokens that were never claimed)
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund as relayer
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), BRIDGE_AMOUNT);
        assertEq(usdc.balanceOf(receiverAddress), 0);
    }

    function test_refundFulfillment_EmitsRefundReceiverEvent() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Compute receiver address
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund the receiver address
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Prepare expected amounts
        uint256[] memory expectedAmounts = new uint256[](1);
        expectedAmounts[0] = BRIDGE_AMOUNT;

        // Expect the RefundFulfillment event
        vm.expectEmit(true, true, false, true, address(manager));
        emit DepositAddressManager.RefundFulfillment({
            depositAddress: depositAddress,
            receiverAddress: receiverAddress,
            route: route,
            fulfillment: fulfillment,
            refundAddress: REFUND_ADDRESS,
            tokens: tokens,
            amounts: expectedAmounts
        });

        // Execute refund as relayer
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });
    }

    function test_refundFulfillment_MultipleTokens() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Compute receiver address
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Deploy a second token
        TestUSDC usdc2 = new TestUSDC();

        // Fund the receiver with both tokens
        uint256 amount1 = BRIDGE_AMOUNT;
        uint256 amount2 = 50e6;
        usdc.transfer(receiverAddress, amount1);
        usdc2.transfer(receiverAddress, amount2);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array with both tokens
        IERC20[] memory tokens = new IERC20[](2);
        tokens[0] = usdc;
        tokens[1] = IERC20(address(usdc2));

        // Execute refund as relayer
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });

        // Verify refund address received both tokens
        assertEq(usdc.balanceOf(REFUND_ADDRESS), amount1);
        assertEq(usdc2.balanceOf(REFUND_ADDRESS), amount2);
        assertEq(usdc.balanceOf(receiverAddress), 0);
        assertEq(usdc2.balanceOf(receiverAddress), 0);
    }

    function test_refundFulfillment_AtExactExpiration() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Compute receiver address
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund the receiver address
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Warp to exact expiration timestamp
        vm.warp(route.expiresAt);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund as relayer - should succeed at exact expiration
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), BRIDGE_AMOUNT);
    }

    function test_refundFulfillment_ZeroBalance() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Don't fund the receiver - it has zero balance

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund as relayer - should succeed with zero balance
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });

        // Verify no funds transferred (no revert)
        assertEq(usdc.balanceOf(REFUND_ADDRESS), 0);
    }

    // ---------------------------------------------------------------------
    // refundFulfillment - Revert cases
    // ---------------------------------------------------------------------

    function test_refundFulfillment_RevertsNotExpired() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Compute receiver address
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund the receiver address
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Don't warp past expiration

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Expect revert
        vm.prank(RELAYER);
        vm.expectRevert("DAM: not expired");
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });
    }

    function test_refundFulfillment_RevertsWrongEscrow() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0x1234); // Wrong escrow

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Expect revert
        vm.prank(RELAYER);
        vm.expectRevert("DAM: wrong escrow");
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });
    }

    function test_refundFulfillment_RevertsNotRelayer() public {
        // Switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        bytes32 relaySalt = keccak256("test-refund-salt");
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Compute receiver address
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address receiverAddress, ) = manager.computeReceiverAddress(
            fulfillment
        );

        // Fund the receiver address
        usdc.transfer(receiverAddress, BRIDGE_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Expect revert when called by non-relayer
        vm.prank(address(0xBEEF));
        vm.expectRevert("DAM: not relayer");
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: relaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });
    }

    function test_refundFulfillment_HopChainRefund() public {
        // Test refunding tokens stuck on a hop chain after expiry
        // Scenario: source -> hop bridge completed, but hop -> dest never happened

        // Switch to hop chain
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        // Leg 1: source -> hop (simulating Scroll -> Arbitrum)
        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt-refund");

        // Compute hop receiver address (where leg1 bridged tokens would arrive)
        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );

        // Fund the hop receiver (simulating leg1 bridge arrival that was never hopped)
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        // Warp past expiration - the hop never happened
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund from the hop receiver
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: leg1BridgeTokenOut,
            relaySalt: leg1RelaySalt,
            sourceChainId: SOURCE_CHAIN_ID,
            tokens: tokens
        });

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), BRIDGE_AMOUNT);
        assertEq(usdc.balanceOf(hopReceiverAddress), 0);
    }

    function test_refundFulfillment_Leg2ReceiverRefund() public {
        // Test refunding tokens stuck on the destination chain after a hop
        // Scenario: source -> hop -> dest bridge completed, but never claimed

        // First, execute the hop to create leg2 receiver
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        // Leg 1: source -> hop
        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt-leg2refund");

        // Leg 2: hop -> dest
        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg2RelaySalt = keccak256("leg2-salt-leg2refund");

        // Compute and fund leg1 receiver
        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        // Execute the hop
        PriceData memory leg1BridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2BridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1BridgeTokenOutPrice,
            leg2BridgeTokenInPrice: leg2BridgeTokenInPrice,
            leg2RelaySalt: leg2RelaySalt,
            calls: calls,
            bridgeExtraData: ""
        });

        // Now switch to destination chain
        vm.chainId(DEST_CHAIN_ID);

        // Compute leg2 receiver address
        DepositAddressFulfillment
            memory leg2Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg2RelaySalt,
                bridgeTokenOut: leg2BridgeTokenOut,
                sourceChainId: HOP_CHAIN_ID // hop chain is source for leg2
            });
        (address destReceiverAddress, ) = manager.computeReceiverAddress(
            leg2Fulfillment
        );

        // Simulate leg2 bridge arrival (tokens land on dest chain but never claimed)
        usdc.transfer(destReceiverAddress, BRIDGE_AMOUNT);

        // Warp past expiration
        vm.warp(route.expiresAt + 1);

        // Create tokens array
        IERC20[] memory tokens = new IERC20[](1);
        tokens[0] = usdc;

        // Execute refund from the destination receiver
        vm.prank(RELAYER);
        manager.refundFulfillment({
            route: route,
            bridgeTokenOut: leg2BridgeTokenOut,
            relaySalt: leg2RelaySalt,
            sourceChainId: HOP_CHAIN_ID,
            tokens: tokens
        });

        // Verify refund address received the funds
        assertEq(usdc.balanceOf(REFUND_ADDRESS), BRIDGE_AMOUNT);
        assertEq(usdc.balanceOf(destReceiverAddress), 0);
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

    function test_start_BlocksReentrancy() public {
        // Deploy malicious token
        ReentrantToken evilToken = new ReentrantToken(
            payable(address(manager))
        );

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

        // Prepare fulfillment parameters
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        Call[] memory startCalls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Attempt to start fulfillment - the malicious token will try to re-enter
        // via refundDepositAddress, but ReentrancyGuard should block it
        vm.prank(RELAYER);
        vm.expectRevert(
            abi.encodeWithSignature("ReentrancyGuardReentrantCall()")
        );
        manager.start({
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

    function test_fastFinish_BlocksReentrancy() public {
        // Switch to destination chain for fast finish
        vm.chainId(DEST_CHAIN_ID);

        // Deploy malicious token
        ReentrantToken evilToken = new ReentrantToken(
            payable(address(manager))
        );

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

        // Prepare fulfillment parameters
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
        manager.fastFinish({
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

    function test_sameChainFinish_BlocksReentrancy() public {
        // Deploy malicious token
        ReentrantToken evilToken = new ReentrantToken(
            payable(address(manager))
        );

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
        manager.sameChainFinish({
            route: route,
            paymentToken: evilToken,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: finishCalls
        });
    }

    // ---------------------------------------------------------------------
    // hopStart - Success cases
    // ---------------------------------------------------------------------

    uint256 private constant HOP_CHAIN_ID = 42161; // Arbitrum

    function test_hopStart_Success() public {
        // Set chain to hop chain (Arbitrum)
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        // Leg 1: source -> hop (e.g., Scroll -> Arbitrum)
        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt");

        // Leg 2: hop -> dest (e.g., Arbitrum -> Base)
        // Use same amount since dummy bridger doesn't charge fees
        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg2RelaySalt = keccak256("leg2-salt");

        // Compute leg 1 receiver (where funds from source->hop arrive)
        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );

        // Fund the hop receiver (simulating leg 1 bridge arrival)
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        // Create price data for hop chain
        PriceData memory leg1BridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2BridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Execute hopStart
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1BridgeTokenOutPrice,
            leg2BridgeTokenInPrice: leg2BridgeTokenInPrice,
            leg2RelaySalt: leg2RelaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });

        // Verify hop receiver is marked as claimed
        assertEq(
            manager.receiverToRecipient(hopReceiverAddress),
            manager.ADDR_MAX()
        );

        // Verify leg 2 receiver is marked as used
        DepositAddressFulfillment
            memory leg2Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg2RelaySalt,
                bridgeTokenOut: leg2BridgeTokenOut,
                sourceChainId: HOP_CHAIN_ID
            });
        (address destReceiverAddress, ) = manager.computeReceiverAddress(
            leg2Fulfillment
        );
        assertTrue(manager.receiverUsed(destReceiverAddress));

        // Verify bridger received tokens (burned to 0xdead by dummy bridger)
        assertEq(usdc.balanceOf(address(0xdead)), leg2BridgeTokenOut.amount);
    }

    function test_hopStart_EmitsHopEvent() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt");

        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg2RelaySalt = keccak256("leg2-salt");

        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        DepositAddressFulfillment
            memory leg2Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg2RelaySalt,
                bridgeTokenOut: leg2BridgeTokenOut,
                sourceChainId: HOP_CHAIN_ID
            });
        (address destReceiverAddress, ) = manager.computeReceiverAddress(
            leg2Fulfillment
        );

        PriceData memory leg1BridgeTokenOutPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2BridgeTokenInPrice = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        vm.expectEmit(true, true, true, false);
        emit DepositAddressManager.HopStart({
            depositAddress: depositAddress,
            hopReceiverAddress: hopReceiverAddress,
            destReceiverAddress: destReceiverAddress,
            route: route,
            leg1Fulfillment: leg1Fulfillment,
            leg2Fulfillment: leg2Fulfillment,
            hopAmount: BRIDGE_AMOUNT,
            leg1BridgeTokenOutPriceUsd: USDC_PRICE,
            leg2BridgeTokenInPriceUsd: USDC_PRICE
        });

        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1BridgeTokenOutPrice,
            leg2BridgeTokenInPrice: leg2BridgeTokenInPrice,
            leg2RelaySalt: leg2RelaySalt,
            calls: calls,
            bridgeExtraData: ""
        });
    }

    // ---------------------------------------------------------------------
    // hopStart - Validation failures
    // ---------------------------------------------------------------------

    function test_hopStart_RevertsOnSourceChain() public {
        // Call on source chain (wrong)
        vm.chainId(SOURCE_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        vm.expectRevert(bytes("DAM: hop on source chain"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: keccak256("leg1"),
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsOnDestChain() public {
        // Call on dest chain (wrong)
        vm.chainId(DEST_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        vm.expectRevert(bytes("DAM: hop on dest chain"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: keccak256("leg1"),
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsWrongEscrow() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        route.escrow = address(0xDEAD); // Wrong escrow

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        vm.expectRevert(bytes("DAM: wrong escrow"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: keccak256("leg1"),
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsNotRelayer() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        vm.expectRevert(bytes("DAM: not relayer"));
        vm.prank(address(0x1111)); // Not the relayer
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: keccak256("leg1"),
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsAlreadyClaimed() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt");

        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg2RelaySalt = keccak256("leg2-salt");

        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );
        // Fund with exactly the expected amount
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        Call[] memory calls = new Call[](0);

        // First hop succeeds
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: leg2RelaySalt,
            calls: calls,
            bridgeExtraData: ""
        });

        // Second hop with same leg1 params should fail (already claimed)
        vm.expectRevert(bytes("DAM: already claimed"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2-salt-2"), // Different leg2 salt
            calls: calls,
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsInsufficientBridge() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt");

        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );

        // Fund with less than expected
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT / 2);

        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );
        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        vm.expectRevert(bytes("DPCE: insufficient output"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsInvalidLeg1Price() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt");

        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        // Invalid signature
        PriceData memory leg1Price = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        leg1Price.signature = _signPriceData(leg1Price, 0xBAD);

        PriceData memory leg2Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        vm.expectRevert(bytes("DAM: leg1 price invalid"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    function test_hopStart_RevertsInvalidLeg2Price() public {
        vm.chainId(HOP_CHAIN_ID);

        DepositAddressRoute memory route = _createRoute();
        address depositAddress = factory.getDepositAddress(route);

        TokenAmount memory leg1BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });
        bytes32 leg1RelaySalt = keccak256("leg1-salt");

        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            });
        (address hopReceiverAddress, ) = manager.computeReceiverAddress(
            leg1Fulfillment
        );
        usdc.transfer(hopReceiverAddress, BRIDGE_AMOUNT);

        TokenAmount memory leg2BridgeTokenOut = TokenAmount({
            token: usdc,
            amount: BRIDGE_AMOUNT
        });

        PriceData memory leg1Price = _createSignedPriceData(
            address(usdc),
            USDC_PRICE,
            block.timestamp
        );

        // Invalid signature
        PriceData memory leg2Price = PriceData({
            token: address(usdc),
            priceUsd: USDC_PRICE,
            timestamp: block.timestamp,
            signature: ""
        });
        leg2Price.signature = _signPriceData(leg2Price, 0xBAD);

        vm.expectRevert(bytes("DAM: leg2 price invalid"));
        vm.prank(RELAYER);
        manager.hopStart({
            route: route,
            leg1BridgeTokenOut: leg1BridgeTokenOut,
            leg1RelaySalt: leg1RelaySalt,
            leg1SourceChainId: SOURCE_CHAIN_ID,
            leg2BridgeTokenOut: leg2BridgeTokenOut,
            leg1BridgeTokenOutPrice: leg1Price,
            leg2BridgeTokenInPrice: leg2Price,
            leg2RelaySalt: keccak256("leg2"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    // ---------------------------------------------------------------------
    // finalCall - Success cases
    // ---------------------------------------------------------------------

    function test_sameChainFinish_WithFinalCall_Success() public {
        vm.chainId(DEST_CHAIN_ID);

        // Deploy mock adapter
        MockDepositAdapter adapter = new MockDepositAdapter(usdc);

        // Create route with finalCallData - toAddress is now the adapter
        DepositAddressRoute memory route = DepositAddressRoute({
            toChainId: DEST_CHAIN_ID,
            toToken: usdc,
            toAddress: address(adapter),
            refundAddress: REFUND_ADDRESS,
            finalCallData: abi.encodeCall(
                MockDepositAdapter.deposit,
                (RECIPIENT, 0)
            ),
            escrow: address(manager),
            bridger: IDepositAddressBridger(address(bridger)),
            pricer: pricer,
            maxStartSlippageBps: MAX_START_SLIPPAGE_BPS,
            maxFastFinishSlippageBps: MAX_FAST_FINISH_SLIPPAGE_BPS,
            maxSameChainFinishSlippageBps: MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS,
            expiresAt: block.timestamp + 1000
        });

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
            (10_000 - MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        // Execute sameChainFinish with finalCall
        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });

        // Verify adapter received the tokens
        assertEq(usdc.balanceOf(address(adapter)), PAYMENT_AMOUNT);
        assertEq(adapter.lastRecipient(), RECIPIENT);
        assertEq(adapter.lastAmount(), PAYMENT_AMOUNT);
        assertEq(adapter.lastDestinationDex(), 0);
        assertEq(adapter.depositCount(), 1);

        // Verify recipient did NOT receive tokens (they went to adapter)
        assertEq(usdc.balanceOf(RECIPIENT), 0);
    }

    function test_sameChainFinish_WithFinalCall_EmitsFinalCallExecutedEvent()
        public
    {
        vm.chainId(DEST_CHAIN_ID);

        MockDepositAdapter adapter = new MockDepositAdapter(usdc);

        DepositAddressRoute memory route = DepositAddressRoute({
            toChainId: DEST_CHAIN_ID,
            toToken: usdc,
            toAddress: address(adapter),
            refundAddress: REFUND_ADDRESS,
            finalCallData: abi.encodeCall(
                MockDepositAdapter.deposit,
                (RECIPIENT, 0)
            ),
            escrow: address(manager),
            bridger: IDepositAddressBridger(address(bridger)),
            pricer: pricer,
            maxStartSlippageBps: MAX_START_SLIPPAGE_BPS,
            maxFastFinishSlippageBps: MAX_FAST_FINISH_SLIPPAGE_BPS,
            maxSameChainFinishSlippageBps: MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS,
            expiresAt: block.timestamp + 1000
        });

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
            (10_000 - MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        address depositAddress = factory.getDepositAddress(route);

        // Expect FinalCallExecuted event
        vm.expectEmit(true, true, false, true);
        emit DepositAddressManager.FinalCallExecuted(
            depositAddress,
            address(adapter),
            true
        );

        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });
    }

    function test_sameChainFinish_WithFinalCall_PartialUseRefundsRemainder()
        public
    {
        vm.chainId(DEST_CHAIN_ID);

        // Deploy adapter that only uses 50% of tokens
        PartialDepositAdapter partialAdapter = new PartialDepositAdapter(
            usdc,
            5000 // 50%
        );

        DepositAddressRoute memory route = DepositAddressRoute({
            toChainId: DEST_CHAIN_ID,
            toToken: usdc,
            toAddress: address(partialAdapter),
            refundAddress: REFUND_ADDRESS,
            finalCallData: abi.encodeCall(
                PartialDepositAdapter.deposit,
                (RECIPIENT, 0)
            ),
            escrow: address(manager),
            bridger: IDepositAddressBridger(address(bridger)),
            pricer: pricer,
            maxStartSlippageBps: MAX_START_SLIPPAGE_BPS,
            maxFastFinishSlippageBps: MAX_FAST_FINISH_SLIPPAGE_BPS,
            maxSameChainFinishSlippageBps: MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS,
            expiresAt: block.timestamp + 1000
        });

        DepositAddress da = factory.createDepositAddress(route);
        _fundDepositAddress(da, PAYMENT_AMOUNT);

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
            (10_000 - MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS)) / 10_000;

        Call[] memory calls = new Call[](0);

        address depositAddress = factory.getDepositAddress(route);

        vm.expectEmit(true, true, false, true);
        emit DepositAddressManager.FinalCallExecuted(
            depositAddress,
            address(partialAdapter),
            true
        );

        vm.prank(RELAYER);
        manager.sameChainFinish({
            route: route,
            paymentToken: usdc,
            paymentTokenPrice: paymentTokenPrice,
            toTokenPrice: toTokenPrice,
            calls: calls
        });

        // Verify adapter used 50% of tokens
        uint256 expectedUsed = PAYMENT_AMOUNT / 2;
        uint256 expectedRefund = PAYMENT_AMOUNT - expectedUsed;

        assertEq(partialAdapter.lastAmountUsed(), expectedUsed);
        assertEq(partialAdapter.lastAmountReturned(), expectedRefund);

        // Verify unused tokens were refunded to refundAddress
        assertEq(usdc.balanceOf(REFUND_ADDRESS), expectedRefund);

        // Verify adapter kept the used portion
        assertEq(usdc.balanceOf(address(partialAdapter)), expectedUsed);
    }

    function test_fastFinish_WithFinalCall_Success() public {
        vm.chainId(DEST_CHAIN_ID);

        MockDepositAdapter adapter = new MockDepositAdapter(usdc);

        DepositAddressRoute memory route = DepositAddressRoute({
            toChainId: DEST_CHAIN_ID,
            toToken: usdc,
            toAddress: address(adapter),
            refundAddress: REFUND_ADDRESS,
            finalCallData: abi.encodeCall(
                MockDepositAdapter.deposit,
                (RECIPIENT, type(uint32).max)
            ),
            escrow: address(manager),
            bridger: IDepositAddressBridger(address(bridger)),
            pricer: pricer,
            maxStartSlippageBps: MAX_START_SLIPPAGE_BPS,
            maxFastFinishSlippageBps: MAX_FAST_FINISH_SLIPPAGE_BPS,
            maxSameChainFinishSlippageBps: MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS,
            expiresAt: block.timestamp + 1000
        });

        // Relayer sends tokens directly to escrow
        usdc.transfer(address(manager), PAYMENT_AMOUNT);

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

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: usdc,
            amount: PAYMENT_AMOUNT
        });

        Call[] memory calls = new Call[](0);

        vm.prank(RELAYER);
        manager.fastFinish({
            route: route,
            calls: calls,
            token: usdc,
            bridgeTokenOutPrice: bridgeTokenOutPrice,
            toTokenPrice: toTokenPrice,
            bridgeTokenOut: bridgeTokenOut,
            relaySalt: keccak256("test-salt"),
            sourceChainId: SOURCE_CHAIN_ID
        });

        // Verify adapter received the tokens
        assertEq(usdc.balanceOf(address(adapter)), PAYMENT_AMOUNT);
        assertEq(adapter.lastRecipient(), RECIPIENT);
        assertEq(adapter.lastDestinationDex(), type(uint32).max);
    }
}
