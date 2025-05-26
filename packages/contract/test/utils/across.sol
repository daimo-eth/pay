// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../../vendor/across/V3SpokePoolInterface.sol";

contract DummySpokePool is V3SpokePoolInterface, Test {
    address public immutable expectedInputToken;
    address public immutable expectedOutputToken;
    address public immutable expectedRecipient;
    uint256 public totalInputAmount;
    uint256 public totalOutputAmount;

    constructor(
        address _expectedInputToken,
        address _expectedOutputToken,
        address _expectedRecipient
    ) {
        expectedInputToken = _expectedInputToken;
        expectedOutputToken = _expectedOutputToken;
        expectedRecipient = _expectedRecipient;
        totalInputAmount = 0;
        totalOutputAmount = 0;
    }

    function depositV3(
        address /* depositor */,
        address recipient,
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 destinationChainId,
        address exclusiveRelayer,
        uint32 quoteTimestamp,
        uint32 fillDeadline,
        uint32 exclusivityDeadline,
        bytes calldata message
    ) external payable {
        assertEq(recipient, expectedRecipient, "incorrect recipient");
        assertEq(inputToken, expectedInputToken, "incorrect input token");
        assertEq(outputToken, expectedOutputToken, "incorrect output token");
        assertEq(inputAmount, 110, "incorrect input amount");
        assertEq(outputAmount, 100, "incorrect output amount");
        assertEq(destinationChainId, 59144, "incorrect destination chain id");
        assertEq(exclusiveRelayer, address(0), "incorrect exclusive relayer");
        assertEq(quoteTimestamp, block.timestamp, "incorrect quote timestamp");
        assertEq(
            fillDeadline,
            block.timestamp + 1 hours,
            "incorrect fill deadline"
        );
        assertEq(exclusivityDeadline, 0, "incorrect exclusivity deadline");
        assertEq(message, "gm ser", "incorrect message");

        IERC20(inputToken).transferFrom(
            msg.sender,
            address(0xdead),
            inputAmount
        );
        totalInputAmount += inputAmount;
        totalOutputAmount += outputAmount;
    }

    function depositV3Now(
        address depositor,
        address recipient,
        address inputToken,
        address outputToken,
        uint256 inputAmount,
        uint256 outputAmount,
        uint256 destinationChainId,
        address exclusiveRelayer,
        uint32 fillDeadlineOffset,
        uint32 exclusivityDeadline,
        bytes calldata message
    ) external payable {}

    function speedUpV3Deposit(
        address depositor,
        uint32 depositId,
        uint256 updatedOutputAmount,
        address updatedRecipient,
        bytes calldata updatedMessage,
        bytes calldata depositorSignature
    ) external {}

    function fillV3Relay(
        V3RelayData calldata relayData,
        uint256 repaymentChainId
    ) external {}

    function fillV3RelayWithUpdatedDeposit(
        V3RelayData calldata relayData,
        uint256 repaymentChainId,
        uint256 updatedOutputAmount,
        address updatedRecipient,
        bytes calldata updatedMessage,
        bytes calldata depositorSignature
    ) external {}

    function requestV3SlowFill(V3RelayData calldata relayData) external {}

    function executeV3SlowRelayLeaf(
        V3SlowFill calldata slowFillLeaf,
        uint32 rootBundleId,
        bytes32[] calldata proof
    ) external {}
}