// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import {DaimoPayPricer} from "../src/DaimoPayPricer.sol";
import {PriceData} from "../src/interfaces/IDaimoPayPricer.sol";

contract DaimoPayPricerTest is Test {
    // ---------------------------------------------------------------------
    // Test constants & actors
    // ---------------------------------------------------------------------
    address private constant TRUSTED_SIGNER =
        address(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa);
    address private constant UNTRUSTED_SIGNER =
        address(0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB);
    address private constant TOKEN_ADDRESS =
        address(0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48); // Example USDC address

    uint256 private constant TRUSTED_SIGNER_KEY = 0xa11ce;
    uint256 private constant UNTRUSTED_SIGNER_KEY = 0xb0b;
    uint256 private constant MAX_PRICE_AGE = 300; // 5 minutes

    // ---------------------------------------------------------------------
    // Deployed contracts
    // ---------------------------------------------------------------------
    DaimoPayPricer private pricer;

    // ---------------------------------------------------------------------
    // Setup
    // ---------------------------------------------------------------------
    function setUp() public {
        // Warp to a reasonable timestamp to avoid underflow in timestamp math
        vm.warp(1_700_000_000);

        // Deploy pricer with trusted signer and max price age
        address trustedSignerAddr = vm.addr(TRUSTED_SIGNER_KEY);
        pricer = new DaimoPayPricer(trustedSignerAddr, MAX_PRICE_AGE);
    }

    // ---------------------------------------------------------------------
    // Helper functions
    // ---------------------------------------------------------------------
    function _createPriceData(
        address token,
        uint256 priceUsd,
        uint256 timestamp
    ) internal pure returns (PriceData memory) {
        return
            PriceData({
                token: token,
                priceUsd: priceUsd,
                timestamp: timestamp,
                signature: ""
            });
    }

    function _signPriceData(
        PriceData memory priceData,
        uint256 signerKey
    ) internal view returns (bytes memory) {
        return _signPriceDataWithChainId(priceData, signerKey, block.chainid);
    }

    function _signPriceDataWithChainId(
        PriceData memory priceData,
        uint256 signerKey,
        uint256 chainId
    ) internal pure returns (bytes memory) {
        bytes32 messageHash = keccak256(
            abi.encodePacked(
                priceData.token,
                priceData.priceUsd,
                priceData.timestamp,
                chainId
            )
        );

        bytes32 ethSignedMessageHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(
            signerKey,
            ethSignedMessageHash
        );
        return abi.encodePacked(r, s, v);
    }

    // ---------------------------------------------------------------------
    // Constructor tests
    // ---------------------------------------------------------------------
    function testConstructor_ValidSigner() public {
        address signer = address(0x123);
        uint256 maxAge = 600;
        DaimoPayPricer newPricer = new DaimoPayPricer(signer, maxAge);
        assertEq(newPricer.trustedSigner(), signer);
        assertEq(newPricer.maxPriceAge(), maxAge);
    }

    function testConstructor_ZeroAddress_Reverts() public {
        vm.expectRevert(bytes("Invalid signer address"));
        new DaimoPayPricer(address(0), 300);
    }

    function testConstructor_ZeroMaxAge_Reverts() public {
        address signer = address(0x123);
        vm.expectRevert(bytes("Invalid max price age"));
        new DaimoPayPricer(signer, 0);
    }

    // ---------------------------------------------------------------------
    // validatePrice tests - Valid signatures
    // ---------------------------------------------------------------------
    function testValidatePrice_ValidSignature_ReturnsTrue() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18, // $2000 with 18 decimals
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    function testValidatePrice_DifferentPrices_Valid() public {
        uint256[] memory prices = new uint256[](3);
        prices[0] = 1e18; // $1
        prices[1] = 1000e18; // $1000
        prices[2] = 50000e18; // $50000

        for (uint256 i = 0; i < prices.length; i++) {
            PriceData memory priceData = _createPriceData(
                TOKEN_ADDRESS,
                prices[i],
                block.timestamp
            );

            priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

            bool isValid = pricer.validatePrice(priceData);
            assertTrue(isValid, "Price validation should succeed");
        }
    }

    function testValidatePrice_DifferentTimestamps_Valid() public {
        uint256[] memory timestamps = new uint256[](3);
        timestamps[0] = block.timestamp;
        timestamps[1] = block.timestamp - 60; // 1 minute ago
        timestamps[2] = block.timestamp - MAX_PRICE_AGE + 1; // Just within max age

        for (uint256 i = 0; i < timestamps.length; i++) {
            PriceData memory priceData = _createPriceData(
                TOKEN_ADDRESS,
                2000e18,
                timestamps[i]
            );

            priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

            bool isValid = pricer.validatePrice(priceData);
            assertTrue(isValid, "Timestamp validation should succeed");
        }
    }

    function testValidatePrice_DifferentTokens_Valid() public {
        address[] memory tokens = new address[](3);
        tokens[0] = address(0x1);
        tokens[1] = address(0x2);
        tokens[2] = TOKEN_ADDRESS;

        for (uint256 i = 0; i < tokens.length; i++) {
            PriceData memory priceData = _createPriceData(
                tokens[i],
                2000e18,
                block.timestamp
            );

            priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

            bool isValid = pricer.validatePrice(priceData);
            assertTrue(isValid, "Token validation should succeed");
        }
    }

    // ---------------------------------------------------------------------
    // validatePrice tests - Invalid signatures
    // ---------------------------------------------------------------------
    function testValidatePrice_UntrustedSigner_ReturnsFalse() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        // Sign with untrusted signer's key
        priceData.signature = _signPriceData(priceData, UNTRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_TamperedPrice_ReturnsFalse() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        // Tamper with price after signing
        priceData.priceUsd = 3000e18;

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_TamperedTimestamp_ReturnsFalse() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        // Tamper with timestamp after signing
        priceData.timestamp = block.timestamp + 1 hours;

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_TamperedToken_ReturnsFalse() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        // Tamper with token address after signing
        priceData.token = address(0x999);

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_InvalidSignatureFormat_Reverts() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        // Invalid signature (too short)
        priceData.signature = hex"1234";

        vm.expectRevert();
        pricer.validatePrice(priceData);
    }

    function testValidatePrice_EmptySignature_Reverts() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        priceData.signature = "";

        vm.expectRevert();
        pricer.validatePrice(priceData);
    }

    function testValidatePrice_WrongSignatureLength_Reverts() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        // Signature with wrong length (should be 65 bytes)
        priceData.signature = new bytes(64);

        vm.expectRevert();
        pricer.validatePrice(priceData);
    }

    // ---------------------------------------------------------------------
    // Cross-chain replay protection tests
    // ---------------------------------------------------------------------
    function testValidatePrice_CrossChainReplay_ReturnsFalse() public {
        // Create price data
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        // Sign with a different chain ID (e.g., Optimism = 10, Base = 8453)
        uint256 wrongChainId = 8453;
        vm.assume(wrongChainId != block.chainid);
        priceData.signature = _signPriceDataWithChainId(
            priceData,
            TRUSTED_SIGNER_KEY,
            wrongChainId
        );

        // Should fail because signature is for different chain
        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_CorrectChainId_Valid() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp
        );

        // Sign with current chain ID
        priceData.signature = _signPriceDataWithChainId(
            priceData,
            TRUSTED_SIGNER_KEY,
            block.chainid
        );

        // Should succeed because signature is for correct chain
        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    // ---------------------------------------------------------------------
    // Staleness validation tests
    // ---------------------------------------------------------------------
    function testValidatePrice_StalePrice_ReturnsFalse() public {
        // Create price data with timestamp older than maxPriceAge
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp - MAX_PRICE_AGE - 1
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_ExactlyMaxAge_Valid() public {
        // Create price data with timestamp exactly maxPriceAge old
        // Contract uses > not >=, so exactly maxPriceAge is still valid
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp - MAX_PRICE_AGE
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    function testValidatePrice_JustPastMaxAge_ReturnsFalse() public {
        // Create price data with timestamp just past maxPriceAge (1 second older)
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp - MAX_PRICE_AGE - 1
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testValidatePrice_JustBeforeMaxAge_Valid() public {
        // Create price data with timestamp just before maxPriceAge
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            block.timestamp - MAX_PRICE_AGE + 1
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    // ---------------------------------------------------------------------
    // Edge case tests
    // ---------------------------------------------------------------------
    function testValidatePrice_ZeroPrice_Valid() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            0,
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    function testValidatePrice_MaxPrice_Valid() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            type(uint256).max,
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    function testValidatePrice_ZeroTimestamp_ReturnsFalse() public {
        PriceData memory priceData = _createPriceData(
            TOKEN_ADDRESS,
            2000e18,
            0
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid); // Zero timestamp is stale
    }

    function testValidatePrice_ZeroAddressToken_Valid() public {
        PriceData memory priceData = _createPriceData(
            address(0),
            2000e18,
            block.timestamp
        );

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    // ---------------------------------------------------------------------
    // Fuzz tests
    // ---------------------------------------------------------------------
    function testFuzz_ValidatePrice_ValidSignature(
        address token,
        uint256 price,
        uint256 timestamp
    ) public {
        // Bound timestamp to valid range: not in the future and not stale
        timestamp = bound(
            timestamp,
            block.timestamp - MAX_PRICE_AGE + 1,
            block.timestamp
        );

        PriceData memory priceData = _createPriceData(token, price, timestamp);

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        bool isValid = pricer.validatePrice(priceData);
        assertTrue(isValid);
    }

    function testFuzz_ValidatePrice_InvalidSigner(
        address token,
        uint256 price,
        uint256 timestamp,
        uint256 randomKey
    ) public {
        // Secp256k1 curve order
        uint256 curveOrder = 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141;

        // Bound random key to valid range (1 to curveOrder-1, excluding trusted signer key)
        randomKey = bound(randomKey, 1, curveOrder - 1);
        vm.assume(randomKey != TRUSTED_SIGNER_KEY);

        // Bound timestamp to valid range so we test signature validation, not timestamp validation
        timestamp = bound(
            timestamp,
            block.timestamp - MAX_PRICE_AGE + 1,
            block.timestamp
        );

        PriceData memory priceData = _createPriceData(token, price, timestamp);

        priceData.signature = _signPriceData(priceData, randomKey);

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }

    function testFuzz_ValidatePrice_TamperedData(
        address token,
        uint256 price,
        uint256 timestamp,
        uint256 priceChange
    ) public {
        // Bound price to leave room for at least 1 change
        price = bound(price, 0, type(uint256).max - 1);

        // Bound priceChange to valid range (non-zero, no overflow)
        priceChange = bound(priceChange, 1, type(uint256).max - price);

        // Bound timestamp to valid range so we test signature validation, not timestamp validation
        timestamp = bound(
            timestamp,
            block.timestamp - MAX_PRICE_AGE + 1,
            block.timestamp
        );

        PriceData memory priceData = _createPriceData(token, price, timestamp);

        priceData.signature = _signPriceData(priceData, TRUSTED_SIGNER_KEY);

        // Tamper with price (add priceChange to ensure it's different)
        priceData.priceUsd = price + priceChange;

        bool isValid = pricer.validatePrice(priceData);
        assertFalse(isValid);
    }
}
