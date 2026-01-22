// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";
import {
    IOFT,
    SendParam,
    MessagingFee
} from "@layerzerolabs/lz-evm-oapp-v2/contracts/oft/interfaces/IOFT.sol";

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
        /// @notice Token address custodied on the source chain.
        address bridgeTokenIn;
        /// @notice Expected token address on the destination chain.
        address bridgeTokenOut;
        /// @notice Decimals of the bridgeTokenOut. Used to convert the output
        /// amount decimals to the bridgeTokenIn decimals.
        uint256 bridgeTokenOutDecimals;
    }

    /// @notice Accounting policy returned by subclasses to parameterize accounting send.
    /// @dev Decides how much to pull, what to send, receive guarantees, and LZ options.
    struct Accounting {
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
    }

    /// @notice Mapping of destination EVM chain ID to configured LayerZero route.
    mapping(uint256 toChainId => LZBridgeRoute bridgeRoute)
        public bridgeRouteMapping;

    /// @param _toChainIds Destination EVM chain IDs.
    /// @param _routes Route definitions aligned 1:1 with `_toChainIds`.
    constructor(uint256[] memory _toChainIds, LZBridgeRoute[] memory _routes) {
        uint256 n = _toChainIds.length;
        require(n == _routes.length, "DPLZB: wrong routes length");
        for (uint256 i = 0; i < n; ++i)
            bridgeRouteMapping[_toChainIds[i]] = _routes[i];
    }

    /// @notice Accept native tokens for paying LayerZero fees and refunds.
    receive() external payable {}

    // External interface

    /// @notice Returns the input token and amount required for accounting desired
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
        (
            LZBridgeRoute memory route,
            uint256 desiredOutLD
        ) = _resolveRouteAndOut(toChainId, bridgeTokenOutOptions);
        Accounting memory accounting = _computeAccounting({
            toChainId: toChainId,
            toAddress: address(0), // not needed for quoting input
            route: route,
            desiredOutLD: desiredOutLD,
            extraData: bytes("")
        });
        return (route.bridgeTokenIn, accounting.sendAmountLD);
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
    ) public virtual {
        require(toChainId != block.chainid, "DPLZB: same chain");
        (
            LZBridgeRoute memory route,
            uint256 desiredOutLD
        ) = _resolveRouteAndOut(toChainId, bridgeTokenOutOptions);

        Accounting memory accounting = _computeAccounting({
            toChainId: toChainId,
            toAddress: toAddress,
            route: route,
            desiredOutLD: desiredOutLD,
            extraData: extraData
        });

        // Build OFT params from the accounting policy.
        SendParam memory sp = SendParam({
            dstEid: route.dstEid,
            to: _toB32(toAddress),
            amountLD: accounting.sendAmountLD,
            minAmountLD: accounting.minAmountLD,
            extraOptions: accounting.extraOptions,
            composeMsg: accounting.composeMsg,
            oftCmd: accounting.oftCmd
        });

        // always pay fees in native (no ZRO)
        MessagingFee memory fee = IOFT(route.app).quoteSend({
            _sendParam: sp,
            _payInLzToken: false
        });
        require(
            address(this).balance >= fee.nativeFee,
            "DPLZB: insufficient native fee"
        );

        // Custody + approve exactly what the accounting says.
        IERC20(route.bridgeTokenIn).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: accounting.sendAmountLD
        });
        IERC20(route.bridgeTokenIn).forceApprove({
            spender: route.app,
            value: accounting.sendAmountLD
        });

        IOFT(route.app).send{value: fee.nativeFee}({
            _sendParam: sp,
            _fee: fee,
            _refundAddress: refundAddress
        });

        if (address(this).balance > 0) {
            // native coin refund
            (bool success, ) = tx.origin.call{value: address(this).balance}("");
            require(success, "DPLZB: native refund failed");
        }

        emit BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: route.bridgeTokenIn,
            fromAmount: accounting.sendAmountLD,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: route.bridgeTokenOut,
            toAmount: desiredOutLD,
            refundAddress: refundAddress
        });
    }

    // Hooks for subclasses

    /// @notice Core policy hook implemented by subclasses.
    /// @dev Computes `Accounting` given the desired destination amount and context.
    /// Default behavior is 1:1: pull/send/guarantee `desiredOutLD` with no options
    /// and pay fees in native.
    /// @param toChainId Destination EVM chain ID.
    /// @param toAddress Recipient address on the destination chain.
    /// @param route Resolved LayerZero route for the destination.
    /// @param desiredOutLD Desired receive amount on the destination (local decimals).
    /// @param extraData Opaque data for subclass-specific policy.
    /// @return accounting The computed accounting policy for the send.
    function _computeAccounting(
        uint256 toChainId,
        address toAddress,
        LZBridgeRoute memory route,
        uint256 desiredOutLD,
        bytes memory extraData
    ) internal view virtual returns (Accounting memory accounting);

    // Internal helpers

    /// @notice Resolves the route for `toChainId` and extracts the desired
    /// destination amount from the provided options.
    /// @param toChainId Destination EVM chain ID.
    /// @param bridgeTokenOutOptions Candidate destination token/amount options.
    /// @return route The configured route for `toChainId`.
    /// @return outAmountLD Desired destination amount (local decimals).
    function _resolveRouteAndOut(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) internal view returns (LZBridgeRoute memory route, uint256 outAmountLD) {
        route = bridgeRouteMapping[toChainId];
        require(route.dstEid != 0, "DPLZB: route not found");

        uint256 n = bridgeTokenOutOptions.length;
        uint256 idx = 0;
        for (; idx < n; ++idx) {
            if (
                address(bridgeTokenOutOptions[idx].token) ==
                route.bridgeTokenOut
            ) break;
        }
        require(idx < n, "DPLZB: bad bridge token");

        uint256 outAmount = bridgeTokenOutOptions[idx].amount;
        require(outAmount > 0, "DPLZB: zero amount");

        // LayerZero uses "local decimals" for amounts. e.g. if the token has
        // 6 decimals on the source chain and 18 decimals on the dest chain,
        // represent the bridge output amount using 6 decimals.
        outAmountLD = TokenUtils.convertTokenAmountDecimals({
            amount: outAmount,
            fromDecimals: route.bridgeTokenOutDecimals,
            toDecimals: TokenUtils.getDecimals(route.bridgeTokenIn),
            roundUp: true
        });
    }

    /// @dev Casts an EVM address to 32-byte representation used by OFT.
    function _toB32(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }
}
