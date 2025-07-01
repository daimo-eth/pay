// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "./UA_Setup.t.sol";
import {UniversalAddress, BridgeReceiver} from "../src/UniversalAddress.sol";
import {Call} from "../src/DaimoPayExecutor.sol";
import {IDaimoPayBridger, TokenAmount} from "../src/interfaces/IDaimoPayBridger.sol";
import {DummyBridger} from "./utils/DummyBridger.sol";
import {DummySwapper} from "./utils/DummySwapper.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

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

        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
        uint256 amount = 100e6;
        _depositToUA(ua, amount);

        // Expect StartBridge event with receiver == beneficiary
        vm.expectEmit(address(ua));
        emit UniversalAddress.StartBridge(ZERO_SALT, amount, BOB);

        ua.start(usdc, ZERO_SALT, new Call[](0), "");

        // Funds should have been delivered to beneficiary
        assertEq(usdc.balanceOf(BOB), amount);
        assertEq(usdc.balanceOf(address(ua)), 0);

        // reset chain id for other tests
        vm.chainId(origChain);
    }

    function testStartCrossChainNoSwap() public {
        // Source chain remains as default (likely 1)
        UniversalAddress ua = _deployUniversalAddress(BOB, ALICE);
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
