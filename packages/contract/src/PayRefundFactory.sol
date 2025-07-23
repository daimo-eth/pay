// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/utils/Create2.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";

import "./PayRefund.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Factory for refund mini accounts owned by a single-chain signer.
contract PayRefundFactory {
    PayRefund public immutable refundImpl;

    constructor() {
        refundImpl = new PayRefund();
    }

    /// Deploy a proxy for the refund implementation to the CREATE2
    /// address for the given params.
    function createRefund(
        address owner,
        uint256 ownerChainId,
        address safeAddress
    ) public returns (PayRefund ret) {
        bytes32 salt = keccak256(abi.encode(owner, ownerChainId, safeAddress));
        address refundAddr = getRefundAddress(owner, ownerChainId, safeAddress);
        if (refundAddr.code.length > 0) {
            return PayRefund(payable(refundAddr));
        }
        ret = PayRefund(
            payable(
                address(
                    new ERC1967Proxy{salt: salt}(
                        address(refundImpl),
                        abi.encodeCall(
                            PayRefund.initialize,
                            (owner, ownerChainId, safeAddress)
                        )
                    )
                )
            )
        );
    }

    /// Compute the deterministic CREATE2 address of the refund contract for
    /// the given params.
    function getRefundAddress(
        address owner,
        uint256 ownerChainId,
        address safeAddress
    ) public view returns (address) {
        bytes32 salt = keccak256(abi.encode(owner, ownerChainId, safeAddress));
        return
            Create2.computeAddress(
                salt,
                keccak256(
                    abi.encodePacked(
                        type(ERC1967Proxy).creationCode,
                        abi.encode(
                            address(refundImpl),
                            abi.encodeCall(
                                PayRefund.initialize,
                                (owner, ownerChainId, safeAddress)
                            )
                        )
                    )
                )
            );
    }
}
