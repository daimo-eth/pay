// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IDaimoPayBridger.sol";
import "../vendor/cctp/v2/ITokenMinterV2.sol";
import "../vendor/cctp/v2/ICCTPTokenMessengerV2.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Bridges assets to a destination chain using CCTP v2.
contract DaimoPayCCTPV2Bridger is IDaimoPayBridger {
    using SafeERC20 for IERC20;

    struct CCTPBridgeRoute {
        // CCTP domain of the destination chain.
        uint32 domain;
        // The bridge that will be output by CCTP on the destination chain.
        address bridgeTokenOut;
    }

    struct ExtraData {
        /// Maximum fee to pay on the destination domain, specified in units of
        /// bridgeTokenOut.
        uint256 maxFee;
        /// Minimum finality threshold for the destination domain. (1000 or less
        /// for Fast Transfer)
        uint32 minFinalityThreshold;
    }

    // Default values for ExtraData when not provided
    uint256 public constant DEFAULT_MAX_FEE = 0;
    uint32 public constant DEFAULT_MIN_FINALITY_THRESHOLD = 2000;

    /// CCTP TokenMinterV2 for this chain. Has a function to identify the CCTP
    /// token on the current chain corresponding to a given output token.
    ITokenMinterV2 public tokenMinterV2;
    /// CCTP TokenMessengerV2 for this chain. Used to initiate the CCTP bridge.
    ICCTPTokenMessengerV2 public cctpMessengerV2;

    /// Map destination chainId to CCTP domain and the bridge token address on
    /// the destination chain.
    mapping(uint256 toChainId => CCTPBridgeRoute bridgeRoute)
        public bridgeRouteMapping;

    /// Specify the CCTP chain IDs and domains that this bridger will support.
    constructor(
        ITokenMinterV2 _tokenMinterV2,
        ICCTPTokenMessengerV2 _cctpMessengerV2,
        uint256[] memory _toChainIds,
        CCTPBridgeRoute[] memory _bridgeRoutes
    ) {
        tokenMinterV2 = _tokenMinterV2;
        cctpMessengerV2 = _cctpMessengerV2;

        uint256 n = _toChainIds.length;
        require(
            n == _bridgeRoutes.length,
            "DPCCTP2B: wrong bridgeRoutes length"
        );
        for (uint256 i = 0; i < n; ++i) {
            bridgeRouteMapping[_toChainIds[i]] = _bridgeRoutes[i];
        }
    }

    function addressToBytes32(address addr) internal pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }

    // ----- BRIDGER FUNCTIONS -----

    /// Given a list of bridge token options, find the index of the bridge token
    /// that matches the correct bridge token out. Return the length of the array
    /// if no match is found.
    function _findBridgeTokenOut(
        TokenAmount[] calldata bridgeTokenOutOptions,
        address bridgeTokenOut
    ) internal pure returns (uint256 index) {
        uint256 n = bridgeTokenOutOptions.length;
        for (uint256 i = 0; i < n; ++i) {
            if (address(bridgeTokenOutOptions[i].token) == bridgeTokenOut) {
                return i;
            }
        }
        return n;
    }

    /// Retrieves the necessary data for bridging tokens from the current chain
    /// to a specified destination chain using CCTP.
    /// CCTP does 1 to 1 for standard token bridging, so the amount of tokens to
    /// bridge is the same as toAmount.
    function _getBridgeData(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    )
        internal
        view
        returns (
            address inToken,
            uint256 inAmount,
            address outToken,
            uint256 outAmount,
            uint32 toDomain
        )
    {
        CCTPBridgeRoute memory bridgeRoute = bridgeRouteMapping[toChainId];
        require(
            bridgeRoute.bridgeTokenOut != address(0),
            "DPCCTP2B: bridge route not found"
        );

        // Find amount we need to send
        uint256 index = _findBridgeTokenOut(
            bridgeTokenOutOptions,
            bridgeRoute.bridgeTokenOut
        );
        // If the index is the length of the array, then the bridge token out
        // was not found in the list of options.
        require(
            index < bridgeTokenOutOptions.length,
            "DPCCTP2B: bad bridge token"
        );

        // Find where we need to send it
        toDomain = bridgeRoute.domain;
        outToken = bridgeRoute.bridgeTokenOut;
        outAmount = bridgeTokenOutOptions[index].amount;
        inToken = tokenMinterV2.getLocalToken(
            bridgeRoute.domain,
            addressToBytes32(bridgeRoute.bridgeTokenOut)
        );
        inAmount = outAmount;
    }

    /// Determine the input token and amount required for bridging to
    /// another chain.
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount) {
        (address _bridgeTokenIn, uint256 _inAmount, , , ) = _getBridgeData(
            toChainId,
            bridgeTokenOutOptions
        );

        bridgeTokenIn = _bridgeTokenIn;
        inAmount = _inAmount;
    }

    /// Initiate a bridge to a destination chain using CCTP v2.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        bytes calldata extraData
    ) public {
        require(toChainId != block.chainid, "DPCCTP2B: same chain");

        (
            address inToken,
            uint256 inAmount,
            address outToken,
            uint256 outAmount,
            uint32 toDomain
        ) = _getBridgeData(toChainId, bridgeTokenOutOptions);
        require(outAmount > 0, "DPCCTP2B: zero amount");
        require(outToken != address(0), "DPCCTP2B: outToken is 0");

        // Parse remaining arguments from extraData
        ExtraData memory extra;
        if (extraData.length == 0) {
            extra.maxFee = DEFAULT_MAX_FEE;
            extra.minFinalityThreshold = DEFAULT_MIN_FINALITY_THRESHOLD;
        } else {
            extra = abi.decode(extraData, (ExtraData));
        }

        // Move input token from caller to this contract and approve CCTP.
        IERC20(inToken).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: inAmount
        });
        IERC20(inToken).forceApprove({
            spender: address(cctpMessengerV2),
            value: inAmount
        });

        cctpMessengerV2.depositForBurn({
            amount: inAmount,
            destinationDomain: toDomain,
            mintRecipient: addressToBytes32(toAddress),
            burnToken: address(inToken),
            // Empty bytes32 allows any address to call MessageTransmitterV2.receiveMessage()
            destinationCaller: bytes32(0),
            maxFee: extra.maxFee,
            minFinalityThreshold: extra.minFinalityThreshold
        });

        emit BridgeInitiated({
            fromAddress: msg.sender,
            fromToken: inToken,
            fromAmount: inAmount,
            toChainId: toChainId,
            toAddress: toAddress,
            toToken: outToken,
            toAmount: outAmount
        });
    }
}
