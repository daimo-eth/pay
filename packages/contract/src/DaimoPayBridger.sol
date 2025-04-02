// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";

/// @title Bridger which multiplexes between different bridging protocols
/// @author The Daimo team
/// @custom:security-contact security@daimo.com
///
/// @dev Bridges assets from to a supported destination chain. Multiplexes between
/// different bridging protocols by destination chain.
contract DaimoPayBridger is IDaimoPayBridger, Ownable2Step {
    using SafeERC20 for IERC20;

    // Map chainId to the contract address of an IDaimoPayBridger implementation
    mapping(uint256 chainId => IDaimoPayBridger bridger)
        public chainIdToBridger;

    event BridgeAdded(uint256 indexed toChainId, address bridger);
    event BridgeRemoved(uint256 indexed toChainId);

    /// Specify the bridger implementation to use for each chain.
    constructor(
        address _owner,
        uint256[] memory _toChainIds,
        IDaimoPayBridger[] memory _bridgers
    ) Ownable(_owner) {
        uint256 n = _toChainIds.length;
        require(n == _bridgers.length, "DPB: wrong bridgers length");

        for (uint256 i = 0; i < n; ++i) {
            _setBridgeRoutes({toChainIds: _toChainIds, bridgers: _bridgers});
        }
    }

    // ----- ADMIN FUNCTIONS -----

    /// Add a new bridger for a destination chain.
    function setBridgeRoutes(
        uint256[] memory toChainIds,
        IDaimoPayBridger[] memory bridgers
    ) public onlyOwner {
        _setBridgeRoutes({toChainIds: toChainIds, bridgers: bridgers});
    }

    function _setBridgeRoutes(
        uint256[] memory toChainIds,
        IDaimoPayBridger[] memory bridgers
    ) private {
        uint256 n = toChainIds.length;
        require(n == bridgers.length, "DPB: wrong bridgers length");

        for (uint256 i = 0; i < n; ++i) {
            chainIdToBridger[toChainIds[i]] = bridgers[i];
            emit BridgeAdded({
                toChainId: toChainIds[i],
                bridger: address(bridgers[i])
            });
        }
    }

    /// Remove a bridger for a destination chain.
    function removeBridgers(uint256[] memory toChainIds) public onlyOwner {
        for (uint256 i = 0; i < toChainIds.length; ++i) {
            delete chainIdToBridger[toChainIds[i]];
            emit BridgeRemoved({toChainId: toChainIds[i]});
        }
    }

    // ----- BRIDGER FUNCTIONS -----

    function getBridgeTokenIn(
        uint256 toChainId,
        TokenAmount[] calldata bridgeTokenOutOptions
    ) external view returns (address bridgeTokenIn, uint256 inAmount) {
        IDaimoPayBridger bridger = chainIdToBridger[toChainId];
        require(address(bridger) != address(0), "DPB: missing bridger");

        return bridger.getBridgeTokenIn(toChainId, bridgeTokenOutOptions);
    }

    /// Initiate a bridge to a supported destination chain.
    function sendToChain(
        uint256 toChainId,
        address toAddress,
        TokenAmount[] calldata bridgeTokenOutOptions,
        bytes calldata extraData
    ) public {
        require(toChainId != block.chainid, "DPB: same chain");

        // Get the specific bridger implementation for toChain (CCTP, Across,
        // Axelar, etc)
        IDaimoPayBridger bridger = chainIdToBridger[toChainId];
        require(address(bridger) != address(0), "DPB: missing bridger");

        // Move input token from caller to this contract and initiate bridging.
        (address bridgeTokenIn, uint256 inAmount) = this.getBridgeTokenIn({
            toChainId: toChainId,
            bridgeTokenOutOptions: bridgeTokenOutOptions
        });
        require(bridgeTokenIn != address(0), "DPB: missing bridge token in");

        IERC20(bridgeTokenIn).safeTransferFrom({
            from: msg.sender,
            to: address(this),
            value: inAmount
        });

        // Approve tokens to the bridge contract and intiate bridging.
        IERC20(bridgeTokenIn).forceApprove({
            spender: address(bridger),
            value: inAmount
        });
        bridger.sendToChain({
            toChainId: toChainId,
            toAddress: toAddress,
            bridgeTokenOutOptions: bridgeTokenOutOptions,
            extraData: extraData
        });
    }
}
