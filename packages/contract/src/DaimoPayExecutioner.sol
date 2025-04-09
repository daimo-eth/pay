// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

import "./TokenUtils.sol";

/// Represents a contract call.
struct Call {
    /// Address of the contract to call.
    address to;
    /// Native token amount for call, or 0
    uint256 value;
    /// Calldata for call
    bytes data;
}

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice This contract is used to execute arbitrary contract calls on behalf
/// of the DaimoPay escrow contract.
contract DaimoPayExecutioner is Initializable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// The only address that is allowed to call the `execute` function.
    address payable public escrow;

    constructor() {}

    function initialize(address payable _escrow) public initializer {
        escrow = _escrow;
    }

    /// Execute arbitrary calls. Revert if any fail.
    /// Check that at least one of the expectedOutput tokens is present.
    /// Transfer the full balance of each expectedOutput token to the escrow.
    function execute(
        Call[] calldata calls,
        TokenAmount[] calldata expectedOutput,
        address payable recipient
    ) external nonReentrant {
        require(msg.sender == escrow, "DPCE: only escrow");

        uint256 callsLength = calls.length;
        for (uint256 i = 0; i < callsLength; ++i) {
            Call calldata call = calls[i];
            (bool success, ) = call.to.call{value: call.value}(call.data);
            require(success, "DPCE: call failed");
        }

        /// Check that at least one of the expectedOutput tokens is present
        /// with enough balance.
        bool outputOk = TokenUtils.checkBalance({tokenAmounts: expectedOutput});
        require(outputOk, "DPCE: insufficient output");

        uint256 expectedOutputLength = expectedOutput.length;
        for (uint256 i = 0; i < expectedOutputLength; ++i) {
            TokenUtils.transferBalance({
                token: expectedOutput[i].token,
                recipient: recipient
            });
        }
    }

    /// Execute a final call. Approve the final token and make the call.
    /// Return whether the call succeeded.
    function executeFinalCall(
        Call calldata finalCall,
        TokenAmount calldata finalCallToken
    ) external nonReentrant returns (bool success) {
        require(msg.sender == escrow, "DPCE: only escrow");

        TokenUtils.approve({
            token: finalCallToken.token,
            spender: address(finalCall.to),
            amount: finalCallToken.amount
        });

        (success, ) = finalCall.to.call{value: finalCall.value}(finalCall.data);
    }

    /// Accept native-token (eg ETH) inputs
    receive() external payable {}
}
