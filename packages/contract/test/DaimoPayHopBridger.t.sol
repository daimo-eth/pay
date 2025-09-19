// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {DaimoPayHopBridger} from "../src/DaimoPayHopBridger.sol";
import {IDaimoPayBridger} from "../src/interfaces/IDaimoPayBridger.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {DummyUniversalBridger} from "./utils/DummyUniversalBridger.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";
import {TestToken2Decimals} from "./utils/Dummy2DecimalsToken.sol";

contract DaimoPayHopBridgerHarness is DaimoPayHopBridger {
    constructor(
        uint256 hopChainId,
        address hopCoinAddr,
        uint256 hopCoinDecimals,
        IDaimoPayBridger hopBridger,
        FinalChainCoin[] memory finalChainCoins
    )
        DaimoPayHopBridger(
            hopChainId,
            hopCoinAddr,
            hopCoinDecimals,
            hopBridger,
            finalChainCoins
        )
    {}

    function expose_getHopAsset(
        uint256 toChainId,
        TokenAmount[] calldata tokenOpts
    ) external view returns (TokenAmount[] memory) {
        return _getHopAsset(toChainId, tokenOpts);
    }
}

contract DaimoPayHopBridgerTest is Test {
    DummyUniversalBridger private hop;
    DaimoPayHopBridgerHarness private hb;
    TestUSDC private usdc6; // acts as final coin
    TestToken2Decimals private usdc2; // acts as hop coin (2 decimals)

    uint256 constant HOP_CHAIN = 42161;
    uint256 constant DST_CHAIN = 10;

    function setUp() public {
        hop = new DummyUniversalBridger();
        usdc6 = new TestUSDC();
        usdc2 = new TestToken2Decimals();

        DaimoPayHopBridger.FinalChainCoin[]
            memory coins = new DaimoPayHopBridger.FinalChainCoin[](1);
        coins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: DST_CHAIN,
            coinAddr: address(usdc6),
            coinDecimals: 6
        });

        hb = new DaimoPayHopBridgerHarness({
            hopChainId: HOP_CHAIN,
            hopCoinAddr: address(usdc2),
            hopCoinDecimals: 2,
            hopBridger: IDaimoPayBridger(address(hop)),
            finalChainCoins: coins
        });
    }

    function test_getHopAsset_singleElement_and_rounding() public view {
        // Request 100_000 units of 6-dec token -> expect 2-dec hop amount 100_000 / 10^(6-2) = 10
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({token: IERC20(address(usdc6)), amount: 100_000});

        TokenAmount[] memory hopOpts = hb.expose_getHopAsset(DST_CHAIN, opts);
        assertEq(hopOpts.length, 1);
        assertEq(address(hopOpts[0].token), address(usdc2));
        assertEq(hopOpts[0].amount, 10);
    }

    function test_getHopAsset_roundsUp() public view {
        // 1 unit of 6-dec -> to 2-dec should round up to 1 (since 0.0001 -> 0.01)
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({token: IERC20(address(usdc6)), amount: 1});

        TokenAmount[] memory hopOpts = hb.expose_getHopAsset(DST_CHAIN, opts);
        assertEq(hopOpts[0].amount, 1);
    }

    function test_getHopAsset_lowToHighDecimals() public {
        // Setup a new bridger where final coin has 2 decimals and hop coin has 6 decimals
        DaimoPayHopBridger.FinalChainCoin[]
            memory coins = new DaimoPayHopBridger.FinalChainCoin[](1);
        coins[0] = DaimoPayHopBridger.FinalChainCoin({
            finalChainId: DST_CHAIN,
            coinAddr: address(usdc2),
            coinDecimals: 2
        });

        DaimoPayHopBridgerHarness hb2 = new DaimoPayHopBridgerHarness({
            hopChainId: HOP_CHAIN,
            hopCoinAddr: address(usdc6),
            hopCoinDecimals: 6,
            hopBridger: IDaimoPayBridger(address(hop)),
            finalChainCoins: coins
        });

        // 10 units of 2-dec token -> to 6-dec should multiply by 10^(6-2) = 10,000 => 100,000
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({token: IERC20(address(usdc2)), amount: 10});

        TokenAmount[] memory hopOpts = hb2.expose_getHopAsset(DST_CHAIN, opts);
        assertEq(hopOpts.length, 1);
        assertEq(address(hopOpts[0].token), address(usdc6));
        assertEq(hopOpts[0].amount, 100_000);
    }
}
