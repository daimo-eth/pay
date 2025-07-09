// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./TokenUtils.sol"; // Provides TokenAmount struct
import "./interfaces/IDaimoPayBridger.sol";
import "./interfaces/IUniversalAddressBridger.sol";

/// @author Daimo, Inc
/// @notice Thin wrapper that exposes a minimal ABI for bridging through the
///         existing DaimoPay adapter ecosystem.  Eliminates the TokenAmount[]
///         argument surface for callers while preserving full adapter logic.
contract UniversalAddressBridger is IUniversalAddressBridger {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Immutable routing data (set once in the constructor)
    // ---------------------------------------------------------------------

    mapping(uint256 => IDaimoPayBridger) public chainIdToBridger;
    mapping(uint256 => address) public chainIdToStableOut;

    constructor(uint256[] memory chains, IDaimoPayBridger[] memory bridgers, address[] memory usdOut) {
        uint256 n = chains.length;
        require(n == bridgers.length && n == usdOut.length, "UA: length mismatch");
        for (uint256 i; i < n; ++i) {
            chainIdToBridger[chains[i]] = bridgers[i];
            chainIdToStableOut[chains[i]] = usdOut[i];
        }
    }

    // ---------------------------------------------------------------------
    // View helpers
    // ---------------------------------------------------------------------

    /// @inheritdoc IUniversalAddressBridger
    function quoteIn(uint256 toChainId, IERC20 outToken, uint256 desiredOut)
        external
        view
        returns (address tokenIn, uint256 exactIn)
    {
        IDaimoPayBridger adapter = chainIdToBridger[toChainId];
        require(address(adapter) != address(0), "UA: unknown chain");

        // Ensure the requested outToken matches configured stablecoin for this chain.
        require(address(outToken) == chainIdToStableOut[toChainId], "UA: token mismatch");

        // Build a single-element TokenAmount[] expected by the adapter
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({token: outToken, amount: desiredOut});

        (tokenIn, exactIn) = adapter.getBridgeTokenIn(toChainId, opts);
    }

    // ---------------------------------------------------------------------
    // Mutating state
    // ---------------------------------------------------------------------

    /// @inheritdoc IUniversalAddressBridger
    function bridge(uint256 toChainId, address toAddress, IERC20 outToken, uint256 minOut, bytes calldata extra)
        external
    {
        IDaimoPayBridger adapter = chainIdToBridger[toChainId];
        address stableOut = chainIdToStableOut[toChainId];
        require(address(adapter) != address(0), "UA: unknown chain");
        require(address(outToken) == stableOut, "UA: token mismatch");

        // Build one-element array for the legacy adapter call ensuring
        // it satisfies the adapter's min-out check.
        TokenAmount[] memory opts = new TokenAmount[](1);
        opts[0] = TokenAmount({token: outToken, amount: minOut});

        // Determine the required input asset and quantity for the requested bridge.
        (address tokenIn, uint256 amountIn) = adapter.getBridgeTokenIn(toChainId, opts);
        require(tokenIn != address(0), "UA: native tokens not supported");

        // Pull tokens from caller into this contract once.
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);

        // Approve the adapter to spend and forward the call.
        IERC20(tokenIn).forceApprove(address(adapter), amountIn);

        adapter.sendToChain(toChainId, toAddress, opts, extra);
    }
}
