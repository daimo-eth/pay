// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./PayIntent.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Factory for intent addresses.
contract PayIntentFactory {
    PayIntentContract public immutable intentImpl;

    constructor() {
        intentImpl = new PayIntentContract();
    }

    /// Deploy a proxy for the intent contract implementation to the CREATE2
    /// address for the given intent.
    function createIntent(
        PayIntent calldata intent
    ) public returns (PayIntentContract ret) {
        address intentAddr = getIntentAddress(intent);
        if (intentAddr.code.length > 0) {
            // Handling this case allows eg. start+claim in a single tx.
            // This allows more efficient relaying & easier unit testing.
            // See https://github.com/foundry-rs/foundry/issues/8485
            return PayIntentContract(payable(intentAddr));
        }
        ret = PayIntentContract(
            payable(
                address(
                    new ERC1967Proxy{salt: bytes32(0)}(
                        address(intentImpl),
                        abi.encodeCall(
                            PayIntentContract.initialize,
                            (calcIntentHash(intent))
                        )
                    )
                )
            )
        );
    }

    /// Compute the deterministic CREATE2 address of the intent contract for
    /// the given intent.
    function getIntentAddress(
        PayIntent calldata intent
    ) public view returns (address) {
        return
            Create2.computeAddress(
                0,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(intentImpl),
                            abi.encodeCall(
                                PayIntentContract.initialize,
                                (calcIntentHash(intent))
                            )
                        )
                    )
                )
            );
    }
}
