// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import {AccountVaultManager} from "../src/AccountVaultManager.sol";
import {AccountVaultFactory} from "../src/AccountVaultFactory.sol";
import {AccountVaultParams} from "../src/AccountVault.sol";
import {TokenAmount} from "../src/TokenUtils.sol";
import {DaimoPayRelayer} from "../src/relayer/DaimoPayRelayer.sol";
import {TestUSDC} from "./utils/DummyUSDC.sol";

contract AccountVaultManagerTest is Test {
    address private constant OWNER = address(0x1);
    address private constant RELAYER = address(0x2);
    address private constant RELAYER2 = address(0x3);
    address private constant USER = address(0x4);
    address private constant UNAUTHORIZED = address(0x5);
    address private constant HUB_OPERATOR = address(0x6);
    address private constant RELAYER3 = address(0x7);
    address payable private constant REPAYMENT_RELAYER = payable(address(0x8));
    address payable private constant NEW_REPAYMENT_RELAYER = payable(address(0x9));

    AccountVaultManager private manager;
    AccountVaultFactory private factory;
    DaimoPayRelayer private hub;
    TestUSDC private usdc;

    function setUp() public {
        factory = new AccountVaultFactory();
        manager = new AccountVaultManager(OWNER, factory, REPAYMENT_RELAYER);
        hub = new DaimoPayRelayer(OWNER);
        usdc = new TestUSDC();

        AccountVaultManager.RelayerUpdate[] memory updates = new AccountVaultManager.RelayerUpdate[](3);
        updates[0] = AccountVaultManager.RelayerUpdate({relayer: RELAYER, authorized: true});
        updates[1] = AccountVaultManager.RelayerUpdate({relayer: RELAYER2, authorized: true});
        updates[2] = AccountVaultManager.RelayerUpdate({relayer: address(hub), authorized: true});

        vm.startPrank(OWNER);
        manager.configureRelayers(REPAYMENT_RELAYER, updates);
        hub.grantRole(hub.DEFAULT_ADMIN_ROLE(), HUB_OPERATOR);
        vm.stopPrank();
    }

    function test_fastFinishERC20_DirectRelayer() public {
        AccountVaultParams memory params = _params(USER);
        uint256 amount = 100e6;

        assertEq(usdc.balanceOf(address(manager)), 0);

        _directFastFinishERC20(params, amount, RELAYER);

        assertEq(usdc.balanceOf(USER), amount);
        assertEq(_debt(params, IERC20(address(usdc))), amount);
        _assertManagerHoldsNoFunds();
    }

    function test_fastFinishERC20_ViaHub() public {
        AccountVaultParams memory params = _params(USER);
        uint256 amount = 75e6;

        usdc.transfer(address(hub), amount);

        vm.prank(HUB_OPERATOR);
        hub.accountVaultFastFinish(manager, params, TokenAmount({token: IERC20(address(usdc)), amount: amount}));

        assertEq(usdc.balanceOf(USER), amount);
        assertEq(_debt(params, IERC20(address(usdc))), amount);
        assertEq(usdc.allowance(address(hub), address(manager)), 0);
        _assertManagerHoldsNoFunds();
    }

    function test_fastFinishNative_ExactValueRequired() public {
        AccountVaultParams memory params = _params(USER);
        uint256 amount = 1 ether;

        vm.deal(RELAYER, amount);
        vm.prank(RELAYER);
        vm.expectRevert("AVM: wrong value");
        manager.fastFinish{value: amount - 1}(params, IERC20(address(0)), amount);

        vm.prank(RELAYER);
        manager.fastFinish{value: amount}(params, IERC20(address(0)), amount);

        assertEq(USER.balance, amount);
        assertEq(_debt(params, IERC20(address(0))), amount);
        assertEq(address(manager).balance, 0);
    }

    function test_fastFinishUnauthorizedCaller_Reverts() public {
        AccountVaultParams memory params = _params(USER);

        usdc.transfer(UNAUTHORIZED, 1e6);
        vm.startPrank(UNAUTHORIZED);
        usdc.approve(address(manager), 1e6);
        vm.expectRevert("AVM: only relayer");
        manager.fastFinish(params, IERC20(address(usdc)), 1e6);
        vm.stopPrank();
    }

    function test_fastFinishUserCannotCall() public {
        AccountVaultParams memory params = _params(USER);

        usdc.transfer(USER, 1e6);
        vm.startPrank(USER);
        usdc.approve(address(manager), 1e6);
        vm.expectRevert("AVM: only relayer");
        manager.fastFinish(params, IERC20(address(usdc)), 1e6);
        vm.stopPrank();
    }

    function test_claimNoDebt_PaysUserDirectly() public {
        AccountVaultParams memory params = _params(USER);
        uint256 amount = 200e6;

        _fundVaultERC20(params, amount);

        vm.prank(RELAYER);
        manager.claim(params, IERC20(address(usdc)));

        assertEq(usdc.balanceOf(USER), amount);
        assertEq(_debt(params, IERC20(address(usdc))), 0);
        _assertManagerHoldsNoFunds();
    }

    function test_claimPartialDebt_PaysRepaymentRelayerThenUser() public {
        AccountVaultParams memory params = _params(USER);

        _directFastFinishERC20(params, 40e6, RELAYER);
        _fundVaultERC20(params, 100e6);

        uint256 repaymentBefore = REPAYMENT_RELAYER.balance;
        uint256 repaymentTokenBefore = usdc.balanceOf(REPAYMENT_RELAYER);
        uint256 relayerBefore = usdc.balanceOf(RELAYER);
        uint256 userBefore = usdc.balanceOf(USER);

        vm.prank(RELAYER);
        manager.claim(params, IERC20(address(usdc)));

        assertEq(usdc.balanceOf(REPAYMENT_RELAYER) - repaymentTokenBefore, 40e6);
        assertEq(REPAYMENT_RELAYER.balance - repaymentBefore, 0);
        assertEq(usdc.balanceOf(USER) - userBefore, 60e6);
        assertEq(usdc.balanceOf(RELAYER) - relayerBefore, 0);
        assertEq(_debt(params, IERC20(address(usdc))), 0);
        _assertManagerHoldsNoFunds();
    }

    function test_claimDebtExceedsVaultBalance_PaysOnlyRepaymentRelayer() public {
        AccountVaultParams memory params = _params(USER);

        _directFastFinishERC20(params, 60e6, RELAYER);
        _directFastFinishERC20(params, 40e6, RELAYER2);
        _fundVaultERC20(params, 70e6);

        uint256 repaymentBefore = usdc.balanceOf(REPAYMENT_RELAYER);
        uint256 userBefore = usdc.balanceOf(USER);

        vm.prank(USER);
        manager.claim(params, IERC20(address(usdc)));

        assertEq(usdc.balanceOf(REPAYMENT_RELAYER) - repaymentBefore, 70e6);
        assertEq(usdc.balanceOf(USER) - userBefore, 0);
        assertEq(_debt(params, IERC20(address(usdc))), 30e6);
        _assertManagerHoldsNoFunds();
    }

    function test_multipleFastFinishes_AggregateIntoScalarDebt() public {
        AccountVaultParams memory params = _params(USER);

        _directFastFinishERC20(params, 60e6, RELAYER);
        _directFastFinishERC20(params, 40e6, RELAYER2);

        assertEq(_debt(params, IERC20(address(usdc))), 100e6);
    }

    function test_configureRelayers_RotatesRepaymentRelayerAtomically() public {
        AccountVaultParams memory params = _params(USER);
        _directFastFinishERC20(params, 100e6, RELAYER);

        AccountVaultManager.RelayerUpdate[] memory updates = new AccountVaultManager.RelayerUpdate[](2);
        updates[0] = AccountVaultManager.RelayerUpdate({relayer: RELAYER, authorized: false});
        updates[1] = AccountVaultManager.RelayerUpdate({relayer: RELAYER3, authorized: true});

        vm.prank(OWNER);
        manager.configureRelayers(NEW_REPAYMENT_RELAYER, updates);

        assertFalse(manager.relayerAuthorized(RELAYER));
        assertTrue(manager.relayerAuthorized(RELAYER3));
        assertEq(manager.repaymentRelayer(), address(NEW_REPAYMENT_RELAYER));

        _fundVaultERC20(params, 100e6);
        uint256 oldRepaymentBefore = usdc.balanceOf(REPAYMENT_RELAYER);
        uint256 newRepaymentBefore = usdc.balanceOf(NEW_REPAYMENT_RELAYER);

        vm.prank(RELAYER3);
        manager.claim(params, IERC20(address(usdc)));

        assertEq(usdc.balanceOf(REPAYMENT_RELAYER) - oldRepaymentBefore, 0);
        assertEq(usdc.balanceOf(NEW_REPAYMENT_RELAYER) - newRepaymentBefore, 100e6);
        assertEq(_debt(params, IERC20(address(usdc))), 0);
        _assertManagerHoldsNoFunds();
    }

    function test_claimViaHub_UsesHubAuthorization() public {
        AccountVaultParams memory params = _params(USER);

        _directFastFinishERC20(params, 30e6, RELAYER);
        _fundVaultERC20(params, 30e6);

        uint256 repaymentBefore = usdc.balanceOf(REPAYMENT_RELAYER);

        vm.prank(HUB_OPERATOR);
        hub.accountVaultClaim(manager, params, IERC20(address(usdc)));

        assertEq(usdc.balanceOf(REPAYMENT_RELAYER) - repaymentBefore, 30e6);
        assertEq(_debt(params, IERC20(address(usdc))), 0);
        _assertManagerHoldsNoFunds();
    }

    function test_claimNativeToNonPayableRecipient_Reverts() public {
        NonPayableReceiver nonPayable = new NonPayableReceiver();
        AccountVaultParams memory params = _params(address(nonPayable));

        _fundVaultNative(params, 1 ether);

        vm.prank(RELAYER);
        vm.expectRevert("TokenUtils: ETH transfer failed");
        manager.claim(params, IERC20(address(0)));
    }

    function test_claimNativeToNonPayableRepaymentRelayer_Reverts() public {
        NonPayableReceiver nonPayable = new NonPayableReceiver();
        AccountVaultParams memory params = _params(USER);

        vm.prank(OWNER);
        manager.configureRelayers(payable(address(nonPayable)), _noUpdates());

        _directFastFinishNative(params, 0.5 ether, RELAYER);
        _fundVaultNative(params, 1 ether);

        vm.prank(RELAYER);
        vm.expectRevert("TokenUtils: ETH transfer failed");
        manager.claim(params, IERC20(address(0)));
    }

    function test_strayETHTransferToManager_Reverts() public {
        vm.deal(UNAUTHORIZED, 1 ether);

        vm.prank(UNAUTHORIZED);
        (bool success,) = address(manager).call{value: 1 ether}("");

        assertFalse(success);
        assertEq(address(manager).balance, 0);
    }

    function test_managerBalanceInvariant_AfterERC20Flow() public {
        AccountVaultParams memory params = _params(USER);

        _directFastFinishERC20(params, 25e6, RELAYER);
        _fundVaultERC20(params, 25e6);

        vm.prank(RELAYER);
        manager.claim(params, IERC20(address(usdc)));

        _assertManagerHoldsNoFunds();
    }

    function test_managerBalanceInvariant_AfterNativeFlow() public {
        AccountVaultParams memory params = _params(USER);

        _directFastFinishNative(params, 0.25 ether, RELAYER);
        _fundVaultNative(params, 0.5 ether);

        vm.prank(USER);
        manager.claim(params, IERC20(address(0)));

        assertEq(address(manager).balance, 0);
        assertEq(usdc.balanceOf(address(manager)), 0);
    }

    function _params(address toAddress) internal view returns (AccountVaultParams memory) {
        return AccountVaultParams({toAddress: toAddress, escrow: address(manager)});
    }

    function _vaultAddress(AccountVaultParams memory params) internal view returns (address) {
        return factory.getAccountVault(params);
    }

    function _debt(AccountVaultParams memory params, IERC20 token) internal view returns (uint256) {
        return manager.accountVaultDebt(_vaultAddress(params), address(token));
    }

    function _directFastFinishERC20(AccountVaultParams memory params, uint256 amount, address relayer) internal {
        usdc.transfer(relayer, amount);

        vm.startPrank(relayer);
        usdc.approve(address(manager), amount);
        manager.fastFinish(params, IERC20(address(usdc)), amount);
        vm.stopPrank();

        _assertManagerHoldsNoFunds();
    }

    function _directFastFinishNative(AccountVaultParams memory params, uint256 amount, address relayer) internal {
        vm.deal(relayer, amount);

        vm.prank(relayer);
        manager.fastFinish{value: amount}(params, IERC20(address(0)), amount);

        assertEq(address(manager).balance, 0);
    }

    function _fundVaultERC20(AccountVaultParams memory params, uint256 amount) internal {
        usdc.transfer(_vaultAddress(params), amount);
    }

    function _fundVaultNative(AccountVaultParams memory params, uint256 amount) internal {
        vm.deal(_vaultAddress(params), amount);
    }

    function _assertManagerHoldsNoFunds() internal view {
        assertEq(usdc.balanceOf(address(manager)), 0);
        assertEq(address(manager).balance, 0);
    }

    function _noUpdates() internal pure returns (AccountVaultManager.RelayerUpdate[] memory updates) {
        updates = new AccountVaultManager.RelayerUpdate[](0);
    }
}

contract NonPayableReceiver {}
