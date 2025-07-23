// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import "../src/PayRefund.sol";
import "../src/PayRefundFactory.sol";
import "./utils/DummyUSDC.sol";

contract PayRefundTest is Test {
    function testDomainSeparator() public pure {
        bytes32 DOMAIN_SEPARATOR_TYPEHASH = keccak256(
            "EIP712Domain(uint256 chainId,address verifyingContract)"
        );
        bytes32 domainSeparator = keccak256(
            abi.encode(
                DOMAIN_SEPARATOR_TYPEHASH,
                480,
                0x110C97Cd7A4FBFF5F1e831D2BA4342aa92eAbBa4
            )
        );
        require(
            domainSeparator ==
                0xb171c104f5d5f66a36459750eb14f17efab26970befea6c5f06b9a1e54f9683d,
            "domainSeparator"
        );
    }

    function testValidSignature() public {
        bytes32 messageHash = keccak256(
            "\x19Ethereum Signed Message:\n13Hello, world!"
        );
        bytes32 expectedMessageHash = 0xb453bd4e271eed985cbab8231da609c4ce0a9cf1f763b6c1594e76315510e0f1;

        require(messageHash == expectedMessageHash, "message");

        bytes32 r = 0x844e60cc2fbbb7b54128ee4264b6d582c39e7d2ac11ce94960e815c521aa7a19;
        bytes32 s = 0x39383e75f95aaf3740b70d9b00f76ebd37df76ddbf75f0a147a02b38652f5fc4;
        uint8 v = 28;

        uint256 chainId = 480;
        address safe = 0x110C97Cd7A4FBFF5F1e831D2BA4342aa92eAbBa4;

        address signer = 0xBBBC54500B2EBACe5384c39022F3F761c02909b3;

        PayRefund pr = new PayRefund();

        bool isValid = pr.validSignature(
            signer,
            chainId,
            safe,
            messageHash,
            r,
            s,
            v
        );
        assertTrue(isValid, "valid");

        bool isInvalid = pr.validSignature(
            address(0),
            chainId,
            safe,
            messageHash,
            r,
            s,
            v
        );
        assertFalse(isInvalid, "invalid: wrong signer");
    }

    function testSendToken() public {
        // Dummy token
        IERC20 token = new TestUSDC{salt: 0}();

        // Constants
        uint256 chainId = 480;
        address safe = 0x110C97Cd7A4FBFF5F1e831D2BA4342aa92eAbBa4;

        address signer = 0xBBBC54500B2EBACe5384c39022F3F761c02909b3;
        address payable recipient = payable(
            address(0x1010101010101010101010101010101010101010)
        );
        console.log("token", address(token));
        console.log("signer", signer);
        console.log("recipient", recipient);

        // Deploy PayRefund, send it some funds
        PayRefundFactory fact = new PayRefundFactory{salt: 0}();
        console.log("factory", address(fact));
        PayRefund pr = fact.createRefund(signer, chainId, safe);
        token.transfer(address(pr), 1230000);
        console.log("pr", address(pr));
        console.log("token balance", token.balanceOf(address(pr)));

        // Real signature from World App
        bytes32 r = 0x2b24a63ffbbd6027a93311ed37fff8faceefb99b512c82bc6a56ea361dcaa89c;
        bytes32 s = 0x7fb6908297af3759eed546fdc57dfda3048c235e8e3c13e44c61f4fb6ca67f13;
        uint8 v = 0x1c;

        // Call sendToken
        pr.sendToken(IERC20(token), recipient, r, s, v);

        // Assert nonce incremented and funds retrieved
        assertEq(pr.nonce(), 1);
        assertEq(token.balanceOf(recipient), 1230000);
    }
}
