// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {DaimoPayStargateBridger} from "../src/DaimoPayStargateBridger.sol";
import {DaimoPayLayerZeroBridger} from "../src/DaimoPayLayerZeroBridger.sol";
import {
    SendParam,
    MessagingFee,
    OFTReceipt,
    OFTLimit,
    OFTFeeDetail
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";
import {
    MessagingReceipt
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oapp/OAppSender.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {Ticket} from "@stargatefinance/stg-evm-v2/src/interfaces/IStargate.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";

/// @dev Mock Stargate that implements IStargate interface for testing.
contract MockStargate {
    /// @dev Fee basis points (100 = 1%).
    uint256 public feeBps;
    /// @dev Available liquidity in the pool. 0 = unlimited.
    uint256 public availableLiquidity;
    uint256 public lastSentAmount;
    address public bridgeTokenIn;

    constructor() {
        // Default: no fee, unlimited liquidity
        feeBps = 0;
        availableLiquidity = 0;
    }

    /// @dev Set the bridge token for pulling tokens in sendToken.
    function setBridgeTokenIn(address _token) external {
        bridgeTokenIn = _token;
    }

    /// @dev Set the fee in basis points (100 = 1%).
    function setFeeBps(uint256 _feeBps) external {
        feeBps = _feeBps;
    }

    /// @dev Set the available liquidity in the pool. 0 = unlimited.
    /// If the normal output would exceed this, return the available liquidity.
    function setAvailableLiquidity(uint256 _liquidity) external {
        availableLiquidity = _liquidity;
    }

    function quoteOFT(
        SendParam memory _sendParam
    )
        external
        view
        returns (
            OFTLimit memory limit,
            OFTFeeDetail[] memory oftFeeDetails,
            OFTReceipt memory receipt
        )
    {
        limit = OFTLimit({minAmountLD: 1, maxAmountLD: type(uint256).max});
        oftFeeDetails = new OFTFeeDetail[](0);

        // Apply fee: output = input * (10000 - feeBps) / 10000
        uint256 received = (_sendParam.amountLD * (10000 - feeBps)) / 10000;

        // Cap at available liquidity if set (non-zero)
        if (availableLiquidity > 0 && received > availableLiquidity) {
            received = availableLiquidity;
        }

        receipt = OFTReceipt({
            amountSentLD: _sendParam.amountLD,
            amountReceivedLD: received
        });
    }

    function quoteSend(
        SendParam memory,
        bool
    ) external pure returns (MessagingFee memory) {
        return MessagingFee({nativeFee: 0.001 ether, lzTokenFee: 0});
    }

    function sendToken(
        SendParam memory _sendParam,
        MessagingFee memory,
        address
    )
        external
        payable
        returns (
            MessagingReceipt memory msgReceipt,
            OFTReceipt memory oftReceipt,
            Ticket memory ticket
        )
    {
        // Pull tokens from caller (bridger) like the real Stargate does
        IERC20(bridgeTokenIn).transferFrom(
            msg.sender,
            address(this),
            _sendParam.amountLD
        );
        lastSentAmount = _sendParam.amountLD;

        msgReceipt = MessagingReceipt({
            guid: bytes32(0),
            nonce: 0,
            fee: MessagingFee({nativeFee: msg.value, lzTokenFee: 0})
        });
        oftReceipt = OFTReceipt({
            amountSentLD: _sendParam.amountLD,
            amountReceivedLD: _sendParam.amountLD
        });
        ticket = Ticket({ticketId: 0, passengerBytes: ""});
    }
}

contract DaimoPayStargateBridgerTest is Test {
    DaimoPayStargateBridger private bridger;
    MockStargate private mockStargate;
    TestUSDC private usdc;

    uint256 constant SOURCE_CHAIN = 1; // Ethereum
    uint256 constant DEST_CHAIN = 42161; // Arbitrum
    uint32 constant DEST_EID = 30110;
    address constant RECIPIENT = address(0xBEEF);
    address constant REFUND_ADDRESS = address(0xCAFE);

    event BridgeInitiated(
        address indexed fromAddress,
        address fromToken,
        uint256 fromAmount,
        uint256 toChainId,
        address indexed toAddress,
        address toToken,
        uint256 toAmount,
        address refundAddress
    );

    function setUp() public {
        vm.chainId(SOURCE_CHAIN);

        usdc = new TestUSDC();
        mockStargate = new MockStargate();

        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = DEST_CHAIN;

        DaimoPayLayerZeroBridger.LZBridgeRoute[]
            memory routes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);
        routes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: DEST_EID,
            app: address(mockStargate),
            bridgeTokenOut: address(usdc),
            bridgeTokenIn: address(usdc)
        });

        bridger = new DaimoPayStargateBridger(chainIds, routes);

        // Configure mock to pull tokens
        mockStargate.setBridgeTokenIn(address(usdc));

        // Approve bridger to spend our tokens
        usdc.approve(address(bridger), type(uint256).max);
    }

    // =========================================================================
    // Constructor tests
    // =========================================================================

    function test_constructor_setsRouteCorrectly() public view {
        (
            uint32 dstEid,
            address app,
            address bridgeTokenOut,
            address bridgeTokenIn
        ) = bridger.bridgeRouteMapping(DEST_CHAIN);

        assertEq(dstEid, DEST_EID);
        assertEq(app, address(mockStargate));
        assertEq(bridgeTokenOut, address(usdc));
        assertEq(bridgeTokenIn, address(usdc));
    }

    function test_constructor_revertsOnMismatchedArrayLengths() public {
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = DEST_CHAIN;
        chainIds[1] = 10; // Optimism

        DaimoPayLayerZeroBridger.LZBridgeRoute[]
            memory routes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);
        routes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: DEST_EID,
            app: address(mockStargate),
            bridgeTokenOut: address(usdc),
            bridgeTokenIn: address(usdc)
        });

        vm.expectRevert("DPLZB: wrong routes length");
        new DaimoPayStargateBridger(chainIds, routes);
    }

    function test_constructor_multipleRoutes() public {
        uint256[] memory chainIds = new uint256[](2);
        chainIds[0] = DEST_CHAIN;
        chainIds[1] = 10; // Optimism

        DaimoPayLayerZeroBridger.LZBridgeRoute[]
            memory routes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](2);
        routes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: DEST_EID,
            app: address(mockStargate),
            bridgeTokenOut: address(usdc),
            bridgeTokenIn: address(usdc)
        });
        routes[1] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: 30111, // Optimism EID
            app: address(mockStargate),
            bridgeTokenOut: address(usdc),
            bridgeTokenIn: address(usdc)
        });

        DaimoPayStargateBridger multiBridger = new DaimoPayStargateBridger(
            chainIds,
            routes
        );

        (uint32 dstEid1, , , ) = multiBridger.bridgeRouteMapping(DEST_CHAIN);
        (uint32 dstEid2, , , ) = multiBridger.bridgeRouteMapping(10);

        assertEq(dstEid1, DEST_EID);
        assertEq(dstEid2, 30111);
    }

    // =========================================================================
    // sendToChain tests
    // =========================================================================

    function test_sendToChain_success() public {
        uint256 desiredOut = 1_000_000; // 1 USDC

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: desiredOut
        });

        // Fund the bridger with native for fees
        vm.deal(address(bridger), 0.001 ether);

        uint256 balanceBefore = usdc.balanceOf(address(this));

        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );

        uint256 balanceAfter = usdc.balanceOf(address(this));
        // With no fee, input equals output
        assertEq(balanceBefore - balanceAfter, desiredOut);

        // Verify tokens were sent to MockStargate
        assertEq(usdc.balanceOf(address(mockStargate)), desiredOut);
        assertEq(mockStargate.lastSentAmount(), desiredOut);
    }

    function test_sendToChain_withFee() public {
        uint256 desiredOut = 1_000_000; // 1 USDC

        // Set 1% fee (100 bps)
        mockStargate.setFeeBps(100);

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: desiredOut
        });

        // Fund the bridger with native for fees
        vm.deal(address(bridger), 0.001 ether);

        uint256 balanceBefore = usdc.balanceOf(address(this));

        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );

        uint256 balanceAfter = usdc.balanceOf(address(this));
        uint256 inputAmount = balanceBefore - balanceAfter;

        // With 1% fee, need to send ~1.0101... to receive 1.0
        // The iterative approach should find: input * 0.99 >= desiredOut
        // So input >= desiredOut / 0.99 = 1010101 (rounded up)
        // Test by bounding the returned output amount
        assertGe(inputAmount, (desiredOut * 10100) / 10000);
        assertLe(inputAmount, (desiredOut * 10102) / 10000);

        // Verify mock received the computed input
        assertEq(usdc.balanceOf(address(mockStargate)), inputAmount);
    }

    function test_sendToChain_revertsOnSameChain() public {
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: 1_000_000
        });

        vm.expectRevert("DPSB: same chain");
        bridger.sendToChain(
            SOURCE_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );
    }

    function test_sendToChain_revertsOnRouteNotFound() public {
        uint256 unknownChainId = 999999;

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: 1_000_000
        });

        vm.expectRevert("DPLZB: route not found");
        bridger.sendToChain(
            unknownChainId,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );
    }

    function test_sendToChain_revertsOnBadBridgeToken() public {
        // Create a different token that's not configured
        TestUSDC otherToken = new TestUSDC();

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(otherToken)),
            amount: 1_000_000
        });

        vm.expectRevert("DPLZB: bad bridge token");
        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );
    }

    function test_sendToChain_revertsOnZeroAmount() public {
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({token: IERC20(address(usdc)), amount: 0});

        vm.expectRevert("DPLZB: zero amount");
        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );
    }

    function test_sendToChain_revertsOnInsufficientNativeFee() public {
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: 1_000_000
        });

        // Don't fund the bridger with native
        vm.expectRevert("DPSB: insufficient native fee");
        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );
    }

    function test_sendToChain_revertsOnInsufficientLiquidity() public {
        uint256 desiredOut = 1_000_000;

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: desiredOut
        });

        // Set available liquidity to less than desired output
        mockStargate.setAvailableLiquidity(desiredOut / 2);

        vm.deal(address(bridger), 0.01 ether);

        vm.expectRevert("DPSB: could not find input amount");
        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );
    }

    function test_sendToChain_selectsCorrectTokenFromMultipleOptions() public {
        TestUSDC otherToken = new TestUSDC();
        uint256 desiredOut = 1_000_000;

        TokenAmount[] memory opts = new TokenAmount[](2);
        opts[0] = TokenAmount({
            token: IERC20(address(otherToken)),
            amount: 2_000_000
        });
        opts[1] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: desiredOut
        });

        vm.deal(address(bridger), 0.01 ether);

        uint256 balanceBefore = usdc.balanceOf(address(this));

        // Should use the USDC option (index 1)
        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );

        // Verify the correct amount was transferred from test contract
        uint256 balanceAfter = usdc.balanceOf(address(this));
        assertEq(balanceBefore - balanceAfter, desiredOut);

        // Verify the correct amount was sent via Stargate
        assertEq(mockStargate.lastSentAmount(), desiredOut);
    }

    function test_sendToChain_refundsExcessNative() public {
        uint256 desiredOut = 1_000_000;

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: desiredOut
        });

        // Fund bridger with excess native
        uint256 excessNative = 0.1 ether;
        vm.deal(address(bridger), excessNative);

        // Record tx.origin balance before
        address origin = tx.origin;
        uint256 originBalanceBefore = origin.balance;

        bridger.sendToChain(
            DEST_CHAIN,
            RECIPIENT,
            opts,
            REFUND_ADDRESS,
            bytes("")
        );

        // Excess should be refunded to tx.origin
        uint256 originBalanceAfter = origin.balance;
        // MockStargate uses 0.001 ether fee, so refund should be ~0.099 ether
        assertGt(originBalanceAfter, originBalanceBefore);
    }

    // =========================================================================
    // getBridgeTokenIn tests
    // =========================================================================

    function test_getBridgeTokenIn_withFee() public {
        uint256 desiredOut = 99_000_000; // 99 USDC
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdc)),
            amount: desiredOut
        });

        // Set 1% fee (100 bps)
        mockStargate.setFeeBps(100);

        (address tokenIn, uint256 amountIn) = bridger.getBridgeTokenIn(
            DEST_CHAIN,
            opts
        );

        assertEq(tokenIn, address(usdc));
        // With 1% fee, need to send 100 USDC to receive 99 USDC
        assertEq(amountIn, 100_000_000);
    }

    // =========================================================================
    // receive() tests
    // =========================================================================

    function test_receive_acceptsNative() public {
        uint256 amount = 1 ether;
        vm.deal(address(this), amount);

        (bool success, ) = address(bridger).call{value: amount}("");
        assertTrue(success);
        assertEq(address(bridger).balance, amount);
    }

    receive() external payable {}
}
