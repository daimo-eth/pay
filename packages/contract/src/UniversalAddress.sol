// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./SharedConfig.sol";
import "./TokenUtils.sol";
import {DaimoPayExecutor, Call} from "./DaimoPayExecutor.sol";
import {IUniversalAddressBridger} from "./interfaces/IUniversalAddressBridger.sol";

/// @notice Describes the routing parameters for a payment initiated via a
///         UniversalAddress.  Encodes the final destination chain/token and
///         the beneficiary+refund addrs so that indexers can recover the full
///         context from a single log.
struct PayRoute {
    uint256 toChainId; // Destination chain where funds will settle.
    IERC20 toCoin; // Destination token (eg native USDC on dest).
    address toAddr; // Beneficiary wallet on the destination chain.
    address refundAddr; // Address that will receive unsupported tokens.
}

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
    bytes32 public constant MIN_START_USDC_KEY = keccak256("MIN_START_USDC");

    // ───────────────────────────────────────────────────────────────────────────
    // Storage
    // ───────────────────────────────────────────────────────────────────────────

    /// Global, chain-specific configuration contract.
    SharedConfig public cfg;

    /// Per-UA routing config
    PayRoute public route;

    /// Map receiverSalt ⇒ relayer that performed fastFinish. Sentinel = ADDR_MAX
    /// when already claimed, 0x0 when open.
    mapping(bytes32 => address) public receiverFiller;

    /// Sandbox contract used to execute arbitrary swap calls. Deployed once per
    /// UA and immutable thereafter. All untrusted calls happen from within this
    /// contract so that malicious approvals cannot be set on the UA itself.
    DaimoPayExecutor public executor;

    // 45-word gap for upgrades
    uint256[45] private __gap;

    // ───────────────────────────────────────────────────────────────────────────
    // Initializer
    // ───────────────────────────────────────────────────────────────────────────

    /// @dev Called once by factory-deployed BeaconProxy.
    function initialize(SharedConfig _cfg, uint256 _toChainId, IERC20 _toCoin, address _toAddr, address _refundAddr)
        external
        initializer
    {
        __ReentrancyGuard_init();
        cfg = _cfg;
        route = PayRoute({toChainId: _toChainId, toCoin: _toCoin, toAddr: _toAddr, refundAddr: _refundAddr});
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
    /// @param inputToken  Token deposited by user (must be whitelisted).
    /// @param payOut           Amount that the beneficiary should ultimately
    ///                         receive on the destination chain.
    /// @param minBridgeOut     Minimum amount the canonical bridge must mint on
    ///                         the destination chain (bridger `minOut`).
    ///                         Must satisfy `payOut >= minBridgeOut`.
    /// @param userSalt    User-chosen randomness component for receiver
    ///                    address derivation.
    /// @param swapCallsIn   Sequence of on-chain calls that convert `inputToken → bridgeCoin`
    /// @param bridgeExtra Extra data passed straight to `DaimoPayBridger`.
    function start(
        IERC20 inputToken,
        IERC20 bridgeCoin,
        uint256 payOut,
        uint256 minBridgeOut,
        bytes32 userSalt,
        Call[] calldata swapCallsIn,
        bytes calldata bridgeExtra
    ) external nonReentrant whenNotPaused {
        // Ensure the chosen bridge coin is whitelisted
        require(cfg.whitelistedStable(address(bridgeCoin)), "UA: coin not whitelisted");
        require(cfg.whitelistedStable(address(inputToken)), "UA: token not whitelisted");

        uint256 balance = inputToken.balanceOf(address(this));
        require(balance > 0, "UA: no balance");
        require(payOut > 0 && payOut <= balance, "UA: invalid payOut");

        // Ensure caller-specified constraints are coherent.
        require(payOut >= minBridgeOut, "UA: payOut < minBridgeOut");

        // Enforce minimum chunk size to avoid griefing with tiny transfers.
        uint256 minAmt = balance < cfg.num(MIN_START_USDC_KEY) ? balance : cfg.num(MIN_START_USDC_KEY);
        require(payOut >= minAmt, "UA: payOut below minimum");

        // Only allow start on non-destination chains; same-chain transfers
        // should be handled via `claim()` for cleaner event semantics.
        require(block.chainid != route.toChainId, "UA: on destination chain");

        // Convert `payOut` of `inputToken` to the caller-specified bridge coin.
        _swapViaExecutor(inputToken, payOut, swapCallsIn, bridgeCoin, payOut, payable(msg.sender));

        // Deterministic BridgeReceiver address.
        bytes32 recvSalt = _receiverSalt(userSalt, payOut, bridgeCoin);
        address receiverAddr = _computeReceiverAddress(recvSalt, bridgeCoin);

        // Look up the UniversalAddressBridger wrapper.
        IUniversalAddressBridger bridger = IUniversalAddressBridger(cfg.addr(BRIDGER_KEY));
        require(address(bridger) != address(0), "UA: bridger missing");

        // Determine the required input asset and quantity for the bridge.
        (address tokenIn, uint256 exactIn) = bridger.quoteIn(route.toChainId, bridgeCoin, minBridgeOut);

        // Ensure the UA holds enough of the required token.
        require(TokenUtils.getBalanceOf(IERC20(tokenIn), address(this)) >= exactIn, "UA: insufficient bridger input");

        // Approve once and perform the bridge.
        IERC20(tokenIn).forceApprove(address(bridger), exactIn);
        bridger.bridge(route.toChainId, receiverAddr, bridgeCoin, minBridgeOut, bridgeExtra);

        emit Start(recvSalt, bridgeCoin, payOut, minBridgeOut, receiverAddr, route);
    }

    /// @notice Relayer-only function on DESTINATION chain: deliver funds early
    ///         and record entitlement to bridged USDC when it arrives.
    function fastFinish(uint256 bridgedAmount, bytes32 userSalt, IERC20 coin, Call[] calldata swapCalls)
        external
        nonReentrant
        whenNotPaused
    {
        require(block.chainid == route.toChainId, "UA: wrong chain");

        // Determine receiverSalt & ensure not already finished/claimed.
        bytes32 recvSalt = _receiverSalt(userSalt, bridgedAmount, coin);
        require(receiverFiller[recvSalt] == address(0), "UA: already finished");

        // Pull the bridged coin from the relayer to fund the swap / instant payout.
        coin.safeTransferFrom(msg.sender, address(this), bridgedAmount);

        // Swap to final token if needed and deliver to beneficiary.
        _swapViaExecutor(coin, bridgedAmount, swapCalls, route.toCoin, bridgedAmount, payable(msg.sender));
        TokenUtils.transfer({token: route.toCoin, recipient: payable(route.toAddr), amount: bridgedAmount});

        // Record relayer as filler.
        receiverFiller[recvSalt] = msg.sender;

        emit FastFinish(recvSalt, bridgedAmount, msg.sender);
    }

    /// @notice Complete the intent after the canonical bridge lands.
    function claim(uint256 payOut, uint256 minBridgeOut, bytes32 userSalt, IERC20 coin, Call[] calldata swapCallsDest)
        external
        nonReentrant
        whenNotPaused
    {
        require(block.chainid == route.toChainId, "UA: wrong chain");

        bytes32 recvSalt = _receiverSalt(userSalt, payOut, coin);
        address filler = receiverFiller[recvSalt];
        require(filler != ADDR_MAX, "UA: already claimed");

        // Deploy BridgeReceiver deterministically if not yet deployed, then
        // sweep USDC into this contract.
        address payable receiverAddr = _computeReceiverAddress(recvSalt, coin);
        if (receiverAddr.code.length == 0) {
            // Deploy minimal proxy that forwards tokens.
            new BridgeReceiver{salt: recvSalt}(coin);
        }

        // Determine how much actually arrived via the canonical bridge.
        uint256 bridged = coin.balanceOf(address(this));
        require(bridged >= minBridgeOut, "UA: underflow");

        // Distribute funds based on fast-finish status.
        if (filler == address(0)) {
            // No fastFinish; swap to final token if needed and deliver to beneficiary.
            if (address(coin) != address(route.toCoin)) {
                _swapViaExecutor(coin, bridged, swapCallsDest, route.toCoin, bridged, payable(msg.sender));
            }
            TokenUtils.transfer({token: route.toCoin, recipient: payable(route.toAddr), amount: bridged});
        } else {
            // Repay the relayer with the bridged coin.
            TokenUtils.transfer({token: coin, recipient: payable(filler), amount: bridged});
        }

        receiverFiller[recvSalt] = ADDR_MAX;
        emit Claim(recvSalt, coin, bridged, bridged);
    }

    /// @notice Sweep any non-whitelisted tokens back to user's refund address.
    function refund(IERC20[] calldata tokens) external nonReentrant whenNotPaused {
        uint256 n = tokens.length;
        for (uint256 i = 0; i < n; ++i) {
            IERC20 tok = tokens[i];
            require(!cfg.whitelistedStable(address(tok)), "UA: can't refund whitelisted coin");
            uint256 amt = TokenUtils.transferBalance({token: tok, recipient: payable(route.refundAddr)});
            emit Refund(address(tok), amt, route.refundAddr);
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Internal helpers
    // ───────────────────────────────────────────────────────────────────────────

    /// @notice Computes the salt for the BridgeReceiver that will be deployed via CREATE2 using `userSalt` and `amount`.
    /// @param userSalt The salt to use for the CREATE2 deployment.
    /// @param amount The amount of the token to check the balance of.
    /// @return salt The salt for the BridgeReceiver.
    function _receiverSalt(bytes32 userSalt, uint256 amount, IERC20 coin) internal view returns (bytes32) {
        return keccak256(abi.encodePacked("receiver", address(this), userSalt, amount, coin));
    }

    /// @notice Computes the deterministic address of the BridgeReceiver that will be deployed via CREATE2 using `salt`.
    /// @param salt The salt to use for the CREATE2 deployment.
    /// @return addr The address of the BridgeReceiver.
    function _computeReceiverAddress(bytes32 salt, IERC20 coin) internal view returns (address payable addr) {
        bytes memory initCode = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(coin));

        addr = payable(Create2.computeAddress(salt, keccak256(initCode)));
    }

    /// @notice Execute the provided swap calls in an isolated executor.
    /// @param inputToken      Token currently held by the UA that will be
    ///                        provided to the swap.
    /// @param inputAmount     Portion of the UA's balance to bridge. Must satisfy
    ///                        `inputAmount <= balance`.
    /// @param calls           Sequence of swap calls.
    /// @param requiredToken   Token that must be produced by the swap.
    /// @param requiredAmount  Minimum amount of `requiredToken` that must be
    ///                        returned to the UA.
    /// @param swapFunder      Address responsible for covering any deficit and
    ///                        recipient of surplus.
    function _swapViaExecutor(
        IERC20 inputToken,
        uint256 inputAmount,
        Call[] calldata calls,
        IERC20 requiredToken,
        uint256 requiredAmount,
        address payable swapFunder
    ) internal {
        // TODO: i think we can reuse the single executor using a permissionless wrapper
        DaimoPayExecutor exec = executor;
        if (address(exec) == address(0)) {
            exec = new DaimoPayExecutor(address(this));
            executor = exec;
        }

        // Ensure sufficient balance and transfer **only** `inputAmount` to the
        // executor so that it can perform the swap.
        require(TokenUtils.getBalanceOf(inputToken, address(this)) >= inputAmount, "UA: insufficient input bal");
        TokenUtils.transfer({token: inputToken, recipient: payable(address(exec)), amount: inputAmount});

        // Prepare the expected output array.
        TokenAmount[] memory expected = new TokenAmount[](1);
        expected[0] = TokenAmount({token: requiredToken, amount: requiredAmount});

        // Execute the swap inside the executor.
        exec.execute(calls, expected, payable(address(this)), swapFunder);

        uint256 afterBal = TokenUtils.getBalanceOf(requiredToken, address(this));

        if (afterBal < requiredAmount) {
            // Pull just enough to meet the requirement.
            uint256 deficit = requiredAmount - afterBal;
            requiredToken.safeTransferFrom(swapFunder, address(this), deficit);
        } else {
            // Refund any excess.
            uint256 surplus = afterBal - requiredAmount;
            if (surplus > 0) {
                TokenUtils.transfer({token: requiredToken, recipient: swapFunder, amount: surplus});
            }
        }
    }

    // ───────────────────────────────────────────────────────────────────────────
    // Events
    // ───────────────────────────────────────────────────────────────────────────

    event Start(
        bytes32 indexed salt, IERC20 coin, uint256 payOutCoin, uint256 minBridgeOut, address receiver, PayRoute route
    );
    event FastFinish(bytes32 indexed salt, uint256 amountDestTok, address indexed relayer);
    event Claim(bytes32 indexed salt, IERC20 coin, uint256 bridgedCoinAmt, uint256 repaidCoinAmt);
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
