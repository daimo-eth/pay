// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./AccountVault.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Factory contract that creates deterministic Account Vault
///         contracts using CREATE2 deployment for predictable addresses.
/// @dev Deploys Account Vault contracts at addresses determined by the
///      AccountVaultParams, enabling desterministic account vault addresses
///      across chains.
contract AccountVaultFactory {
    /// Singleton implementation that all minimal proxies delegate to.
    AccountVault public immutable accountVaultImpl;

    event AccountVaultDeployed(
        address indexed accountVault,
        AccountVaultParams params
    );

    constructor() {
        accountVaultImpl = new AccountVault();
    }

    /// @dev Deploy the Account Vault for the given AccountVaultParams
    ///      (or return existing one).
    function createAccountVault(
        AccountVaultParams calldata params
    ) public returns (AccountVault ret) {
        address accountVault = getAccountVault(params);
        if (accountVault.code.length > 0) {
            // Already deployed, another CREATE2 would revert,
            // so not deploying and just returning the existing one.
            return AccountVault(payable(accountVault));
        }
        ret = AccountVault(
            payable(
                address(
                    new ERC1967Proxy{salt: bytes32(0)}(
                        address(accountVaultImpl),
                        abi.encodeCall(
                            AccountVault.initialize,
                            calcAccountVaultParamsHash(params)
                        )
                    )
                )
            )
        );
        emit AccountVaultDeployed(accountVault, params);
    }

    /// @notice Pure view helper: compute CREATE2 address for a
    ///         AccountVaultParams.
    function getAccountVault(
        AccountVaultParams calldata params
    ) public view returns (address) {
        return
            Create2.computeAddress(
                0,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(accountVaultImpl),
                            abi.encodeCall(
                                AccountVault.initialize,
                                calcAccountVaultParamsHash(params)
                            )
                        )
                    )
                )
            );
    }
}
