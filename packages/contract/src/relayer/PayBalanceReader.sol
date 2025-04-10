// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

/// Factory to deploy PayBalanceReader contracts at deterministic addresses.
contract PayBalanceFactory {
    bytes32 private constant SALT = bytes32(0);

    /// Emitted when a new PayBalanceReader is deployed
    event Deploy(address indexed reader, uint256 nTokens);

    /// Predicts the address where a PayBalanceReader will be deployed.
    function getBalanceReader(
        IERC20[] memory _tokens
    ) public view returns (address addr, uint256 codeSize) {
        bytes memory bytecode = _getCreationBytecode(_tokens);
        addr = Create2.computeAddress(SALT, keccak256(bytecode));
        codeSize = addr.code.length;
    }

    /// Deploys a PayBalanceReader deterministically, using CREATE2.
    function deployBalanceReader(
        IERC20[] memory _tokens
    ) public returns (address) {
        bytes memory bytecode = _getCreationBytecode(_tokens);
        address reader = Create2.deploy(0, SALT, bytecode);
        emit Deploy(reader, _tokens.length);
        return reader;
    }

    function _getCreationBytecode(
        IERC20[] memory _tokens
    ) private pure returns (bytes memory) {
        require(_tokens.length > 0, "No tokens provided");
        bytes memory creationBytecode = type(PayBalanceReader).creationCode;
        return abi.encodePacked(creationBytecode, abi.encode(_tokens));
    }
}

/// Efficiently fetches token balances.
contract PayBalanceReader {
    IERC20[] public tokens;

    constructor(IERC20[] memory _tokens) {
        tokens = new IERC20[](_tokens.length);
        for (uint256 i = 0; i < _tokens.length; ++i) {
            tokens[i] = _tokens[i];
        }
    }

    /// List of ERC-20 tokens. We fetch balances for these and the native asset.
    function getAllTokens() public view returns (IERC20[] memory) {
        return tokens;
    }

    /// Get the balances for all saved tokens and the balance of the native
    /// asset (the last array element) for a given owner.
    function getTokenBalances(
        address owner
    ) public view returns (uint256[] memory balances) {
        uint256 n = tokens.length;

        balances = new uint256[](n + 1);
        for (uint256 i = 0; i < n; ++i) {
            balances[i] = tokens[i].balanceOf(owner);
        }

        balances[n] = owner.balance;
    }
}
