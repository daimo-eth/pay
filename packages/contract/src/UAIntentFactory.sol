// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./UAIntent.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Factory for deterministic UAIntent vault deployments.
contract UAIntentFactory {
    /// Singleton implementation that all minimal proxies delegate to.
    UAIntentContract public immutable intentImpl;

    constructor() {
        intentImpl = new UAIntentContract();
    }

    /// @dev Deploy proxy for the given intent (or return existing one).
    function createIntent(
        UAIntent calldata intent,
        address escrow
    ) public returns (UAIntentContract ret) {
        address intentAddr = getIntentAddress(intent, escrow);
        if (intentAddr.code.length > 0) {
            // Already deployed – reuse to save gas.
            return UAIntentContract(payable(intentAddr));
        }
        ret = UAIntentContract(
            payable(
                address(
                    new ERC1967Proxy{salt: bytes32(0)}(
                        address(intentImpl),
                        abi.encodeCall(
                            UAIntentContract.initialize,
                            (calcIntentHash(intent), escrow)
                        )
                    )
                )
            )
        );
    }

    /// @notice Pure view helper: compute CREATE2 address for an intent.
    function getIntentAddress(
        UAIntent calldata intent,
        address escrow
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
                                UAIntentContract.initialize,
                                (calcIntentHash(intent), escrow)
                            )
                        )
                    )
                )
            );
    }
}
