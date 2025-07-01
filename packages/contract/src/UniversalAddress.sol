// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";

import "./SharedConfig.sol";
import "./TokenUtils.sol";
import {Call} from "./DaimoPayExecutor.sol";
import {IDaimoPayBridger, TokenAmount} from "./interfaces/IDaimoPayBridger.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Universal cross-chain deposit address with bridge + optional
///         instantaneous relay (fastFinish). Deployed once per
///         toChainId+toCoin+toAddress+refundAddress via BeaconProxy. All mutable
///         logic lives here and can be upgraded globally through the beacon, so
///         individual addresses remain minimal and deterministic.
contract UniversalAddress is Initializable, ReentrancyGuardUpgradeable {
    using SafeERC20 for IERC20;

    // ───────────────────────────────────────────────────────────────────────────
    // Constants & Immutables
    // ───────────────────────────────────────────────────────────────────────────

    /// Sentinel value for "claimed".
    address private constant ADDR_MAX = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    // Keys for the SharedConfig mapping.
    bytes32 public constant USDC_KEY = keccak256("USDC_KEY");
    bytes32 public constant BRIDGER_KEY = keccak256("BRIDGER_KEY");

    // ───────────────────────────────────────────────────────────────────────────
    // Storage
    // ───────────────────────────────────────────────────────────────────────────

    /// Global, chain-specific configuration contract.
    SharedConfig public cfg;

    /// Destination chain where final funds will arrive.
    uint256 public toChainId;

    /// Destination token (eg USDT, DAI, native USDC on dest chain).
    IERC20 public toCoin;

    /// Beneficiary wallet on the destination chain.
    address public beneficiary;

    /// Where non-allow-listed tokens are swept.
    address public refundAddress;

    /// Map receiverSalt ⇒ relayer that performed fastFinish. Sentinel = ADDR_MAX
    /// when already claimed, 0x0 when open.
    mapping(bytes32 => address) public receiverFiller;

    // 45-word gap for upgrades
    uint256[45] private __gap;

    // ───────────────────────────────────────────────────────────────────────────
    // Initializer
    // ───────────────────────────────────────────────────────────────────────────

    /// @dev Called once by factory-deployed BeaconProxy.
    function initialize(
        SharedConfig _cfg,
        uint256 _toChainId,
        IERC20 _toCoin,
        address _beneficiary,
        address _refundAddress
    ) external initializer {
        __ReentrancyGuard_init();
        cfg = _cfg;
        toChainId = _toChainId;
        toCoin = _toCoin;
        beneficiary = _beneficiary;
        refundAddress = _refundAddress;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Modifiers
    // ───────────────────────────────────────────────────────────────────────────

    modifier whenNotPaused() {
        require(!cfg.paused(), "UA: paused");
        _;
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Core external functions
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Begin a cross-chain transfer. Executed on the SOURCE chain.
    /// @param inputToken  Token deposited by user (must be allow-listed).
    /// @param userSalt    User-chosen randomness component for receiver
    ///                    address derivation.
    /// @param swapCalls   Sequence of on-chain calls that convert inputToken →
    ///                    native USDC (1:1 bridge medium).
    /// @param bridgeExtra Extra data passed straight to `DaimoPayBridger`.
    function start(IERC20 inputToken, bytes32 userSalt, Call[] calldata swapCalls, bytes calldata bridgeExtra)
        external
        nonReentrant
        whenNotPaused
    {
        require(cfg.allowedStable(address(inputToken)), "UA: token disallowed");

        uint256 balance = inputToken.balanceOf(address(this));
        require(balance > 0, "UA: no balance");

        if (block.chainid == toChainId) {
            // If the destination chain is the same as the source chain, we can
            // just transfer the funds to the beneficiary.
            TokenUtils.transfer({token: inputToken, recipient: payable(beneficiary), amount: balance});
            emit StartBridge(userSalt, balance, beneficiary);
        } else {
            // Otherwise, we're finna bridge.

            // Convert to canonical USDC.
            // We use USDC as an intermediate token for cross-chain bridging.
            IERC20 usdc = IERC20(cfg.addr(USDC_KEY));
            _swapInPlace(swapCalls, IERC20(address(usdc)), balance, payable(msg.sender));

            // Prepare single-option bridgeTokenOut.
            TokenAmount[] memory outOpts = new TokenAmount[](1);
            outOpts[0] = TokenAmount({token: usdc, amount: balance});

            // Get bridger router from config and initiate bridge.
            address bridgerAddr = cfg.addr(BRIDGER_KEY);
            require(bridgerAddr != address(0), "UA: bridger missing");

            // Compute deterministic BridgeReceiver address per spec.
            bytes32 recvSalt = _receiverSalt(userSalt, balance);
            address receiverAddr = _computeReceiverAddress(recvSalt);

            IDaimoPayBridger(bridgerAddr).sendToChain({
                toChainId: toChainId,
                toAddress: receiverAddr,
                bridgeTokenOutOptions: outOpts,
                extraData: bridgeExtra
            });

            emit StartBridge(recvSalt, balance, receiverAddr);
        }
    }

    /// @notice Relayer-only function on DESTINATION chain: deliver funds early
    ///         and record entitlement to bridged USDC when it arrives.
    function fastFinish(uint256 bridgedAmount, bytes32 userSalt, Call[] calldata swapCalls)
        external
        nonReentrant
        whenNotPaused
    {
        require(block.chainid == toChainId, "UA: wrong chain");

        IERC20 usdc = IERC20(cfg.addr(USDC_KEY));

        // Determine receiverSalt & ensure not already finished/claimed.
        bytes32 recvSalt = _receiverSalt(userSalt, bridgedAmount);
        require(receiverFiller[recvSalt] == address(0), "UA: already finished");

        // Pull USDC from relayer.
        usdc.safeTransferFrom(msg.sender, address(this), bridgedAmount);

        // Swap to final token if needed and deliver to beneficiary.
        _swapInPlace(swapCalls, toCoin, bridgedAmount, payable(msg.sender));
        TokenUtils.transfer({token: toCoin, recipient: payable(beneficiary), amount: bridgedAmount});

        // Record relayer as filler.
        receiverFiller[recvSalt] = msg.sender;

        emit FastFinish(recvSalt, bridgedAmount, msg.sender);
    }

    /// @notice Complete the intent after the canonical bridge lands.
    function claim(uint256 bridgedAmount, bytes32 userSalt) external nonReentrant whenNotPaused {
        require(block.chainid == toChainId, "UA: wrong chain");

        IERC20 usdc = IERC20(cfg.addr(USDC_KEY));
        bytes32 recvSalt = _receiverSalt(userSalt, bridgedAmount);
        address filler = receiverFiller[recvSalt];
        require(filler != ADDR_MAX, "UA: already claimed");

        // Deploy BridgeReceiver deterministically if not yet deployed, then
        // sweep USDC into this contract.
        address payable receiverAddr = _computeReceiverAddress(recvSalt);
        if (receiverAddr.code.length == 0) {
            // Deploy minimal proxy that forwards tokens.
            new BridgeReceiver{salt: recvSalt}(usdc);
        }

        // Distribute funds based on fast-finish status.
        if (filler == address(0)) {
            // No fastFinish; deliver to beneficiary.
            TokenUtils.transfer({token: usdc, recipient: payable(beneficiary), amount: bridgedAmount});
        } else {
            // Repay the relayer.
            TokenUtils.transfer({token: usdc, recipient: payable(filler), amount: bridgedAmount});
        }

        receiverFiller[recvSalt] = ADDR_MAX;
        emit Claim(recvSalt, bridgedAmount, bridgedAmount);
    }

    /// @notice Sweep any non-allow-listed tokens back to user's refund address.
    function refund(IERC20[] calldata tokens) external nonReentrant whenNotPaused {
        uint256 n = tokens.length;
        for (uint256 i = 0; i < n; ++i) {
            IERC20 tok = tokens[i];
            if (!cfg.allowedStable(address(tok))) {
                uint256 amt = TokenUtils.transferBalance({token: tok, recipient: payable(refundAddress)});
                emit Refund(address(tok), amt, refundAddress);
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ───────────────────────────────────────────────────────────────────────────

    function _receiverSalt(bytes32 userSalt, uint256 amount) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("receiver", address(this), userSalt, amount));
    }

    function _computeReceiverAddress(bytes32 salt) internal view returns (address payable addr) {
        // Deterministic CREATE2: keccak256(0xFF ++ deployer ++ salt ++ initCodeHash)
        bytes memory bytecode = type(BridgeReceiver).creationCode;
        bytes32 hash = keccak256(abi.encodePacked(hex"ff", address(this), salt, keccak256(bytecode)));
        addr = payable(address(uint160(uint256(hash))));
    }

    /// Executes arbitrary calls and checks post-balance on `requiredToken`.
    /// Any deficit relative to `requiredAmount` is pulled from `swapFunder`,
    /// while any surplus is returned to the same address to keep the contract
    /// balance clean.
    function _swapInPlace(
        Call[] calldata calls,
        IERC20 requiredToken,
        uint256 requiredAmount,
        address payable swapFunder
    ) internal {
        uint256 beforeBal = TokenUtils.getBalanceOf(requiredToken, address(this));

        // Execute the swap calls in-place.
        uint256 n = calls.length;
        for (uint256 i = 0; i < n; ++i) {
            Call calldata c = calls[i];
            (bool ok,) = c.to.call{value: c.value}(c.data);
            require(ok, "UA: swap call failed");
        }

        uint256 afterBal = TokenUtils.getBalanceOf(requiredToken, address(this));
        uint256 produced = afterBal - beforeBal;

        // If the swap produced less than the required amount, pull the
        // shortfall from the funder (msg.sender in start/fastFinish).
        if (produced < requiredAmount) {
            uint256 deficit = requiredAmount - produced;
            requiredToken.safeTransferFrom(swapFunder, address(this), deficit);
            afterBal += deficit;
        }

        // Return any surplus to the funder.
        uint256 surplus = afterBal - beforeBal - requiredAmount;
        if (surplus > 0) {
            TokenUtils.transfer({token: requiredToken, recipient: swapFunder, amount: surplus});
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Events
    // ───────────────────────────────────────────────────────────────────────────

    event StartBridge(bytes32 indexed salt, uint256 amountUSDC, address receiver);
    event FastFinish(bytes32 indexed salt, uint256 amountDestTok, address indexed relayer);
    event Claim(bytes32 indexed salt, uint256 bridgedUSDC, uint256 repaidUSDC);
    event Refund(address indexed token, uint256 amount, address indexed refundAddr);
}

// ───────────────────────────────────────────────────────────────────────────────
// Minimal deterministic receiver.
// ───────────────────────────────────────────────────────────────────────────────

contract BridgeReceiver {
    using SafeERC20 for IERC20;

    constructor(IERC20 _token) {
        // Transfer the token to the UA.
        address payable ua = payable(msg.sender);
        uint256 bal = TokenUtils.getBalanceOf(_token, address(this));
        TokenUtils.transfer({token: _token, recipient: ua, amount: bal});

        // Destroy the contract.
        selfdestruct(ua);
    }
}
