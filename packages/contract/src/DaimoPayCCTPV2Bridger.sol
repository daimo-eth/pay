// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IDaimoPayBridger.sol";
import "../vendor/cctp/v2/ITokenMinterV2.sol";
import "../vendor/cctp/v2/ICCTPTokenMessengerV2.sol";

/// @title Bridger implementation for Circle's Cross-Chain Transfer Protocol (CCTP)
/// @author The Daimo team
/// @custom:security-contact security@daimo.com
///
/// @dev Bridges assets from to a destination chain using CCTP. The only supported
/// bridge token is USDC.
contract DaimoPayCCTPV2Bridger is IDaimoPayBridger, Ownable2Step {
    using SafeERC20 for IERC20;

    struct CCTPBridgeRoute {
        uint32 domain;
        address bridgeTokenOut;
    }

    struct ExtraData {
        // Maximum fee to pay on the destination domain, specified in units of
        // bridgeTokenOut.
        uint256 maxFee;
        // Minimum finality threshold for the destination domain. (1000 or less
        // for Fast Transfer)
        uint32 minFinalityThreshold;
    }

    // CCTP TokenMinter for this chain. Used to identify the CCTP token on the
    // current chain.
    ITokenMinterV2 public tokenMinterV2;
    // CCTP TokenMessenger for this chain. Used to initiate the CCTP bridge.
    ICCTPTokenMessengerV2 public cctpMessengerV2;

    // Map destination chainId to CCTP domain and the bridge token address on the
    // destination chain.
    mapping(uint256 toChainId => CCTPBridgeRoute bridgeRoute)
        public bridgeRouteMapping;

    event BridgeRouteAdded(
        uint256 indexed toChainId,
        CCTPBridgeRoute bridgeRoute
    );

    event BridgeRouteRemoved(
        uint256 indexed toChainId,
        CCTPBridgeRoute bridgeRoute
    );

    /// Specify the CCTP chain IDs and domains that this bridger will support.
    constructor(
        address _owner,
        ITokenMinterV2 _tokenMinterV2,
        ICCTPTokenMessengerV2 _cctpMessengerV2,
        uint256[] memory _toChainIds,
        CCTPBridgeRoute[] memory _bridgeRoutes
    ) Ownable(_owner) {
        tokenMinterV2 = _tokenMinterV2;
        cctpMessengerV2 = _cctpMessengerV2;
        _setBridgeRoutes({
            toChainIds: _toChainIds,
            bridgeRoutes: _bridgeRoutes
        });
    }

    // ----- ADMIN FUNCTIONS -----

    /// Add a new supported CCTP recipient chain.
    function setBridgeRoutes(
        uint256[] memory toChainIds,
        CCTPBridgeRoute[] memory bridgeRoutes
    ) public onlyOwner {
        _setBridgeRoutes({toChainIds: toChainIds, bridgeRoutes: bridgeRoutes});
    }

    function _setBridgeRoutes(
        uint256[] memory toChainIds,
        CCTPBridgeRoute[] memory bridgeRoutes
    ) private {
        uint256 n = toChainIds.length;
        require(n == bridgeRoutes.length, "DPCCTP2B: wrong bridgeRoutes length");

        for (uint256 i = 0; i < n; ++i) {
            bridgeRouteMapping[toChainIds[i]] = bridgeRoutes[i];
            emit BridgeRouteAdded({
                toChainId: toChainIds[i],
                bridgeRoute: bridgeRoutes[i]
            });
        }
    }

    /// Remove a supported CCTP recipient chain.
    function removeBridgeRoutes(uint256[] memory toChainIds) public onlyOwner {
        for (uint256 i = 0; i < toChainIds.length; ++i) {
            CCTPBridgeRoute memory bridgeRoute = bridgeRouteMapping[
                toChainIds[i]
            ];
            delete bridgeRouteMapping[toChainIds[i]];
            emit BridgeRouteRemoved({
                toChainId: toChainIds[i],
                bridgeRoute: bridgeRoute
            });
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
        TokenAmount[] memory bridgeTokenOutOptions,
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

    /// Get the CCTP bridge token address and amount for the current chain.
    /// CCTP does 1 to 1 token bridging, so the amount of tokens to bridge is
    /// the same as toAmount.
    function _getBridgeData(
        uint256 toChainId,
        TokenAmount[] memory bridgeTokenOutOptions
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

        toDomain = bridgeRoute.domain;
        outToken = bridgeRoute.bridgeTokenOut;
        outAmount = bridgeTokenOutOptions[index].amount;
        inToken = tokenMinterV2.getLocalToken(
            bridgeRoute.domain,
            addressToBytes32(bridgeRoute.bridgeTokenOut)
        );
        inAmount = outAmount;
    }

    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] memory bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount) {
        (address _bridgeTokenIn, uint256 _inAmount, , , ) = _getBridgeData(
            toChainId,
            bridgeTokenOutOptions
        );

        bridgeTokenIn = _bridgeTokenIn;
        inAmount = _inAmount;
    }

    /// Initiate a bridge to a destination chain using CCTP.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] memory bridgeTokenOutOptions,
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

        // Parse remaining arguments from extraData
        ExtraData memory extra;
        extra = abi.decode(extraData, (ExtraData));

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
