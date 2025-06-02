// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

import "../../vendor/cctp/v2/ICCTPTokenMessengerV2.sol";
import "../../vendor/cctp/v2/ITokenMinterV2.sol";

contract DummyCCTPMessengerV2 is ICCTPTokenMessengerV2, Test {
    uint256 public amountBurned;

    uint32 public immutable expectedDestinationDomain;
    address public immutable expectedRecipient;
    address public immutable expectedBurnToken;

    constructor(uint32 _expectedDestinationDomain, address _expectedRecipient, address _expectedBurnToken) {
        amountBurned = 0;
        expectedDestinationDomain = _expectedDestinationDomain;
        expectedRecipient = _expectedRecipient;
        expectedBurnToken = _expectedBurnToken;
    }

    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external {
        assertEq(amount, 100, "incorrect amount");
        assertEq(destinationDomain, expectedDestinationDomain, "incorrect destination domain");
        assertEq(
            mintRecipient,
            bytes32(uint256(uint160(expectedRecipient))),
            "incorrect mint recipient"
        );
        assertEq(burnToken, expectedBurnToken, "incorrect burn token");
        assertEq(destinationCaller, bytes32(0), "incorrect destination caller");
        assertEq(maxFee, 0, "incorrect max fee");
        assertEq(minFinalityThreshold, 2000, "incorrect min finality threshold");

        // Burn it
        IERC20(burnToken).transferFrom(msg.sender, address(0xdead), amount);
        amountBurned += amount;
    }
}

contract DummyTokenMinterV2 is ITokenMinterV2, Test {
    mapping(uint32 => mapping(bytes32 => address)) private localTokens;

    function mint(
        uint32 /*sourceDomain*/,
        bytes32 /*burnToken*/,
        address /*to*/,
        uint256 /*amount*/
    ) external pure returns (address mintToken) {
        mintToken = address(0);
    }

    function mint(
        uint32 /*sourceDomain*/,
        bytes32 /*burnToken*/,
        address /*recipientOne*/,
        address /*recipientTwo*/,
        uint256 /*amountOne*/,
        uint256 /*amountTwo*/
    ) external pure returns (address mintToken) {
        mintToken = address(0);
    }

    function burn(address /*burnToken*/, uint256 /*amount*/) external {}

    function getLocalToken(
        uint32 remoteDomain,
        bytes32 remoteToken
    ) public view returns (address) {
        return localTokens[remoteDomain][remoteToken];
    }

    function setTokenController(address /*newTokenController*/) external {}

    // Helper function to set up token mappings for testing
    function setLocalToken(
        uint32 remoteDomain,
        bytes32 remoteToken,
        address localToken
    ) external {
        localTokens[remoteDomain][remoteToken] = localToken;
    }
}