// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IDaimoPayBridger.sol";
import "../vendor/across/V3SpokePoolInterface.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Bridges assets to a destination chain using Across Protocol.
/// @dev Makes the assumption that the local token is an ERC20 token and has a
/// 1 to 1 price with the corresponding destination token.
contract DaimoPayAcrossBridger is IDaimoPayBridger {
    using SafeERC20 for IERC20;

    struct AcrossBridgeRoute {
        address bridgeTokenIn;
        address bridgeTokenOut;
        /// Minimum percentage fee to pay the Across relayer on the source
        /// chain. The input amount should be at least this much larger than the
        /// output amount.
        /// 1% is represented as 1e16, 100% is 1e18, 50% is 5e17. This is how
        /// Across represents percentage fees.
        uint256 pctFee;
        /// Minimum flat fee to pay the Across relayer on the source chain.
        /// This fee is paid in bridgeTokenIn. The input amount should be at
        /// least this much larger than the output amount.
        uint256 flatFee;
    }

    struct ExtraData {
        /// The address funds will be refunded to if the bridge fails.
        address depositor;
        /// Returned from the Across API.
        address exclusiveRelayer;
        /// Returned from the Across API.
        uint32 quoteTimestamp;
        /// Deadline to fill the Across quote before the quote expires.
        uint32 fillDeadline;
        /// Returned from the Across API.
        uint32 exclusivityDeadline;
        /// Used when making a contract call on the destination chain using
        /// Across.
        bytes message;
    }

    uint256 public constant ONE_HUNDRED_PERCENT = 1e18;

    /// Across SpokePool contract address for this chain.
    V3SpokePoolInterface public immutable spokePool;

    /// Mapping destination chainId to the corresponding token on the current
    /// chain and fees associated with the bridge.
    mapping(uint256 toChainId => AcrossBridgeRoute bridgeRoute)
        public bridgeRouteMapping;

    /// Specify the localToken mapping to destination chains and tokens
    constructor(
        V3SpokePoolInterface _spokePool,
        uint256[] memory _toChainIds,
        AcrossBridgeRoute[] memory _bridgeRoutes
    ) {
        spokePool = _spokePool;
        uint256 n = _toChainIds.length;
        require(n == _bridgeRoutes.length, "DPAB: wrong bridgeRoutes length");
        for (uint256 i = 0; i < n; ++i) {
            bridgeRouteMapping[_toChainIds[i]] = _bridgeRoutes[i];
        }
    }

    // ----- BRIDGING FUNCTIONS -----

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
    /// to a specified destination chain using Across Protocol.
    /// Across requires a fee that's paid to relayers for bridging. The
    /// AcrossBridgeRoute specifies a pctFee and flatFee to ensure that an
    /// Across relayer will fill the order. The input amount must cover the max
    /// of the pctFee and the flatFee.
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
            uint256 outAmount
        )
    {
        AcrossBridgeRoute memory bridgeRoute = bridgeRouteMapping[toChainId];
        require(
            bridgeRoute.bridgeTokenOut != address(0),
            "DPAB: bridge route not found"
        );

        uint256 index = _findBridgeTokenOut(
            bridgeTokenOutOptions,
            bridgeRoute.bridgeTokenOut
        );
        // If the index is the length of the array, then the bridge token out
        // was not found in the list of options.
        require(index < bridgeTokenOutOptions.length, "DPAB: bad bridge token");

        // Calculate the amount that must be deposited to cover the fees.
        uint256 toAmount = bridgeTokenOutOptions[index].amount;
        uint256 amtWithPctFee = (toAmount *
            (ONE_HUNDRED_PERCENT + bridgeRoute.pctFee)) / ONE_HUNDRED_PERCENT;
        uint256 amtWithFlatFee = toAmount + bridgeRoute.flatFee;

        inToken = bridgeRoute.bridgeTokenIn;
        // Return the larger of the two amounts
        inAmount = amtWithPctFee > amtWithFlatFee
            ? amtWithPctFee
            : amtWithFlatFee;

        outToken = bridgeRoute.bridgeTokenOut;
        outAmount = bridgeTokenOutOptions[index].amount;
    }

    /// Determine the input token and amount required for bridging to
    /// another chain.
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) public view returns (address bridgeTokenIn, uint256 inAmount) {
        (bridgeTokenIn, inAmount, , ) = _getBridgeData(
            toChainId,
            bridgeTokenOutOptions
        );
    }

    /// Initiate a bridge to a destination chain using Across Protocol.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        bytes calldata extraData
    ) public {
        require(toChainId != block.chainid, "DPAB: same chain");

        (
            address inToken,
            uint256 inAmount,
            address outToken,
            uint256 outAmount
        ) = _getBridgeData({
                toChainId: toChainId,
                bridgeTokenOutOptions: bridgeTokenOutOptions
            });
        require(outAmount > 0, "DPAB: zero amount");

        // Parse remaining arguments from extraData
        ExtraData memory extra;
        extra = abi.decode(extraData, (ExtraData));

        // Move input token from caller to this contract and approve the
        // Across SpokePool contract.
        IERC20(inToken).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: inAmount
        });
        IERC20(inToken).forceApprove({
            spender: address(spokePool),
            value: inAmount
        });

        spokePool.depositV3({
            depositor: extra.depositor,
            recipient: toAddress,
            inputToken: inToken,
            outputToken: outToken,
            inputAmount: inAmount,
            outputAmount: outAmount,
            destinationChainId: toChainId,
            exclusiveRelayer: extra.exclusiveRelayer,
            quoteTimestamp: extra.quoteTimestamp,
            fillDeadline: extra.fillDeadline,
            exclusivityDeadline: extra.exclusivityDeadline,
            message: extra.message
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
