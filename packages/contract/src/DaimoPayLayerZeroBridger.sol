// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";
import {IOFT, SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Bridges assets to a destination chain using the LayerZero protocol.
/// @dev Assumes the local token is ERC20 and maintains a 1:1 value with the
/// destination token. Strict output is enforced via `minAmountLD`.
abstract contract DaimoPayLayerZeroBridger is IDaimoPayBridger {
    using SafeERC20 for IERC20;

    /// @notice Per-destination configuration for bridging.
    struct LZBridgeRoute {
        /// @notice LayerZero endpoint ID for the destination chain.
        uint32 dstEid;
        /// @notice OFT/OFTAdapter/Stargate token contract on the source chain.
        address app;
        /// @notice Token address expected on the destination chain.
        address bridgeTokenOut;
        /// @notice Token this contract must custody before calling `app`.
        address bridgeTokenIn;
    }

    /// @notice Mapping of EVM chain ID to its bridge route configuration.
    mapping(uint256 => LZBridgeRoute) public bridgeRouteMapping;

    /// @notice Initializes bridge routes for destination chains.
    /// @param _toChainIds Destination EVM chain IDs.
    /// @param _routes Route configurations corresponding to `_toChainIds`.
    constructor(uint256[] memory _toChainIds, LZBridgeRoute[] memory _routes) {
        uint256 n = _toChainIds.length;
        require(n == _routes.length, "wrong routes length");
        for (uint256 i = 0; i < n; ++i) {
            bridgeRouteMapping[_toChainIds[i]] = _routes[i];
        }
    }

    receive() external payable {}

    // External functions

    /// @inheritdoc IDaimoPayBridger
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount) {
        (LZBridgeRoute memory r, uint256 outAmount) = _getBridgeData(
            toChainId,
            bridgeTokenOutOptions
        );
        return (r.bridgeTokenIn, outAmount);
    }

    /// @inheritdoc IDaimoPayBridger
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        address refundAddress,
        bytes calldata extraData
    ) public {
        require(toChainId != block.chainid, "same chain");

        (LZBridgeRoute memory r, uint256 outAmount) = _getBridgeData(
            toChainId,
            bridgeTokenOutOptions
        );

        (SendParam memory sp, bool payInZRO) = _buildParams(
            toChainId,
            toAddress,
            r,
            outAmount,
            extraData
        );

        sp.minAmountLD = _computeMinAmountLD(
            toChainId,
            r,
            outAmount,
            extraData,
            sp
        );

        MessagingFee memory fee = _quoteSend(r, sp, payInZRO);
        if (!payInZRO) {
            require(
                address(this).balance >= fee.nativeFee,
                "insufficient native fee"
            );
        }

        IERC20(r.bridgeTokenIn).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: outAmount
        });

        _prepareCustodyAndApprove(r, outAmount);

        _dispatchSend(r, sp, fee, refundAddress);

        emit BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: r.bridgeTokenIn,
            fromAmount: outAmount,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: r.bridgeTokenOut,
            toAmount: outAmount,
            refundAddress: refundAddress
        });

        if (!payInZRO && address(this).balance > 0) {
            unchecked {
                (bool s, ) = refundAddress.call{value: address(this).balance}(
                    ""
                );
                // best-effort refund; ignore failure
                s;
            }
        }
    }

    /// @notice Prepares token custody and approvals prior to sending.
    /// @dev Default behavior approves `app` to pull `bridgeTokenIn`. OFT may no-op; Adapters/Stargate require approval.
    /// @param r The resolved bridge route.
    /// @param amountLD Amount to approve in local decimals.
    function _prepareCustodyAndApprove(
        LZBridgeRoute memory r,
        uint256 amountLD
    ) internal virtual {
        IERC20(r.bridgeTokenIn).forceApprove({spender: r.app, value: amountLD});
    }

    /// @notice Builds the OFT `SendParam` and selects the fee payment mode.
    /// @dev Subclasses may parse `extraData` to populate options or compose payloads.
    /// @param toAddress Destination recipient address.
    /// @param r The resolved bridge route.
    /// @param amountLD Amount to bridge in local decimals.
    /// @return sp The constructed send parameters.
    /// @return payInZRO If true, pay message fees in ZRO.
    function _buildParams(
        uint256 /*toChainId*/,
        address toAddress,
        LZBridgeRoute memory r,
        uint256 amountLD,
        bytes calldata /*extraData*/
    ) internal virtual returns (SendParam memory sp, bool payInZRO) {
        sp = SendParam({
            dstEid: r.dstEid,
            to: _toB32(toAddress),
            amountLD: amountLD,
            minAmountLD: amountLD,
            extraOptions: bytes(""),
            composeMsg: bytes(""),
            oftCmd: bytes("")
        });
        payInZRO = false;
    }

    /// @notice Dispatches the send using the route application.
    /// @dev Default implementation calls `OFT.send`; subclasses may override for Stargate or adapters.
    /// @param r The resolved bridge route.
    /// @param sp The send parameters.
    /// @param fee The messaging fees to pay.
    /// @param refundAddress Address to receive any unused native fee refund.
    function _dispatchSend(
        LZBridgeRoute memory r,
        SendParam memory sp,
        MessagingFee memory fee,
        address refundAddress
    ) internal virtual {
        IOFT(r.app).send{value: fee.nativeFee}(sp, fee, refundAddress);
    }

    /// @notice Computes the minimum acceptable destination amount.
    /// @dev Default implementation enforces an exact output guarantee.
    /// @param desiredOutLD Desired destination amount in local decimals.
    /// @return The minimum acceptable destination amount.
    function _computeMinAmountLD(
        uint256 /*toChainId*/,
        LZBridgeRoute memory /*r*/,
        uint256 desiredOutLD,
        bytes calldata /*extraData*/,
        SendParam memory /*sp*/
    ) internal view virtual returns (uint256) {
        return desiredOutLD;
    }

    /// @notice Quotes message fees for the given send parameters.
    /// @dev Default implementation calls `OFT.quoteSend` on the route app.
    /// @param r The resolved bridge route.
    /// @param sp The send parameters to quote.
    /// @param payInZRO If true, quote fees in ZRO.
    /// @return fee The quoted messaging fees.
    function _quoteSend(
        LZBridgeRoute memory r,
        SendParam memory sp,
        bool payInZRO
    ) internal view virtual returns (MessagingFee memory fee) {
        return IOFT(r.app).quoteSend(sp, payInZRO);
    }

    /// @notice Resolves the bridge route and output amount for a destination chain.
    /// @param toChainId Destination EVM chain ID.
    /// @param bridgeTokenOutOptions Candidate destination token/amount options.
    /// @return route The resolved route configuration.
    /// @return outAmount The selected output amount for the destination token.
    function _getBridgeData(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) internal view returns (LZBridgeRoute memory route, uint256 outAmount) {
        route = bridgeRouteMapping[toChainId];
        require(route.bridgeTokenOut != address(0), "route not found");

        uint256 idx = _findBridgeTokenOut(
            bridgeTokenOutOptions,
            route.bridgeTokenOut
        );
        require(idx < bridgeTokenOutOptions.length, "bad bridge token");

        outAmount = bridgeTokenOutOptions[idx].amount;
        require(outAmount > 0, "zero amount");
    }

    /// @notice Finds the index of the desired destination token in the options.
    /// @param opts Candidate token/amount pairs.
    /// @param bridgeTokenOut Destination token address to match.
    /// @return idx Index in `opts` if found; `opts.length` if not found.
    function _findBridgeTokenOut(
        TokenAmount[] calldata opts,
        address bridgeTokenOut
    ) internal pure returns (uint256 idx) {
        uint256 n = opts.length;
        for (uint256 i = 0; i < n; ++i) {
            if (address(opts[i].token) == bridgeTokenOut) return i;
        }
        return n;
    }

    /// @notice Converts an address to a left-padded bytes32.
    function _toB32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }
}
