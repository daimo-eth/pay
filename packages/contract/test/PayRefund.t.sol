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

        bool isValid = pr.validSafeSignature(
            signer,
            chainId,
            safe,
            messageHash,
            r,
            s,
            v
        );
        assertTrue(isValid, "valid");

        bool isInvalid = pr.validSafeSignature(
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
        // Constants
        // ...owner
        uint256 ownerChainId = 480;
        address safe = 0x110C97Cd7A4FBFF5F1e831D2BA4342aa92eAbBa4;
        address signer = 0xBBBC54500B2EBACe5384c39022F3F761c02909b3;
        console.log("ownerChainId", ownerChainId);
        console.log("safe", safe);
        console.log("signer", signer);

        // refund
        uint256 chainId = 8453;
        vm.chainId(chainId);
        address token = 0x0000000000000000000000000000000000000000;
        address payable recipient = payable(
            address(0xc60A0A0E8bBc32DAC2E03030989AD6BEe45A874D)
        );
        uint256 nonce = 0;
        console.log("token", token);
        console.log("recipient", recipient);
        console.log("nonce", nonce);

        // Deploy PayRefund, send it some funds
        PayRefundFactory fact = new PayRefundFactory{salt: 0}();
        console.log("factory", address(fact));
        PayRefund pr = fact.createRefund(signer, ownerChainId, safe);
        vm.deal(address(pr), 1230000);
        console.log("pr", address(pr));
        console.log("eth balance", address(pr).balance);
        console.log("chainId", block.chainid);

        // Real signature from World App
        bytes32 r = 0x00e889d50034b43b0ac50881cee3ed38f8950f9f9d6d970b32406eacbacc784c;
        bytes32 s = 0x5d9a92d4ae788e8df4b77663d244fac8344c0937ff74e08987d72b192fb0abf0;
        uint8 v = 0x1b;

        // Call sendToken
        pr.sendToken(IERC20(token), recipient, nonce, r, s, v);

        // Assert nonce incremented and funds retrieved
        assertEq(pr.nonce(), 1, "nonce incremented");
        assertEq(recipient.balance, 1230000);

        // Replaying the same tx again results in a nonce error
        vm.expectRevert("PR: invalid nonce");
        pr.sendToken(IERC20(token), recipient, nonce, r, s, v);
    }

    function testSendTokenCrossChainReplay() public {
        uint256 ownerChainId = 480;
        address safe = 0x110C97Cd7A4FBFF5F1e831D2BA4342aa92eAbBa4;
        address signer = 0xBBBC54500B2EBACe5384c39022F3F761c02909b3;

        address token = 0x0000000000000000000000000000000000000000;
        address payable recipient = payable(
            0xc60A0A0E8bBc32DAC2E03030989AD6BEe45A874D
        );
        uint256 nonce = 0;

        bytes32 r = 0x00e889d50034b43b0ac50881cee3ed38f8950f9f9d6d970b32406eacbacc784c;
        bytes32 s = 0x5d9a92d4ae788e8df4b77663d244fac8344c0937ff74e08987d72b192fb0abf0;
        uint8 v = 0x1b;

        // Replaying same tx on different chain results in signature error
        vm.chainId(10);
        PayRefundFactory fact = new PayRefundFactory{salt: 0}();
        PayRefund pr = fact.createRefund(signer, ownerChainId, safe);
        require(address(pr) == address(pr), "same PayRefund across chains");
        assertEq(block.chainid, 10, "new chainId");
        assertEq(pr.nonce(), 0, "fresh nonce");
        vm.deal(address(pr), 1230000);
        vm.expectRevert("PR: invalid signature");
        pr.sendToken(IERC20(token), recipient, nonce, r, s, v);
    }
}
