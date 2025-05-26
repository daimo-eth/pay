// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "openzeppelin-contracts/contracts/utils/Strings.sol";
import {IAxelarGatewayWithToken} from "@axelar-network/contracts/interfaces/IAxelarGatewayWithToken.sol";
import {IAxelarGasService} from "@axelar-network/contracts/interfaces/IAxelarGasService.sol";
import {GasInfo} from "@axelar-network/contracts/interfaces/IAxelarGasService.sol";

contract DummyAxelarGatewayWithToken is IAxelarGatewayWithToken, Test {
    string public expectedDestinationChain;
    address public immutable expectedContractAddress;
    address public immutable expectedRecipient;
    uint256 public totalAmount;

    constructor(string memory _expectedDestinationChain, address _expectedContractAddress, address _expectedRecipient) {
        expectedDestinationChain = _expectedDestinationChain;
        expectedContractAddress = _expectedContractAddress;
        expectedRecipient = _expectedRecipient;
        totalAmount = 0;
    }

    function callContractWithToken(
        string calldata destinationChain,
        string calldata contractAddress,
        bytes calldata payload,
        string calldata symbol,
        uint256 amount
    ) external {
        assertEq(destinationChain, expectedDestinationChain, "incorrect destination chain");
        assertEq(
            contractAddress,
            Strings.toHexString(expectedContractAddress),
            "incorrect contract address"
        );
        assertEq(payload, abi.encode(expectedRecipient), "incorrect payload");
        assertEq(symbol, "axlUSDC", "incorrect symbol");

        totalAmount += amount;
    }

    function callContract(
        string calldata /* destinationChain */,
        string calldata /* destinationContractAddress */,
        bytes calldata /* payload */
    ) external pure {
        revert("not implemented");
    }

    function isContractCallApproved(
        bytes32 /* commandId */,
        string calldata /* sourceChain */,
        string calldata /* sourceAddress */,
        address /* contractAddress */,
        bytes32 /* payloadHash */
    ) external pure returns (bool) {
        revert("not implemented");
    }

    function validateContractCall(
        bytes32 /* commandId */,
        string calldata /* sourceChain */,
        string calldata /* sourceAddress */,
        bytes32 /* payloadHash */
    ) external pure returns (bool) {
        revert("not implemented");
    }

    function isCommandExecuted(
        bytes32 /* commandId */
    ) external pure returns (bool) {
        revert("not implemented");
    }

    function sendToken(
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        string calldata /* symbol */,
        uint256 /* amount */
    ) external pure {
        revert("not implemented");
    }

    function isContractCallAndMintApproved(
        bytes32 /* commandId */,
        string calldata /* sourceChain */,
        string calldata /* sourceAddress */,
        address /* contractAddress */,
        bytes32 /* payloadHash */,
        string calldata /* symbol */,
        uint256 /* amount */
    ) external pure returns (bool) {
        revert("not implemented");
    }

    function validateContractCallAndMint(
        bytes32 /* commandId */,
        string calldata /* sourceChain */,
        string calldata /* sourceAddress */,
        bytes32 /* payloadHash */,
        string calldata /* symbol */,
        uint256 /* amount */
    ) external pure returns (bool) {
        revert("not implemented");
    }

    function tokenAddresses(
        string memory /* symbol */
    ) external pure returns (address) {
        revert("not implemented");
    }
}

contract DummyAxelarGasService is IAxelarGasService, Test {
    string public expectedDestinationChain;
    address public immutable expectedContractAddress;
    address public immutable expectedRecipient;
    uint256 public immutable expectedAmount;
    address public immutable expectedRefundAddress;

    constructor(string memory _expectedDestinationChain, address _expectedContractAddress, address _expectedRecipient, uint256 _expectedAmount, address _expectedRefundAddress) {
        expectedDestinationChain = _expectedDestinationChain;
        expectedContractAddress = _expectedContractAddress;
        expectedRecipient = _expectedRecipient;
        expectedAmount = _expectedAmount;
        expectedRefundAddress = _expectedRefundAddress;
    }

    function payNativeGasForContractCallWithToken(
        address /* sender */,
        string calldata destinationChain,
        string calldata destinationAddress,
        bytes calldata payload,
        string calldata symbol,
        uint256 amount,
        address refundAddress
    ) external payable {
        assertEq(destinationChain, expectedDestinationChain, "incorrect destination chain");
        assertEq(
            destinationAddress,
            Strings.toHexString(expectedContractAddress),
            "incorrect destination address"
        );
        assertEq(payload, abi.encode(expectedRecipient), "incorrect payload");
        assertEq(symbol, "axlUSDC", "incorrect symbol");
        assertEq(amount, expectedAmount, "incorrect amount");
        assertEq(
            refundAddress,
            expectedRefundAddress,
            "incorrect refund address"
        );
    }

    function payNativeGasForExpressCallWithToken(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        string calldata /* symbol */,
        uint256 /* amount */,
        address /* refundAddress */
    ) external payable {
        revert("not implemented");
    }

    function getGasInfo(
        string calldata /* chain */
    ) external pure returns (GasInfo memory) {
        revert("not implemented");
    }

    function estimateGasFee(
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        uint256 /* executionGasLimit */,
        bytes calldata /* params */
    ) external pure returns (uint256 /* gasEstimate */) {
        revert("not implemented");
    }

    function payGas(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        uint256 /* executionGasLimit */,
        bool /* estimateOnChain */,
        address /* refundAddress */,
        bytes calldata /* params */
    ) external payable {
        revert("not implemented");
    }

    function payGasForContractCall(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        address /* gasToken */,
        uint256 /* gasFeeAmount */,
        address /* refundAddress */
    ) external pure {
        revert("not implemented");
    }

    function payGasForContractCallWithToken(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        string calldata /* symbol */,
        uint256 /* amount */,
        address /* gasToken */,
        uint256 /* gasFeeAmount */,
        address /* refundAddress */
    ) external pure {
        revert("not implemented");
    }

    function payNativeGasForContractCall(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        address /* refundAddress */
    ) external payable {
        revert("not implemented");
    }

    function payGasForExpressCall(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        address /* gasToken */,
        uint256 /* gasFeeAmount */,
        address /* refundAddress */
    ) external pure {
        revert("not implemented");
    }

    function payGasForExpressCallWithToken(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        string calldata /* symbol */,
        uint256 /* amount */,
        address /* gasToken */,
        uint256 /* gasFeeAmount */,
        address /* refundAddress */
    ) external pure {
        revert("not implemented");
    }

    function payNativeGasForExpressCall(
        address /* sender */,
        string calldata /* destinationChain */,
        string calldata /* destinationAddress */,
        bytes calldata /* payload */,
        address /* refundAddress */
    ) external payable {
        revert("not implemented");
    }

    function addGas(
        bytes32 /* txHash */,
        uint256 /* logIndex */,
        address /* gasToken */,
        uint256 /* gasFeeAmount */,
        address /* refundAddress */
    ) external pure {
        revert("not implemented");
    }

    function addNativeGas(
        bytes32 /* txHash */,
        uint256 /* logIndex */,
        address /* refundAddress */
    ) external payable {
        revert("not implemented");
    }

    function addExpressGas(
        bytes32 /* txHash */,
        uint256 /* logIndex */,
        address /* gasToken */,
        uint256 /* gasFeeAmount */,
        address /* refundAddress */
    ) external pure {
        revert("not implemented");
    }

    function addNativeExpressGas(
        bytes32 /* txHash */,
        uint256 /* logIndex */,
        address /* refundAddress */
    ) external payable {
        revert("not implemented");
    }

    function updateGasInfo(
        string[] calldata /* chains */,
        GasInfo[] calldata /* gasUpdates */
    ) external pure {
        revert("not implemented");
    }

    function collectFees(
        address payable /* receiver */,
        address[] calldata /* tokens */,
        uint256[] calldata /* amounts */
    ) external pure {
        revert("not implemented");
    }

    function refund(
        bytes32 /* txHash */,
        uint256 /* logIndex */,
        address payable /* receiver */,
        address /* token */,
        uint256 /* amount */
    ) external pure {
        revert("not implemented");
    }

    function gasCollector() external pure returns (address) {
        revert("not implemented");
    }

    function acceptOwnership() external pure {
        revert("not implemented");
    }

    function contractId() external pure returns (bytes32) {
        revert("not implemented");
    }

    function implementation() external pure returns (address) {
        revert("not implemented");
    }

    function owner() external pure returns (address) {
        revert("not implemented");
    }

    function pendingOwner() external pure returns (address) {
        revert("not implemented");
    }

    function proposeOwnership(address /* newOwner */) external pure {
        revert("not implemented");
    }

    function setup(bytes calldata /* data */) external pure {
        revert("not implemented");
    }

    function transferOwnership(address /* newOwner */) external pure {
        revert("not implemented");
    }

    function upgrade(
        address /* newImplementation */,
        bytes32 /* newImplementationCodeHash */,
        bytes calldata /* params */
    ) external pure {
        revert("not implemented");
    }
}
