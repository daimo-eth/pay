// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./DepositAddress.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Factory contract that creates deterministic Deposit Address
///         contracts using CREATE2 deployment for predictable addresses.
/// @dev Deploys Deposit Address contracts at addresses determined by the
///      DAParams, enabling desterministic deposit addresses across chains.
contract DepositAddressFactory {
    /// Singleton implementation that all minimal proxies delegate to.
    DepositAddress public immutable depositAddressImpl;

    event DepositAddressDeployed(
        address indexed depositAddress,
        DAParams params
    );

    constructor() {
        depositAddressImpl = new DepositAddress();
    }

    /// @dev Deploy the Deposit Address for the given DAParams
    ///      (or return existing one).
    function createDepositAddress(
        DAParams calldata params
    ) public returns (DepositAddress ret) {
        address depositAddress = getDepositAddress(params);
        if (depositAddress.code.length > 0) {
            // Already deployed, another CREATE2 would revert,
            // so not deploying and just returning the existing one.
            return DepositAddress(payable(depositAddress));
        }
        ret = DepositAddress(
            payable(
                address(
                    new ERC1967Proxy{salt: bytes32(0)}(
                        address(depositAddressImpl),
                        abi.encodeCall(
                            DepositAddress.initialize,
                            calcDAParamsHash(params)
                        )
                    )
                )
            )
        );
        emit DepositAddressDeployed(depositAddress, params);
    }

    /// @notice Pure view helper: compute CREATE2 address for a
    ///         DAParams.
    function getDepositAddress(
        DAParams calldata params
    ) public view returns (address) {
        return
            Create2.computeAddress(
                0,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(depositAddressImpl),
                            abi.encodeCall(
                                DepositAddress.initialize,
                                calcDAParamsHash(params)
                            )
                        )
                    )
                )
            );
    }
}
