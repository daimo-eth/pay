// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./TokenUtils.sol"; // Provides TokenAmount struct
import "./interfaces/IDaimoPayBridger.sol";
import "./interfaces/IDepositAddressBridger.sol";

/// @author Daimo, Inc
/// @notice Simplified bridging interface for the Deposit Address system
///         that multiplexes between multiple bridge-specific adapters (e.g.
///         CCTP, Across, Axelar).
contract DepositAddressBridger is IDepositAddressBridger {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Immutable routing data (set once in the constructor)
    // ---------------------------------------------------------------------

    /// Is a given bridging route (destination chainId, stableOut, bridger adapter)
    /// allowed?
    mapping(uint256 toChainId => mapping(address stableOut => mapping(address bridgerAdapter => bool isAllowed)))
        public isRouteAllowed;

    /// Set the allowed bridging routes.
    constructor(
        uint256[] memory toChainIds,
        address[] memory stableOut,
        address[] memory bridgerAdapters
    ) {
        uint256 n = toChainIds.length;
        require(
            n == stableOut.length && n == bridgerAdapters.length,
            "DAB: length mismatch"
        );
        for (uint256 i; i < n; ++i) {
            isRouteAllowed[toChainIds[i]][stableOut[i]][
                bridgerAdapters[i]
            ] = true;
        }
    }

    // ---------------------------------------------------------------------
    // Mutating state
    // ---------------------------------------------------------------------

    /// @inheritdoc IDepositAddressBridger
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount calldata stableOut,
        address bridgerAdapter,
        address refundAddress,
        bytes calldata extraData
    ) external {
        require(
            isRouteAllowed[toChainId][address(stableOut.token)][bridgerAdapter],
            "DAB: route not allowed"
        );

        // Determine the required input asset and quantity for the requested bridge.
        TokenAmount[] memory opts = _getSingleBridgeTokenOutOption(stableOut);
        (address bridgeTokenIn, uint256 inAmount) = IDaimoPayBridger(
            bridgerAdapter
        ).getBridgeTokenIn({toChainId: toChainId, bridgeTokenOutOptions: opts});

        // Pull tokens from caller into this contract.
        IERC20(bridgeTokenIn).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: inAmount
        });

        // Approve the bridger adapter to spend and forward the call.
        IERC20(bridgeTokenIn).forceApprove({
            spender: bridgerAdapter,
            value: inAmount
        });

        IDaimoPayBridger(bridgerAdapter).sendToChain({
            toChainId: toChainId,
            toAddress: toAddress,
            bridgeTokenOutOptions: opts,
            refundAddress: refundAddress,
            extraData: extraData
        });
    }

    // ---------------------------------------------------------------------
    // View helpers
    // ---------------------------------------------------------------------

    /// @inheritdoc IDepositAddressBridger
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount calldata stableOut,
        address bridgerAdapter
    ) public view returns (address bridgeTokenIn, uint256 inAmount) {
        require(
            isRouteAllowed[toChainId][address(stableOut.token)][bridgerAdapter],
            "DAB: route not allowed"
        );

        TokenAmount[] memory opts = _getSingleBridgeTokenOutOption(stableOut);
        (bridgeTokenIn, inAmount) = IDaimoPayBridger(bridgerAdapter)
            .getBridgeTokenIn({
                toChainId: toChainId,
                bridgeTokenOutOptions: opts
            });
    }

    function _getSingleBridgeTokenOutOption(
        TokenAmount calldata stableOut
    ) private view returns (TokenAmount[] memory opts) {
        opts = new TokenAmount[](1);
        opts[0] = stableOut;
    }
}
