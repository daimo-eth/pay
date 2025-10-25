// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {DaimoPayLegacyMeshBridger} from "../src/DaimoPayLegacyMeshBridger.sol";
import {DaimoPayLayerZeroBridger} from "../src/DaimoPayLayerZeroBridger.sol";
import {SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";

// Mock UsdtOFT that implements feeBps
contract MockUsdtOFT {
    uint16 public feeBps = 10; // 0.1% fee

    function quoteSend(
        SendParam memory,
        bool
    ) external pure returns (MessagingFee memory) {
        return MessagingFee({nativeFee: 0.001 ether, lzTokenFee: 0});
    }

    function send(
        SendParam memory,
        MessagingFee memory,
        address
    ) external payable {}

    function setFeeBps(uint16 _feeBps) external {
        feeBps = _feeBps;
    }
}

contract DaimoPayLegacyMeshBridgerTest is Test {
    DaimoPayLegacyMeshBridger private bridger;
    MockUsdtOFT private mockOFT;
    TestUSDC private usdt;

    uint256 constant SOURCE_CHAIN = 1; // Ethereum
    uint256 constant DEST_CHAIN = 42220; // Celo
    uint32 constant DEST_EID = 30125;

    function setUp() public {
        usdt = new TestUSDC();
        mockOFT = new MockUsdtOFT();

        uint256[] memory chainIds = new uint256[](1);
        chainIds[0] = DEST_CHAIN;

        DaimoPayLayerZeroBridger.LZBridgeRoute[]
            memory routes = new DaimoPayLayerZeroBridger.LZBridgeRoute[](1);
        routes[0] = DaimoPayLayerZeroBridger.LZBridgeRoute({
            dstEid: DEST_EID,
            app: address(mockOFT),
            bridgeTokenOut: address(usdt), // Simplified
            bridgeTokenIn: address(usdt)
        });

        bridger = new DaimoPayLegacyMeshBridger(chainIds, routes);
    }

    function test_getBridgeTokenIn_roundUp() public view {
        // Setup
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdt)),
            amount: 1_000_000 // 1 USDT (6 decimals)
        });

        // Get bridge token in
        (address tokenIn, uint256 amountIn) = bridger.getBridgeTokenIn(
            DEST_CHAIN,
            opts
        );

        // Verify
        assertEq(tokenIn, address(usdt));

        // With 0.1% fee (10 bps), to get 1M out we need:
        // gross = 1M * 10000 / (10000 - 10) = 1M * 10000 / 9990 ≈ 10_010_011
        uint256 expected = 1_001_002;
        assertEq(amountIn, expected);
    }

    function test_getBridgeTokenIn_exactOut() public view {
        // Setup
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdt)),
            amount: 9_990_000 // 9.99 USDT (6 decimals)
        });

        // Get bridge token in
        (address tokenIn, uint256 amountIn) = bridger.getBridgeTokenIn(
            DEST_CHAIN,
            opts
        );

        // Verify
        assertEq(tokenIn, address(usdt));

        // With 0.1% fee (10 bps), to get 9.999 USDT out we need:
        // gross = 9.99 * 10000 / (10000 - 10) = 9_990_000 * 10000 / 9990 = 10_000_000
        uint256 expected = 10_000_000;
        assertEq(amountIn, expected);
    }

    function test_sendToChain_revertsOnSameChain() public {
        vm.chainId(SOURCE_CHAIN);

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(address(usdt)),
            amount: 1_000_000
        });

        vm.expectRevert("same chain");
        bridger.sendToChain(
            SOURCE_CHAIN, // Same as current chain
            address(this),
            opts,
            address(this),
            ""
        );
    }

    receive() external payable {}
}
