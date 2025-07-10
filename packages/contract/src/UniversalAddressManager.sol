// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./SharedConfig.sol";
import "./UAIntentFactory.sol";
import "./UAIntent.sol";
import "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./interfaces/IUniversalAddressBridger.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Escrow contract that manages Universal Addresses,
///         acting as a single source of truth for all UA intents.
contract UniversalAddressManager is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

    /// Sentinel value used by receiverFiller to mark a transfer claimed.
    address public constant ADDR_MAX = 0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Factory responsible for deploying deterministic UAIntent proxies.
    UAIntentFactory public immutable intentFactory;

    /// Dedicated executor that performs swap / contract calls on behalf of the manager.
    DaimoPayExecutor public immutable executor;

    /// Multiplexer around IDaimoPayBridger adapters.
    IUniversalAddressBridger public immutable bridger;

    /// Global per-chain configuration (pause switch, whitelists, etc.)
    SharedConfig public immutable cfg;

    // Keys for SharedConfig
    bytes32 public constant MIN_START_USDC_KEY = keccak256("MIN_START_USDC");

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// On the source chain, record intents that have been started.
    mapping(address intentAddr => bool) public intentSent;

    /// Map receiverSalt ⇒ relayer that performed fastFinish (0 = open, ADDR_MAX = claimed)
    mapping(bytes32 => address) public receiverFiller;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event Start(address indexed intentAddr, UAIntent intent);
    event FastFinish(address indexed intentAddr, address indexed newRecipient);
    event Claim(address indexed intentAddr, address indexed finalRecipient);
    event IntentRefunded(
        address indexed intentAddr, address refundAddr, IERC20[] tokens, uint256[] amounts, UAIntent intent
    );
    event IntentFinished(address indexed intentAddr, address destinationAddr, bool success, UAIntent intent);

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(UAIntentFactory _intentFactory, IUniversalAddressBridger _bridger, SharedConfig _cfg) {
        intentFactory = _intentFactory;
        bridger = _bridger;
        cfg = _cfg;
        executor = new DaimoPayExecutor(address(this));
    }

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Begin a cross-chain transfer on the SOURCE chain.
    function startIntent(
        UAIntent calldata intent,
        IERC20 paymentToken,
        IERC20 bridgeToken,
        uint256 swapAmountOut,
        uint256 bridgeAmountOut,
        bytes32 userSalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant {
        require(block.chainid != intent.toChainId, "UAM: on destination chain");

        UAIntentContract intentContract = intentFactory.createIntent(intent, address(this));

        intentSent[address(intentContract)] = true;

        IERC20[] memory single = _wrap(paymentToken);
        intentContract.sendTokens({intent: intent, tokens: single, recipient: payable(address(this))});

        require(cfg.whitelistedStable(address(paymentToken)), "UAM: token not whitelisted");
        require(cfg.whitelistedStable(address(bridgeToken)), "UAM: coin not whitelisted");

        uint256 balance = paymentToken.balanceOf(address(this));
        require(balance > 0, "UAM: no balance");
        require(swapAmountOut > 0 && swapAmountOut <= balance, "UAM: invalid swapAmountOut");
        require(swapAmountOut >= bridgeAmountOut, "UAM: swapAmountOut < bridgeAmountOut");

        uint256 minAmt = balance < cfg.num(MIN_START_USDC_KEY) ? balance : cfg.num(MIN_START_USDC_KEY);
        require(swapAmountOut >= minAmt, "UAM: swapAmountOut below minimum");

        // Convert inputToken→bridgeCoin
        _swapViaExecutor(paymentToken, swapAmountOut, calls, bridgeToken, swapAmountOut, payable(msg.sender));

        // Deterministic BridgeReceiver address
        bytes32 recvSalt = _receiverSalt(address(intentContract), userSalt, swapAmountOut, bridgeToken);
        address receiverAddr = _computeReceiverAddress(recvSalt, bridgeToken);

        // Quote bridge input requirements.
        (address tokenIn, uint256 exactIn) = bridger.quoteIn(intent.toChainId, bridgeToken, bridgeAmountOut);
        require(TokenUtils.getBalanceOf(IERC20(tokenIn), address(this)) >= exactIn, "UAM: insufficient bridger input");

        IERC20(tokenIn).forceApprove(address(bridger), exactIn);
        bridger.bridge(intent.toChainId, receiverAddr, bridgeToken, bridgeAmountOut, bridgeExtraData);

        emit Start(address(intentContract), intent);
    }

    /// @notice Refund stray or double-paid tokens.
    function refundIntent(UAIntent calldata intent, IERC20[] calldata tokens) external nonReentrant {
        UAIntentContract intentContract = intentFactory.createIntent(intent, address(this));
        address intentAddr = address(intentContract);

        if (intent.toChainId != block.chainid) {
            require(intentSent[intentAddr], "UAM: not started");
        }

        // Disallow refunding whitelisted coins.
        uint256 n = tokens.length;
        for (uint256 i = 0; i < n; ++i) {
            require(!cfg.whitelistedStable(address(tokens[i])), "UAM: can't refund whitelisted coin");
        }

        uint256[] memory amounts =
            intentContract.sendTokens({intent: intent, tokens: tokens, recipient: payable(intent.refundAddress)});
        emit IntentRefunded(intentAddr, intent.refundAddress, tokens, amounts, intent);
    }

    // ---------------------------------------------------------------------
    // Relayer & claim flows
    // ---------------------------------------------------------------------

    /// Relayer-only DESTINATION-chain function: deliver funds early and record filling.
    function fastFinishIntent(
        UAIntent calldata intent,
        uint256 bridgedAmount,
        bytes32 userSalt,
        IERC20 coin,
        Call[] calldata swapCalls
    ) external nonReentrant {
        require(block.chainid == intent.toChainId, "UAM: wrong chain");

        bytes32 recvSalt =
            _receiverSalt(intentFactory.getIntentAddress(intent, address(this)), userSalt, bridgedAmount, coin);
        require(receiverFiller[recvSalt] == address(0), "UAM: already finished");

        // Pull bridged coins from relayer.
        coin.safeTransferFrom(msg.sender, address(this), bridgedAmount);

        // Swap to final token if needed and pay beneficiary.
        _swapViaExecutor(coin, bridgedAmount, swapCalls, intent.toToken, bridgedAmount, payable(msg.sender));
        TokenUtils.transfer({token: intent.toToken, recipient: payable(intent.toAddress), amount: bridgedAmount});

        receiverFiller[recvSalt] = msg.sender;
        address intentAddr = intentFactory.getIntentAddress(intent, address(this));
        emit FastFinish(intentAddr, msg.sender);
    }

    /// Complete after slow bridge lands
    function claimIntent(
        UAIntent calldata intent,
        uint256 swapAmountOut,
        uint256 bridgeAmountOut,
        bytes32 userSalt,
        IERC20 bridgeToken,
        Call[] calldata calls
    ) external nonReentrant {
        require(block.chainid == intent.toChainId, "UAM: wrong chain");

        bytes32 recvSalt = _receiverSalt(intentFactory.getIntentAddress(intent, address(this)), userSalt, swapAmountOut, bridgeToken);
        address filler = receiverFiller[recvSalt];
        require(filler != ADDR_MAX, "UAM: already claimed");

        // Deploy BridgeReceiver if necessary then sweep tokens.
        address payable receiverAddr = _computeReceiverAddress(recvSalt, bridgeToken);
        if (receiverAddr.code.length == 0) {
            new BridgeReceiver{salt: recvSalt}(bridgeToken);
        }

        uint256 bridged = bridgeToken.balanceOf(address(this));
        require(bridged >= bridgeAmountOut, "UAM: underflow");

        if (filler == address(0)) {
            // Normal path – no fast finish.
            if (address(bridgeToken) != address(intent.toToken)) {
                _swapViaExecutor(bridgeToken, bridged, calls, intent.toToken, bridged, payable(msg.sender));
            }
            TokenUtils.transfer({token: intent.toToken, recipient: payable(intent.toAddress), amount: bridged});
        } else {
            // Repay relayer.
            TokenUtils.transfer({token: bridgeToken, recipient: payable(filler), amount: bridged});
        }

        receiverFiller[recvSalt] = ADDR_MAX;
        UAIntentContract intentContract = intentFactory.createIntent(intent, address(this));
        address intentAddr = address(intentContract);
        address finalRec = filler == address(0) ? intent.toAddress : filler;
        emit Claim(intentAddr, finalRec);
    }

    // ---------------------------------------------------------------------
    // Internal receiver / executor helpers
    // ---------------------------------------------------------------------

    function _receiverSalt(address uaAddr, bytes32 userSalt, uint256 amount, IERC20 coin)
        internal
        pure
        returns (bytes32)
    {
        return keccak256(abi.encodePacked("receiver", uaAddr, userSalt, amount, coin));
    }

    function _computeReceiverAddress(bytes32 salt, IERC20 coin) internal view returns (address payable addr) {
        bytes memory initCode = abi.encodePacked(type(BridgeReceiver).creationCode, abi.encode(coin));
        addr = payable(Create2.computeAddress(salt, keccak256(initCode)));
    }

    function _swapViaExecutor(
        IERC20 inputToken,
        uint256 inputAmount,
        Call[] calldata calls,
        IERC20 requiredToken,
        uint256 requiredAmount,
        address payable swapFunder
    ) internal {
        // Ensure sufficient balance.
        require(TokenUtils.getBalanceOf(inputToken, address(this)) >= inputAmount, "UAM: insufficient bal");

        // Transfer exact amount to executor.
        TokenUtils.transfer({token: inputToken, recipient: payable(address(executor)), amount: inputAmount});

        TokenAmount[] memory expected = new TokenAmount[](1);
        expected[0] = TokenAmount({token: requiredToken, amount: requiredAmount});

        executor.execute(calls, expected, payable(address(this)), swapFunder);

        uint256 afterBal = TokenUtils.getBalanceOf(requiredToken, address(this));
        if (afterBal < requiredAmount) {
            uint256 deficit = requiredAmount - afterBal;
            requiredToken.safeTransferFrom(swapFunder, address(this), deficit);
        } else {
            uint256 surplus = afterBal - requiredAmount;
            if (surplus > 0) {
                TokenUtils.transfer({token: requiredToken, recipient: swapFunder, amount: surplus});
            }
        }
    }

    function _swapToDestTokenAndReturn(UAIntent calldata intent, Call[] calldata calls, address payable recipient)
        internal
    {
        TokenAmount[] memory expected = new TokenAmount[](1);
        // TODO: i'm not sure if we can safely allow the relayer to specify the output amount
        // but i don't like how we hardcode it here
        expected[0] = TokenAmount({token: intent.toToken, amount: 1});
        executor.execute({
            calls: calls,
            expectedOutput: expected,
            recipient: recipient,
            surplusRecipient: payable(msg.sender)
        });
    }

    function _finishIntent(address intentAddr, UAIntent calldata intent, Call[] calldata calls) internal {
        TokenAmount[] memory expected = new TokenAmount[](1);
        expected[0] = TokenAmount({token: intent.toToken, amount: 1});
        executor.execute({
            calls: calls,
            expectedOutput: expected,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        bool success =
            TokenUtils.tryTransfer({token: intent.toToken, recipient: intent.toAddress, amount: expected[0].amount});
        TokenUtils.transferBalance({token: intent.toToken, recipient: payable(intent.refundAddress)});

        emit IntentFinished(intentAddr, intent.toAddress, success, intent);
    }

    function _wrap(IERC20 tok) internal pure returns (IERC20[] memory arr) {
        arr = new IERC20[](1);
        arr[0] = tok;
    }

    // Accept native asset deposits (for swaps).
    receive() external payable {}
}

// ---------------------------------------------------------------------
// Minimal deterministic receiver
// ---------------------------------------------------------------------

contract BridgeReceiver {
    using SafeERC20 for IERC20;

    constructor(IERC20 _token) {
        address payable ua = payable(msg.sender);
        uint256 bal = TokenUtils.getBalanceOf(_token, address(this));
        TokenUtils.transfer({token: _token, recipient: ua, amount: bal});
        selfdestruct(ua);
    }
}
