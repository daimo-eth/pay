// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "forge-std/Test.sol";
import {PayBalanceFactory, PayBalanceReader} from "../src/relayer/PayBalanceReader.sol";
import {ERC20} from "openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";

// Simple ERC20 for testing
contract TestToken is ERC20 {
    constructor(string memory name) ERC20(name, name) {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract PayBalanceReaderTest is Test {
    address constant ALICE =
        address(0xaAaAaAaaAaAaAaaAaAAAAAAAAaaaAaAaAaaAaaAa);
    uint256 constant AMOUNT1 = 100 * 10 ** 18;
    uint256 constant AMOUNT2 = 250 * 10 ** 18;

    function testBalanceReader() public {
        console.log("Starting PayBalanceReader test");

        // Setup - deploy factory and tokens
        PayBalanceFactory factory = new PayBalanceFactory();
        TestToken token1 = new TestToken("Token1");
        TestToken token2 = new TestToken("Token2");

        // Mint tokens to ALICE
        token1.mint(ALICE, AMOUNT1);
        token2.mint(ALICE, AMOUNT2);

        // Log addresses for debugging
        console.log("Token1 address:", address(token1));
        console.log("Token2 address:", address(token2));

        // Create token array
        IERC20[] memory tokens = new IERC20[](2);
        tokens[0] = IERC20(address(token1));
        tokens[1] = IERC20(address(token2));

        // Step 1: Get predicted address
        (address readerAddr, uint256 codeSize) = factory.getBalanceReader(
            tokens
        );
        assertEq(codeSize, 0, "Code size should be 0 before deployment");
        console.log("Predicted reader address:", readerAddr);

        // Step 2: Deploy reader
        vm.recordLogs();
        address deployedAddr = factory.deployBalanceReader(tokens);
        console.log("Deployed to:", deployedAddr);

        // Step 3: Check codesize
        uint256 newCodeSize = deployedAddr.code.length;
        assertGt(newCodeSize, 0, "Code size should be > 0 after deployment");
        console.log("Code size after deployment:", newCodeSize);

        // Step 4: Get all tokens and verify
        PayBalanceReader reader = PayBalanceReader(deployedAddr);
        IERC20[] memory allTokens = reader.getAllTokens();
        assertEq(allTokens.length, 2, "Wrong token count");
        assertEq(address(allTokens[0]), address(token1), "Addr 0 mismatch");
        assertEq(address(allTokens[1]), address(token2), "Addr 1 mismatch");

        // Step 5: Get token balances
        uint256[] memory balances = reader.getTokenBalances(ALICE);
        assertEq(balances.length, 3, "Should have 2 tokens + ETH");
        assertEq(balances[0], AMOUNT1, "Token1 balance incorrect");
        assertEq(balances[1], AMOUNT2, "Token2 balance incorrect");
        assertEq(balances[2], 0, "ETH balance should be 0");
    }
}
