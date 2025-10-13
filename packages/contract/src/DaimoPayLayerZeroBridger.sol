// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";
import {IOFT, SendParam, MessagingFee} from "@layerzerolabs/oft-evm/contracts/interfaces/IOFT.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Base contract for bridging via LayerZero OFT v2 with pluggable
/// accounting and options.
/// @dev Subclasses implement `_computeAccounting` to define how much to pull,
/// what to send, guarantees, and any LZ options.
abstract contract DaimoPayLayerZeroBridger is IDaimoPayBridger {
    using SafeERC20 for IERC20;

    struct LZBridgeRoute {
        /// @notice LayerZero endpoint ID for the destination chain.
        uint32 dstEid;
        /// @notice OFT/OFTAdapter/Stargate application on the source chain.
        address app;
        /// @notice Expected token address on the destination chain.
        address bridgeTokenOut;
        /// @notice Token address custodied on the source chain.
        address bridgeTokenIn;
    }

    /// @notice Accounting policy returned by subclasses to parameterize a send.
    /// @dev Decides how much to pull, what to send, receive guarantees, and LZ options.
    struct Accounting {
        /// @notice Amount pulled from the caller and approved to `app` (local decimals).
        uint256 inAmountLD;
        /// @notice Amount sent via OFT (SendParam.amountLD).
        uint256 sendAmountLD;
        /// @notice Minimum amount guaranteed to arrive (SendParam.minAmountLD).
        uint256 minAmountLD;
        /// @notice LayerZero v2 options (SendParam.extraOptions).
        bytes extraOptions;
        /// @notice Optional compose message for OFT.
        bytes composeMsg;
        /// @notice Optional OFT command bytes.
        bytes oftCmd;
        /// @notice If true, fees are quoted/paid in ZRO; otherwise in native.
        bool payInZRO;
    }

    /// @notice Mapping of destination EVM chain ID to configured LayerZero route.
    mapping(uint256 => LZBridgeRoute) public bridgeRouteMapping;

    /// @param _toChainIds Destination EVM chain IDs.
    /// @param _routes Route definitions aligned 1:1 with `_toChainIds`.
    constructor(uint256[] memory _toChainIds, LZBridgeRoute[] memory _routes) {
        uint256 n = _toChainIds.length;
        require(n == _routes.length, "wrong routes length");
        for (uint256 i = 0; i < n; ++i)
            bridgeRouteMapping[_toChainIds[i]] = _routes[i];
    }

    /// @notice Accept native tokens for paying LayerZero fees and refunds.
    receive() external payable {}

    // External interface

    /// @notice Returns the input token and amount required for a desired
    /// bridged amount on the destination chain.
    /// @param toChainId Destination EVM chain ID.
    /// @param bridgeTokenOutOptions Candidate destination token/amount options.
    /// One option must match the configured `bridgeTokenOut` for `toChainId`.
    /// @return bridgeTokenIn The source token address to transfer in.
    /// @return inAmount The amount of `bridgeTokenIn` to transfer from caller.
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount) {
        (LZBridgeRoute memory r, uint256 desiredOutLD) = _resolveRouteAndOut(
            toChainId,
            bridgeTokenOutOptions
        );
        Accounting memory a = _computeAccounting({
            toChainId: toChainId,
            toAddress: address(0), // not needed for quoting input
            r: r,
            desiredOutLD: desiredOutLD,
            extraData: bytes("")
        });
        return (r.bridgeTokenIn, a.inAmountLD);
    }

    /// @notice Sends tokens to another chain via LayerZero OFT.
    /// @dev Pulls the required input from the caller, approves the OFT app,
    /// quotes fees, and performs the send. If paying fees in native, any
    /// leftover native balance is refunded to `refundAddress`.
    /// @param toChainId Destination EVM chain ID (must differ from source).
    /// @param toAddress Recipient address on the destination chain.
    /// @param bridgeTokenOutOptions Candidate destination token/amount options;
    /// one must match the configured route token for `toChainId`.
    /// @param refundAddress Address to receive any leftover native fee refunds.
    /// @param extraData Opaque data forwarded to the subclass accounting logic.
    /// @custom:reverts same chain if `toChainId == block.chainid`.
    /// @custom:reverts route not found or bad bridge token if options mismatch.
    /// @custom:reverts insufficient native fee if paying in native without coverage.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        address refundAddress,
        bytes calldata extraData
    ) public {
        require(toChainId != block.chainid, "same chain");
        (LZBridgeRoute memory r, uint256 desiredOutLD) = _resolveRouteAndOut(
            toChainId,
            bridgeTokenOutOptions
        );

        Accounting memory a = _computeAccounting({
            toChainId: toChainId,
            toAddress: toAddress,
            r: r,
            desiredOutLD: desiredOutLD,
            extraData: extraData
        });

        // Build OFT params from the accounting policy.
        SendParam memory sp = SendParam({
            dstEid: r.dstEid,
            to: _toB32(toAddress),
            amountLD: a.sendAmountLD,
            minAmountLD: a.minAmountLD,
            extraOptions: a.extraOptions,
            composeMsg: a.composeMsg,
            oftCmd: a.oftCmd
        });

        // Quote LZ fee & ensure native coverage if paying in native.
        MessagingFee memory fee = IOFT(r.app).quoteSend(sp, a.payInZRO); // standard OFT v2 path
        if (!a.payInZRO)
            require(
                address(this).balance >= fee.nativeFee,
                "insufficient native fee"
            );

        // Custody + approve exactly what the accounting says.
        IERC20(r.bridgeTokenIn).safeTransferFrom(
            msg.sender,
            address(this),
            a.inAmountLD
        );
        IERC20(r.bridgeTokenIn).forceApprove(r.app, a.inAmountLD);

        IOFT(r.app).send{value: fee.nativeFee}(sp, fee, refundAddress);

        emit BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: r.bridgeTokenIn,
            fromAmount: a.inAmountLD,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: r.bridgeTokenOut,
            toAmount: desiredOutLD,
            refundAddress: refundAddress
        });

        if (!a.payInZRO && address(this).balance > 0) {
            // best-effort native refund
            (bool success, ) = refundAddress.call{value: address(this).balance}(
                ""
            );
            require(success, "LayerZeroBridger: native refund failed");
        }
    }

    // Hooks for subclasses

    /// @notice Core policy hook implemented by subclasses.
    /// @dev Computes `Accounting` given the desired destination amount and context.
    /// Default behavior is 1:1: pull/send/guarantee `desiredOutLD` with no options
    /// and pay fees in native.
    /// @param toChainId Destination EVM chain ID.
    /// @param toAddress Recipient address on the destination chain.
    /// @param r Resolved LayerZero route for the destination.
    /// @param desiredOutLD Desired receive amount on the destination (local decimals).
    /// @param extraData Opaque data for subclass-specific policy.
    /// @return a The computed accounting policy for the send.
    function _computeAccounting(
        uint256 toChainId,
        address toAddress,
        LZBridgeRoute memory r,
        uint256 desiredOutLD,
        bytes memory extraData
    ) internal view virtual returns (Accounting memory a) {
        // Reference arguments to avoid compiler warnings
        toChainId;
        toAddress;
        r;
        desiredOutLD;
        extraData;
        // Default = 1:1 OFT: pull desiredOut, send desiredOut, guarantee desiredOut
        a.inAmountLD = desiredOutLD;
        a.sendAmountLD = desiredOutLD;
        a.minAmountLD = desiredOutLD;
        a.extraOptions = bytes(""); // caller can pass via extraData in a subclass if desired
        a.composeMsg = bytes("");
        a.oftCmd = bytes("");
        a.payInZRO = false;
    }

    // Internal helpers

    /// @notice Resolves the route for `toChainId` and extracts the desired
    /// destination amount from the provided options.
    /// @param toChainId Destination EVM chain ID.
    /// @param bridgeTokenOutOptions Candidate destination token/amount options.
    /// @return route The configured route for `toChainId`.
    /// @return outAmount Desired destination amount (local decimals).
    function _resolveRouteAndOut(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) internal view returns (LZBridgeRoute memory route, uint256 outAmount) {
        route = bridgeRouteMapping[toChainId];
        require(route.bridgeTokenOut != address(0), "route not found");
        uint256 n = bridgeTokenOutOptions.length;
        uint256 idx = n;
        for (uint256 i = 0; i < n; ++i)
            if (
                address(bridgeTokenOutOptions[i].token) == route.bridgeTokenOut
            ) {
                idx = i;
                break;
            }
        require(idx < n, "bad bridge token");
        outAmount = bridgeTokenOutOptions[idx].amount;
        require(outAmount > 0, "zero amount");
    }

    /// @dev Casts an EVM address to 32-byte representation used by OFT.
    function _toB32(address a) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(a)));
    }
}
