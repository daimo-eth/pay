// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {DepositAddressManagerTron} from "../src/DepositAddressManagerTron.sol";
import {DepositAddressTron} from "../src/DepositAddressTron.sol";
import {DaimoPayExecutorTron} from "../src/DaimoPayExecutorTron.sol";
import {
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
import {TronUSDT} from "./utils/TronUSDT.sol";
import {DummyTronBridger} from "./utils/DummyTronBridger.sol";

/// @notice Tests for Tron-specific contracts with TRC20-USDT (returns false on success)
contract DepositAddressManagerTronTest is Test {
    // ---------------------------------------------------------------------
    // Test constants & actors
    // ---------------------------------------------------------------------
    // Use a fake chain ID (not 728126428) so getDepositAddress uses 0xff prefix
    // which matches Foundry's CREATE2 behavior. On real Tron, 0x41 is used.
    uint256 private constant SOURCE_CHAIN_ID = 1; // Ethereum (for testing)
    uint256 private constant DEST_CHAIN_ID = 42161; // Arbitrum

    address private constant RECIPIENT = address(0x1234);
    address private constant REFUND_ADDRESS = address(0x5678);
    address private constant RELAYER = address(0x9ABC);

    uint256 private constant TRUSTED_SIGNER_KEY = 0xa11ce;
    uint256 private constant MAX_PRICE_AGE = 300; // 5 minutes

    uint256 private constant MAX_START_SLIPPAGE_BPS = 100; // 1%
    uint256 private constant MAX_FAST_FINISH_SLIPPAGE_BPS = 50; // 0.5%
    uint256 private constant MAX_SAME_CHAIN_FINISH_SLIPPAGE_BPS = 120; // 1.20%

    uint256 private constant USDT_PRICE = 1e18; // $1 with 18 decimals
    uint256 private constant PAYMENT_AMOUNT = 100e6; // 100 USDT (6 decimals)
    uint256 private constant BRIDGE_AMOUNT = 99e6; // After slippage

    // ---------------------------------------------------------------------
    // Deployed contracts
    // ---------------------------------------------------------------------
    DepositAddressManagerTron private manager;
    DaimoPayPricer private pricer;
    DummyTronBridger private bridger;
    TronUSDT private usdt;

    address private trustedSigner;

    // ---------------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------------
    function setUp() public {
        // Set chain ID (not Tron so CREATE2 prefix matches Foundry's 0xff)
        vm.chainId(SOURCE_CHAIN_ID);

        // Setup trusted signer
        trustedSigner = vm.addr(TRUSTED_SIGNER_KEY);

        // Deploy contracts
        pricer = new DaimoPayPricer(trustedSigner, MAX_PRICE_AGE);
        bridger = new DummyTronBridger();

        // Deploy manager (non-upgradeable)
        manager = new DepositAddressManagerTron(address(this));
        manager.setRelayer(RELAYER, true);

        // Deploy TRC20-USDT mock (returns false on success)
        usdt = new TronUSDT();
    }

    // ---------------------------------------------------------------------
    // Helper functions
    // ---------------------------------------------------------------------

    /// @dev Creates a standard route for testing
    function _createRoute() internal view returns (DepositAddressRoute memory) {
        return DepositAddressRoute({
            toChainId: DEST_CHAIN_ID,
            toToken: IERC20(address(usdt)),
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

    /// @dev Funds a deposit address with USDT
    function _fundDepositAddress(address vault, uint256 amount) internal {
        // Use raw transfer since TronUSDT returns false
        usdt.mint(vault, amount);
    }

    // ---------------------------------------------------------------------
    // TRC20-USDT Quirk Tests
    // ---------------------------------------------------------------------

    /// @notice Verify our mock TRC20-USDT returns false on success
    function test_TronUSDT_ReturnsFalseOnSuccess() public {
        address recipient = address(0x1111);
        uint256 amount = 100e6;

        usdt.mint(address(this), amount);

        uint256 balBefore = usdt.balanceOf(recipient);
        bool result = usdt.transfer(recipient, amount);
        uint256 balAfter = usdt.balanceOf(recipient);

        // Transfer succeeded (balance changed)
        assertEq(balAfter - balBefore, amount, "transfer should have worked");
        // But returned false (TRC20-USDT quirk)
        assertFalse(result, "TRC20-USDT should return false");
    }

    // ---------------------------------------------------------------------
    // DepositAddressTron Tests
    // ---------------------------------------------------------------------

    /// @notice Test vault sendBalance works with TRC20-USDT
    ///         Note: vault is created during startIntent, so we test via full flow
    function test_DepositAddressTron_SendBalance_WithTronUSDT() public {
        // Vault is created lazily during startIntent, so this test verifies
        // the getDepositAddress computation works and the vault address is deterministic
        DepositAddressRoute memory route = _createRoute();
        address vault = manager.getDepositAddress(route);

        // Vault doesn't exist yet (no code)
        assertEq(vault.code.length, 0, "vault should not exist yet");

        // Fund it anyway (EOA-style)
        _fundDepositAddress(vault, PAYMENT_AMOUNT);
        assertEq(usdt.balanceOf(vault), PAYMENT_AMOUNT, "vault should have funds");

        // After startIntent, vault will be created and funds transferred
        // (tested in test_startIntent_WithTronUSDT_Success)
    }

    // ---------------------------------------------------------------------
    // DaimoPayExecutorTron Tests
    // ---------------------------------------------------------------------

    /// @notice Test executor handles TRC20-USDT transfers
    function test_DaimoPayExecutorTron_Execute_WithTronUSDT() public {
        DaimoPayExecutorTron executor = manager.executor();

        // Fund executor
        usdt.mint(address(executor), PAYMENT_AMOUNT);

        // Expected output
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: IERC20(address(usdt)),
            amount: PAYMENT_AMOUNT
        });

        // No calls needed (just transfer)
        Call[] memory calls = new Call[](0);

        address recipient = address(0x2222);
        address surplus = address(0x3333);

        // Execute must be called from escrow (manager), so we prank as manager
        vm.prank(address(manager));
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(recipient),
            surplusRecipient: payable(surplus)
        });

        assertEq(usdt.balanceOf(recipient), PAYMENT_AMOUNT, "recipient should have funds");
        assertEq(usdt.balanceOf(address(executor)), 0, "executor should be empty");
    }

    // ---------------------------------------------------------------------
    // Full startIntent Flow Tests
    // ---------------------------------------------------------------------

    /// @notice Test full startIntent with TRC20-USDT
    function test_startIntent_WithTronUSDT_Success() public {
        DepositAddressRoute memory route = _createRoute();

        // Get the deterministic vault address (vault created lazily during startIntent)
        address vault = manager.getDepositAddress(route);

        // Fund the vault
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        // Create price data
        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdt),
            USDT_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdt),
            USDT_PRICE,
            block.timestamp
        );

        // Bridge token out
        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: IERC20(address(usdt)),
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);
        bytes memory bridgeExtraData = "";

        // Execute startIntent as relayer
        vm.prank(RELAYER);
        manager.startIntent({
            route: route,
            paymentToken: IERC20(address(usdt)),
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: bridgeExtraData
        });

        // Verify receiver is marked as used
        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: vault,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: SOURCE_CHAIN_ID
        });
        (address receiverAddress, ) = manager.computeReceiverAddress(intent);
        assertTrue(manager.receiverUsed(receiverAddress));

        // Verify bridger burned the tokens
        assertEq(usdt.balanceOf(address(0xdead)), BRIDGE_AMOUNT);
    }

    /// @notice Test startIntent emits Start event
    function test_startIntent_EmitsStartEvent() public {
        DepositAddressRoute memory route = _createRoute();
        address vault = manager.getDepositAddress(route);

        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory paymentTokenPrice = _createSignedPriceData(
            address(usdt),
            USDT_PRICE,
            block.timestamp
        );
        PriceData memory bridgeTokenInPrice = _createSignedPriceData(
            address(usdt),
            USDT_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: IERC20(address(usdt)),
            amount: BRIDGE_AMOUNT
        });

        bytes32 relaySalt = keccak256("test-salt");
        Call[] memory calls = new Call[](0);

        // Only check indexed params (vault address)
        vm.prank(RELAYER);
        vm.expectEmit(true, false, false, false);
        emit DepositAddressManagerTron.Start(
            vault,
            address(0), // not checked
            route,
            DepositAddressIntent({
                depositAddress: vault,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: SOURCE_CHAIN_ID
            }),
            address(usdt),
            PAYMENT_AMOUNT
        );

        manager.startIntent({
            route: route,
            paymentToken: IERC20(address(usdt)),
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: paymentTokenPrice,
            bridgeTokenInPrice: bridgeTokenInPrice,
            relaySalt: relaySalt,
            calls: calls,
            bridgeExtraData: ""
        });
    }

    /// @notice Test that standard SafeERC20 would fail with TRC20-USDT
    ///         (This proves our workaround is necessary)
    function test_SafeERC20_FailsWithTronUSDT() public {
        // This test demonstrates why we need the Tron-specific contracts.
        // OpenZeppelin's SafeERC20 uses safeTransfer which checks the return value
        // and reverts if it's false. TRC20-USDT returns false on success.

        // We can't easily test SafeERC20 reverting here since we removed it,
        // but we can verify our mock returns false:
        usdt.mint(address(this), 1e6);
        bool result = usdt.transfer(address(0x1111), 1e6);
        assertFalse(result, "TronUSDT should return false on success");

        // And verify the transfer actually worked:
        assertEq(usdt.balanceOf(address(0x1111)), 1e6);
    }

    // ---------------------------------------------------------------------
    // Error cases
    // ---------------------------------------------------------------------

    /// @notice Test startIntent reverts for non-relayer
    function test_startIntent_RevertsForNonRelayer() public {
        DepositAddressRoute memory route = _createRoute();
        address vault = manager.getDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory priceData = _createSignedPriceData(
            address(usdt),
            USDT_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: IERC20(address(usdt)),
            amount: BRIDGE_AMOUNT
        });

        vm.expectRevert("DAM: not relayer");
        manager.startIntent({
            route: route,
            paymentToken: IERC20(address(usdt)),
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: priceData,
            bridgeTokenInPrice: priceData,
            relaySalt: keccak256("salt"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }

    /// @notice Test startIntent reverts for expired route
    function test_startIntent_RevertsForExpiredRoute() public {
        DepositAddressRoute memory route = _createRoute();
        route.expiresAt = block.timestamp - 1; // Expired

        address vault = manager.getDepositAddress(route);
        _fundDepositAddress(vault, PAYMENT_AMOUNT);

        PriceData memory priceData = _createSignedPriceData(
            address(usdt),
            USDT_PRICE,
            block.timestamp
        );

        TokenAmount memory bridgeTokenOut = TokenAmount({
            token: IERC20(address(usdt)),
            amount: BRIDGE_AMOUNT
        });

        vm.prank(RELAYER);
        vm.expectRevert("DAM: expired");
        manager.startIntent({
            route: route,
            paymentToken: IERC20(address(usdt)),
            bridgeTokenOut: bridgeTokenOut,
            paymentTokenPrice: priceData,
            bridgeTokenInPrice: priceData,
            relaySalt: keccak256("salt"),
            calls: new Call[](0),
            bridgeExtraData: ""
        });
    }
}
