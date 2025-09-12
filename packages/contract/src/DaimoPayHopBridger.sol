// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./interfaces/IDaimoPayBridger.sol";
import "../vendor/cctp/v1/ITokenMinter.sol";
import "../vendor/cctp/v1/ICCTPTokenMessenger.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Bridges assets to a destination chain via a hop chain.
/// @dev    Hop bridger must ONLY be used with intent address destinations.
///         It ignores bridgeTokenOutOptions, and relies on the intent address
///         on the hop chain to perform the correct swap + final bridge.
contract DaimoPayHopBridger is IDaimoPayBridger {
    using SafeERC20 for IERC20;

    /// Hop chain ID, eg Arbitrum.
    uint256 public immutable hopChainId;
    /// Hop coin must be a stablecoin, with 1:1 conversion to finalChainCoins.
    address public immutable hopCoinAddr; // eg Arb axlUSDC
    /// Decimals of the hop coin.
    uint256 public immutable hopCoinDecimals;
    /// Bridger used to get from current chain to hop chain, eg AxelarBriger.
    IDaimoPayBridger public immutable hopBridger;
    /// For each final dest chain, we require a specific stablecoin to be on the
    /// bridgeTokenOutOptions list. We convert that amount to the correct hop-
    /// coin amount at 1:1, accounting for decimals.
    mapping(uint256 chainId => ChainCoin chainCoin) public finalChainCoins;

    struct ChainCoin {
        uint256 chainId;
        address addr;
        uint256 decimals;
    }

    constructor(
        uint256 _hopChainId,
        address _hopCoinAddr,
        uint256 _hopCoinDecimals,
        IDaimoPayBridger _hopBridger,
        ChainCoin[] memory _finalChainCoins
    ) {
        hopChainId = _hopChainId;
        hopCoinAddr = _hopCoinAddr;
        hopCoinDecimals = _hopCoinDecimals;
        hopBridger = _hopBridger;
        for (uint256 i = 0; i < _finalChainCoins.length; i++) {
            finalChainCoins[_finalChainCoins[i].chainId] = _finalChainCoins[i];
        }
    }

    /// Determine the input token and amount required for bridging to
    /// another chain.
    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount) {
        TokenAmount[] memory hopAssetOpts = _getHopAsset({
            toChainId: toChainId,
            tokenOpts: bridgeTokenOutOptions
        });

        (bridgeTokenIn, inAmount) = hopBridger.getBridgeTokenIn({
            toChainId: hopChainId,
            bridgeTokenOutOptions: hopAssetOpts
        });
    }

    /// Initiate a bridge to a destination chain via a hop chain.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        address refundAddress,
        bytes calldata extraData
    ) public {
        require(toChainId != block.chainid, "DPHB: same chain");

        TokenAmount[] memory hopAssetOpts = _getHopAsset({
            toChainId: toChainId,
            tokenOpts: bridgeTokenOutOptions
        });

        (address inToken, uint256 inAmount) = hopBridger.getBridgeTokenIn({
            toChainId: hopChainId,
            bridgeTokenOutOptions: hopAssetOpts
        });

        IERC20(inToken).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: inAmount
        });
        IERC20(inToken).forceApprove({
            spender: address(hopBridger),
            value: inAmount
        });

        hopBridger.sendToChain({
            toChainId: hopChainId,
            toAddress: toAddress,
            bridgeTokenOutOptions: hopAssetOpts,
            refundAddress: refundAddress,
            extraData: extraData
        });
    }

    /// Convert stablecoin amount between decimals with 1:1 value.
    /// Rounds up when decreasing precision.
    function _convertStableAmount(
        uint256 amount,
        uint256 fromDecimals,
        uint256 toDecimals
    ) internal pure returns (uint256) {
        if (toDecimals >= fromDecimals) {
            uint256 diff = toDecimals - fromDecimals;
            return amount * (10 ** diff);
        } else {
            uint256 diff = fromDecimals - toDecimals;
            uint256 divisor = 10 ** diff;
            return (amount + divisor - 1) / divisor; // round up
        }
    }

    /// Build the hop-asset option expected by the hop bridger.
    /// Returns exactly one TokenAmount with the hop coin and amount converted
    /// 1:1 by decimals from the required final-chain stablecoin. Rounds up when
    /// reducing precision to avoid underfunding.
    function _getHopAsset(
        uint256 toChainId,
        TokenAmount[] calldata tokenOpts
    ) internal view returns (TokenAmount[] memory) {
        ChainCoin memory finalCoin = finalChainCoins[toChainId];
        require(finalCoin.addr != address(0), "DPHB: unsupported dest chain");

        uint256 finalAmount = 0;
        uint256 n = tokenOpts.length;
        for (uint256 i = 0; i < n; ++i) {
            if (address(tokenOpts[i].token) == finalCoin.addr) {
                finalAmount = tokenOpts[i].amount;
                break;
            }
        }
        require(finalAmount > 0, "DPHB: required token missing");

        uint256 convertedAmount = _convertStableAmount({
            amount: finalAmount,
            fromDecimals: finalCoin.decimals,
            toDecimals: hopCoinDecimals
        });

        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({
            token: IERC20(hopCoinAddr),
            amount: convertedAmount
        });
        return opts;
    }
}
