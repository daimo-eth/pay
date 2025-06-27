// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IDaimoPayBridger.sol";
import "../vendor/cctp/v1/ITokenMinter.sol";
import "../vendor/cctp/v1/ICCTPTokenMessenger.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Bridges assets to a destination chain using CCTP v1.
contract DaimoPayCCTPBridger is IDaimoPayBridger {
    using SafeERC20 for IERC20;

    struct CCTPBridgeRoute {
        /// CCTP domain of the destination chain.
        uint32 domain;
        /// The bridge that will be output by CCTP on the destination chain.
        address bridgeTokenOut;
    }

    /// CCTP TokenMinter for this chain. Has a function to identify the CCTP
    /// token on the current chain corresponding to a given output token.
    ITokenMinter public tokenMinter;
    /// CCTP TokenMessenger for this chain. Used to initiate the CCTP bridge.
    ICCTPTokenMessenger public cctpMessenger;

    /// Map destination chainId to CCTP domain and the bridge token address on
    /// the destination chain.
    mapping(uint256 toChainId => CCTPBridgeRoute bridgeRoute)
        public bridgeRouteMapping;

    /// Specify the CCTP chain IDs and domains that this bridger will support.
    constructor(
        ITokenMinter _tokenMinter,
        ICCTPTokenMessenger _cctpMessenger,
        uint256[] memory _toChainIds,
        CCTPBridgeRoute[] memory _bridgeRoutes
    ) {
        tokenMinter = _tokenMinter;
        cctpMessenger = _cctpMessenger;

        uint256 n = _toChainIds.length;
        require(
            n == _bridgeRoutes.length,
            "DPCCTPB: wrong bridgeRoutes length"
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
    /// CCTP does 1 to 1 token bridging, so the amount of tokens to bridge is
    /// the same as toAmount.
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
            "DPCCTPB: bridge route not found"
        );

        uint256 index = _findBridgeTokenOut(
            bridgeTokenOutOptions,
            bridgeRoute.bridgeTokenOut
        );
        // If the index is the length of the array, then the bridge token out
        // was not found in the list of options.
        require(
            index < bridgeTokenOutOptions.length,
            "DPCCTPB: bad bridge token"
        );

        toDomain = bridgeRoute.domain;
        outToken = bridgeRoute.bridgeTokenOut;
        outAmount = bridgeTokenOutOptions[index].amount;
        inToken = tokenMinter.getLocalToken(
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

    /// Initiate a bridge to a destination chain using CCTP v1.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        address /* refundAddress */,
        bytes calldata /* extraData */
    ) public {
        require(toChainId != block.chainid, "DPCCTPB: same chain");

        (
            address inToken,
            uint256 inAmount,
            address outToken,
            uint256 outAmount,
            uint32 toDomain
        ) = _getBridgeData(toChainId, bridgeTokenOutOptions);
        require(outAmount > 0, "DPCCTPB: zero amount");

        // Move input token from caller to this contract and approve CCTP.
        IERC20(inToken).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: inAmount
        });
        IERC20(inToken).forceApprove({
            spender: address(cctpMessenger),
            value: inAmount
        });

        cctpMessenger.depositForBurn({
            amount: inAmount,
            destinationDomain: toDomain,
            mintRecipient: addressToBytes32(toAddress),
            burnToken: address(inToken)
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
