// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./DepositAddressFactory.sol";
import "./DepositAddress.sol";
import "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./SwapMath.sol";
import "./interfaces/IDaimoPayBridger.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Central escrow contract that manages the lifecycle of Deposit
///         Addresses
contract DepositAddressManager is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

    /// Sentinel value used to mark a transfer claimed.
    address public constant ADDR_MAX =
        0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF;

    /// Factory responsible for deploying deterministic Deposit Addresses.
    DepositAddressFactory public depositAddressFactory;

    /// Dedicated contract that performs swap / contract calls on behalf of the
    /// manager.
    DaimoPayExecutor public executor;

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    /// Authorized relayer addresses.
    mapping(address relayer => bool authorized) public relayerAuthorized;

    /// On the source chain, record fulfillment addresses that have been used.
    mapping(address fulfillment => bool used) public fulfillmentUsed;

    /// On the destination chain, map fulfillment address to status:
    /// - address(0) = not finished.
    /// - Relayer address = fast-finished, awaiting claim to repay relayer.
    /// - ADDR_MAX = claimed. any additional funds received are refunded.
    mapping(address fulfillment => address recipient)
        public fulfillmentToRecipient;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event RelayerAuthorized(address indexed relayer, bool authorized);

    event Start(
        address indexed depositAddress,
        address indexed fulfillmentAddress,
        DAParams params,
        DAFulfillmentParams fulfillment,
        address paymentToken,
        uint256 paymentAmount,
        uint256 paymentTokenPriceUsd,
        uint256 bridgeTokenInPriceUsd
    );
    event FastFinish(
        address indexed depositAddress,
        address indexed fulfillmentAddress,
        address indexed newRecipient,
        DAParams params,
        DAFulfillmentParams fulfillment,
        uint256 outputAmount,
        uint256 bridgeTokenOutPriceUsd,
        uint256 toTokenPriceUsd
    );
    event Claim(
        address indexed depositAddress,
        address indexed fulfillmentAddress,
        address indexed finalRecipient,
        DAParams params,
        DAFulfillmentParams fulfillment,
        uint256 outputAmount,
        uint256 bridgeTokenOutPriceUsd,
        uint256 toTokenPriceUsd
    );
    event SameChainFinish(
        address indexed depositAddress,
        DAParams params,
        address paymentToken,
        uint256 paymentAmount,
        uint256 outputAmount,
        uint256 paymentTokenPriceUsd,
        uint256 toTokenPriceUsd
    );
    event FinalCallExecuted(
        address indexed depositAddress,
        address indexed target,
        bool success
    );
    event HopStart(
        address indexed depositAddress,
        address indexed fulfillmentAddress,
        DAParams params,
        DAFulfillmentParams fulfillment,
        uint256 bridgedAmount,
        uint256 leg1BridgeTokenOutPriceUsd,
        uint256 leg2BridgeTokenInPriceUsd
    );
    event RefundDepositAddress(
        address indexed depositAddress,
        DAParams params,
        address refundAddress,
        IERC20[] tokens,
        uint256[] amounts
    );
    event RefundFulfillment(
        address indexed depositAddress,
        address indexed fulfillmentAddress,
        DAParams params,
        DAFulfillmentParams fulfillment,
        address refundAddress,
        IERC20[] tokens,
        uint256[] amounts
    );

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    /// @dev Only allow designated relayers to call certain functions.
    modifier onlyRelayer() {
        require(relayerAuthorized[msg.sender], "DAM: not relayer");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /// @notice Initialize the contract.
    constructor(
        address _owner,
        DepositAddressFactory _depositAddressFactory,
        DaimoPayExecutor _executor
    ) Ownable(_owner) {
        depositAddressFactory = _depositAddressFactory;
        executor = _executor;
    }

    // Accept native asset deposits (for swaps).
    receive() external payable {}

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Initiates a cross-chain transfer by pulling funds from the
    ///         deposit address, executing swaps if needed, and initiating a
    ///         bridge transfer to the destination chain.
    /// @dev Must be called on the source chain. Creates a deterministic
    ///      fulfillment address on the destination chain and bridges the
    ///      specified token amount to it.
    /// @param params          The cross-chain params containing destination
    ///                        chain, recipient, and token details
    /// @param paymentToken    The token the user paid the deposit address.
    /// @param bridgeTokenOut  The token and amount to be bridged to the
    ///                        destination chain
    /// @param relaySalt       Unique salt provided by the relayer to generate
    ///                        a unique fulfillment address
    /// @param calls           Optional swap calls to convert payment token to
    ///                        required bridge input token
    /// @param bridgeExtraData Additional data required by the specific bridge
    ///                        implementation
    function start(
        DAParams calldata params,
        IERC20 paymentToken,
        TokenAmount calldata bridgeTokenOut,
        PriceData calldata paymentTokenPrice,
        PriceData calldata bridgeTokenInPrice,
        bytes32 relaySalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant onlyRelayer {
        require(block.chainid != params.toChainId, "DAM: start on dest chain");
        require(params.escrow == address(this), "DAM: wrong escrow");
        require(!isDAExpired(params), "DAM: expired");

        bool paymentTokenPriceValid = params.pricer.validatePrice(
            paymentTokenPrice
        );
        bool bridgeTokenInPriceValid = params.pricer.validatePrice(
            bridgeTokenInPrice
        );
        require(paymentTokenPriceValid, "DAM: payment price invalid");
        require(bridgeTokenInPriceValid, "DAM: bridge price invalid");
        require(
            paymentTokenPrice.token == address(paymentToken),
            "DAM: payment token mismatch"
        );

        // Deploy (or fetch) deposit address
        DepositAddress da = depositAddressFactory.createDepositAddress(params);

        DAFulfillmentParams memory fulfillment = DAFulfillmentParams({
            depositAddress: address(da),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: block.chainid
        });
        (address fulfillmentAddress, ) = computeFulfillmentAddress(fulfillment);

        // Generate a unique fulfillment address for each bridge transfer.
        // Without this check, a malicious relayer could reuse the same
        // fulfillment address to claim multiple bridge transfers, double-paying
        // themselves.
        require(!fulfillmentUsed[fulfillmentAddress], "DAM: fulfillment used");
        // Mark the fulfillment address as used to prevent double-processing
        fulfillmentUsed[fulfillmentAddress] = true;

        // Quote bridge input requirements.
        (address bridgeTokenIn, uint256 inAmount) = params
            .bridger
            .getBridgeTokenIn({
                toChainId: params.toChainId,
                bridgeTokenOut: bridgeTokenOut
            });
        require(
            bridgeTokenIn == address(bridgeTokenInPrice.token),
            "DAM: bridge token mismatch"
        );

        // Send payment token to executor
        uint256 paymentAmount = da.sendBalance({
            params: params,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Validate the inAmount is above the minimum output required by the
        // swap.
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: bridgeTokenInPrice,
            sellAmount: paymentAmount,
            maxSlippage: params.maxStartSlippageBps
        });
        require(inAmount >= minSwapOutput.amount, "DAM: bridge input low");

        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary.
        // The executor contract checks that the output is sufficient. Any
        // surplus tokens are given to the relayer.
        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: IERC20(bridgeTokenIn),
            amount: inAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        // Approve bridger and initiate bridging
        IERC20(bridgeTokenIn).forceApprove({
            spender: address(params.bridger),
            value: inAmount
        });
        params.bridger.sendToChain({
            toChainId: params.toChainId,
            toAddress: fulfillmentAddress,
            bridgeTokenOut: bridgeTokenOut,
            refundAddress: params.refundAddress,
            extraData: bridgeExtraData
        });

        emit Start({
            depositAddress: address(da),
            fulfillmentAddress: fulfillmentAddress,
            params: params,
            fulfillment: fulfillment,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount,
            paymentTokenPriceUsd: paymentTokenPrice.priceUsd,
            bridgeTokenInPriceUsd: bridgeTokenInPrice.priceUsd
        });
    }

    /// @notice Send funds that are already on the destination chain.
    ///
    /// @param params       The DAParams for the deposit address
    /// @param paymentToken Token to be used to pay the deposit address
    /// @param calls        Arbitrary swap calls to be executed by the executor
    ///                     Can be empty when assets are already `toToken`
    function sameChainFinish(
        DAParams calldata params,
        IERC20 paymentToken,
        PriceData calldata paymentTokenPrice,
        PriceData calldata toTokenPrice,
        Call[] calldata calls
    ) external nonReentrant onlyRelayer {
        require(params.toChainId == block.chainid, "DAM: wrong chain");
        require(params.escrow == address(this), "DAM: wrong escrow");
        require(!isDAExpired(params), "DAM: expired");

        bool paymentTokenPriceValid = params.pricer.validatePrice(
            paymentTokenPrice
        );
        bool toTokenPriceValid = params.pricer.validatePrice(toTokenPrice);
        require(paymentTokenPriceValid, "DAM: payment price invalid");
        require(toTokenPriceValid, "DAM: toToken price invalid");
        require(
            paymentTokenPrice.token == address(paymentToken),
            "DAM: payment token mismatch"
        );
        require(
            toTokenPrice.token == address(params.toToken),
            "DAM: toToken mismatch"
        );

        // Deploy (or fetch) the Deposit Address for this params.
        DepositAddress da = depositAddressFactory.createDepositAddress(params);

        // Pull specified token balances from the da into the executor.
        uint256 paymentAmount = da.sendBalance({
            params: params,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Compute the minimum amount of toToken the user should receive.
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: toTokenPrice,
            sellAmount: paymentAmount,
            maxSlippage: params.maxSameChainFinishSlippageBps
        });

        // Finish the fulfillment and return any leftover tokens to the caller
        uint256 outputAmount = _finishFulfillment({
            depositAddress: address(da),
            params: params,
            calls: calls,
            minOutputAmount: minSwapOutput.amount
        });

        emit SameChainFinish({
            depositAddress: address(da),
            params: params,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount,
            outputAmount: outputAmount,
            paymentTokenPriceUsd: paymentTokenPrice.priceUsd,
            toTokenPriceUsd: toTokenPrice.priceUsd
        });
    }

    /// @notice Allows a relayer to deliver funds early on the destination chain
    ///         before the bridge transfer completes.
    /// @dev Must be called on the destination chain. The relayer sends their
    ///      own funds to complete the fulfillment atomically before calling
    ///      fastFinish, and is recorded as the recipient for the eventual
    ///      bridged tokens.
    /// @param params          The DAParams for the deposit address
    /// @param calls           Arbitrary swap calls to be executed by the executor
    /// @param token           The token sent by the relayer
    /// @param bridgeTokenOut  The token and amount expected from the bridge
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    function fastFinish(
        DAParams calldata params,
        Call[] calldata calls,
        IERC20 token,
        PriceData calldata bridgeTokenOutPrice,
        PriceData calldata toTokenPrice,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant onlyRelayer {
        require(sourceChainId != block.chainid, "DAM: same chain finish");
        require(params.toChainId == block.chainid, "DAM: wrong chain");
        require(params.escrow == address(this), "DAM: wrong escrow");
        require(!isDAExpired(params), "DAM: expired");

        bool bridgeTokenOutPriceValid = params.pricer.validatePrice(
            bridgeTokenOutPrice
        );
        bool toTokenPriceValid = params.pricer.validatePrice(toTokenPrice);
        require(bridgeTokenOutPriceValid, "DAM: bridgeTokenOut price invalid");
        require(toTokenPriceValid, "DAM: toToken price invalid");
        require(
            bridgeTokenOutPrice.token == address(bridgeTokenOut.token),
            "DAM: bridgeTokenOut mismatch"
        );
        require(
            toTokenPrice.token == address(params.toToken),
            "DAM: toToken mismatch"
        );

        // Calculate salt for this bridge transfer.
        address da = depositAddressFactory.getDepositAddress(params);
        DAFulfillmentParams memory fulfillment = DAFulfillmentParams({
            depositAddress: da,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: sourceChainId
        });
        (address fulfillmentAddress, ) = computeFulfillmentAddress(fulfillment);

        // Check that the salt hasn't already been fast finished or claimed.
        require(
            fulfillmentToRecipient[fulfillmentAddress] == address(0),
            "DAM: already finished"
        );
        // Record relayer as new recipient when the bridged tokens arrive
        fulfillmentToRecipient[fulfillmentAddress] = msg.sender;

        // Finish the fulfillment and return any leftover tokens to the caller
        TokenUtils.transferBalance({
            token: token,
            recipient: payable(address(executor))
        });
        TokenAmount memory toTokenAmount = SwapMath.computeMinSwapOutput({
            sellTokenPrice: bridgeTokenOutPrice,
            buyTokenPrice: toTokenPrice,
            sellAmount: bridgeTokenOut.amount,
            maxSlippage: params.maxFastFinishSlippageBps
        });
        uint256 outputAmount = _finishFulfillment({
            depositAddress: da,
            params: params,
            calls: calls,
            minOutputAmount: toTokenAmount.amount
        });

        emit FastFinish({
            depositAddress: da,
            fulfillmentAddress: fulfillmentAddress,
            newRecipient: msg.sender,
            params: params,
            fulfillment: fulfillment,
            outputAmount: outputAmount,
            bridgeTokenOutPriceUsd: bridgeTokenOutPrice.priceUsd,
            toTokenPriceUsd: toTokenPrice.priceUsd
        });
    }

    /// @notice Completes a fulfillment after bridged tokens arrive on the
    ///         destination chain, either repaying a relayer or finishing the
    ///         fulfillment directly.
    /// @param params          The DAParams for the deposit address
    /// @param calls           Arbitrary swap from bridgeTokenOut to toToken
    /// @param bridgeTokenOut  The token and amount that was bridged
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    function claim(
        DAParams calldata params,
        Call[] calldata calls,
        TokenAmount calldata bridgeTokenOut,
        PriceData calldata bridgeTokenOutPrice,
        PriceData calldata toTokenPrice,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant onlyRelayer {
        require(params.toChainId == block.chainid, "DAM: wrong chain");
        require(params.escrow == address(this), "DAM: wrong escrow");

        // Calculate salt for this bridge transfer.
        address da = depositAddressFactory.getDepositAddress(params);
        DAFulfillmentParams memory fulfillment = DAFulfillmentParams({
            depositAddress: da,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: sourceChainId
        });
        (address fulfillmentAddress, ) = computeFulfillmentAddress(fulfillment);

        // Check the recipient for this fulfillment.
        address recipient = fulfillmentToRecipient[fulfillmentAddress];
        require(recipient != ADDR_MAX, "DAM: already claimed");
        // Mark fulfillment as claimed
        fulfillmentToRecipient[fulfillmentAddress] = ADDR_MAX;

        // Deploy fulfillment and pull bridged tokens
        uint256 bridgedAmount;
        (fulfillmentAddress, bridgedAmount) = _deployAndPullFromFulfillment(
            fulfillment,
            bridgeTokenOut.token
        );

        uint256 outputAmount = 0;
        if (recipient == address(0)) {
            // Validate prices
            bool bridgeTokenOutPriceValid = params.pricer.validatePrice(
                bridgeTokenOutPrice
            );
            bool toTokenPriceValid = params.pricer.validatePrice(toTokenPrice);
            require(
                bridgeTokenOutPriceValid,
                "DAM: bridgeTokenOut price invalid"
            );
            require(toTokenPriceValid, "DAM: toToken price invalid");
            require(
                bridgeTokenOutPrice.token == address(bridgeTokenOut.token),
                "DAM: bridgeTokenOut mismatch"
            );
            require(
                toTokenPrice.token == address(params.toToken),
                "DAM: toToken mismatch"
            );

            // No relayer showed up, so complete the fulfillment. Update the
            // recipient to the params's recipient.
            recipient = params.toAddress;

            // Send tokens to the executor contract to run relayer-provided
            // calls in _finishFulfillment.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(address(executor)),
                amount: bridgedAmount
            });

            // Compute the minimum amount of toToken that is required to
            // complete the fulfillment. This uses the promised bridgeTokenOut,
            // even if the actual bridgedAmount is slightly less.
            TokenAmount memory toTokenAmount = SwapMath.computeMinSwapOutput({
                sellTokenPrice: bridgeTokenOutPrice,
                buyTokenPrice: toTokenPrice,
                sellAmount: bridgeTokenOut.amount,
                maxSlippage: params.maxFastFinishSlippageBps
            });

            // Finish the fulfillment and return any leftover tokens to the caller
            outputAmount = _finishFulfillment({
                depositAddress: da,
                params: params,
                calls: calls,
                minOutputAmount: toTokenAmount.amount
            });
        } else {
            // Otherwise, the relayer fastFinished the fulfillment. Repay them.
            TokenUtils.transfer({
                token: bridgeTokenOut.token,
                recipient: payable(recipient),
                amount: bridgedAmount
            });
            outputAmount = bridgedAmount;
        }

        emit Claim({
            depositAddress: da,
            fulfillmentAddress: fulfillmentAddress,
            finalRecipient: recipient,
            params: params,
            fulfillment: fulfillment,
            outputAmount: outputAmount,
            bridgeTokenOutPriceUsd: bridgeTokenOutPrice.priceUsd,
            toTokenPriceUsd: toTokenPrice.priceUsd
        });
    }

    /// @notice Continues a multi-hop transfer by pulling funds from a hop chain
    ///         fulfillment and bridging to the final destination chain.
    /// @dev Must be called on the hop chain. Pulls funds from the fulfillment
    ///      created by the source→hop leg, then initiates hop→dest bridge.
    /// @param params              The DAParams for the intent
    /// @param leg1BridgeTokenOut  Token and amount that was bridged in leg 1
    ///                            (source → hop)
    /// @param leg1SourceChainId   Source chain ID for leg 1
    /// @param leg1BridgeTokenOutPrice Price data for leg 1 bridge token out
    /// @param leg2BridgeTokenOut      Token and amount to bridge in leg 2 (hop → dest)
    /// @param leg2BridgeTokenInPrice  Price data for leg 2 bridge token in
    /// @param relaySalt           Unique salt provided by the relayer to generate
    ///                            a unique fulfillment address. Shared between
    ///                            leg 1 and leg 2.
    /// @param calls               Swap calls to convert leg 1 token to leg 2
    ///                            bridge input token
    /// @param bridgeExtraData     Additional data for the hop → dest bridge
    function hopStart(
        DAParams calldata params,
        TokenAmount calldata leg1BridgeTokenOut,
        uint256 leg1SourceChainId,
        PriceData calldata leg1BridgeTokenOutPrice,
        TokenAmount calldata leg2BridgeTokenOut,
        PriceData calldata leg2BridgeTokenInPrice,
        bytes32 relaySalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant onlyRelayer {
        // Must be on hop chain (not source, not dest)
        require(block.chainid != leg1SourceChainId, "DAM: hop on source chain");
        require(block.chainid != params.toChainId, "DAM: hop on dest chain");
        require(params.escrow == address(this), "DAM: wrong escrow");

        // Validate prices
        bool leg1PriceValid = params.pricer.validatePrice(
            leg1BridgeTokenOutPrice
        );
        bool leg2PriceValid = params.pricer.validatePrice(
            leg2BridgeTokenInPrice
        );
        require(leg1PriceValid, "DAM: leg1 price invalid");
        require(leg2PriceValid, "DAM: leg2 price invalid");
        require(
            leg1BridgeTokenOutPrice.token == address(leg1BridgeTokenOut.token),
            "DAM: leg1 bridge token mismatch"
        );

        // Compute the shared fulfillment address
        address depositAddress = depositAddressFactory.getDepositAddress(
            params
        );
        DAFulfillmentParams memory fulfillment = DAFulfillmentParams({
            depositAddress: depositAddress,
            relaySalt: relaySalt,
            // Use the same params that were originally used to start leg 1
            // to compute the same fulfillment address
            bridgeTokenOut: leg2BridgeTokenOut,
            sourceChainId: leg1SourceChainId
        });
        (address fulfillmentAddress, ) = computeFulfillmentAddress(fulfillment);

        // Check that the fulfillment hasn't been claimed already
        address recipient = fulfillmentToRecipient[fulfillmentAddress];
        require(recipient != ADDR_MAX, "DAM: already claimed");
        // Mark as claimed to prevent double-processing
        fulfillmentToRecipient[fulfillmentAddress] = ADDR_MAX;

        // Deploy fulfillment and pull funds
        uint256 bridgedAmount;
        (fulfillmentAddress, bridgedAmount) = _deployAndPullFromFulfillment(
            fulfillment,
            leg1BridgeTokenOut.token
        );

        // Ensure the fulfillment hasn't been used
        require(!fulfillmentUsed[fulfillmentAddress], "DAM: fulfillment used");
        fulfillmentUsed[fulfillmentAddress] = true;

        // Get bridge input requirements for leg 2
        (address bridgeTokenIn, uint256 inAmount) = params
            .bridger
            .getBridgeTokenIn({
                toChainId: params.toChainId,
                bridgeTokenOut: leg2BridgeTokenOut
            });
        require(
            bridgeTokenIn == address(leg2BridgeTokenInPrice.token),
            "DAM: bridge token mismatch"
        );

        // Validate swap output meets minimum requirements
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: leg1BridgeTokenOutPrice,
            buyTokenPrice: leg2BridgeTokenInPrice,
            sellAmount: leg1BridgeTokenOut.amount,
            maxSlippage: params.maxStartSlippageBps
        });
        require(inAmount >= minSwapOutput.amount, "DAM: bridge input low");

        // Send to executor, run swap calls, get bridge input
        TokenUtils.transfer({
            token: leg1BridgeTokenOut.token,
            recipient: payable(address(executor)),
            amount: bridgedAmount
        });

        TokenAmount[] memory expectedOutput = new TokenAmount[](1);
        expectedOutput[0] = TokenAmount({
            token: IERC20(bridgeTokenIn),
            amount: inAmount
        });
        executor.execute({
            calls: calls,
            expectedOutput: expectedOutput,
            recipient: payable(address(this)),
            surplusRecipient: payable(msg.sender)
        });

        // Approve bridger and initiate leg 2 bridge
        IERC20(bridgeTokenIn).forceApprove({
            spender: address(params.bridger),
            value: inAmount
        });
        params.bridger.sendToChain({
            toChainId: params.toChainId,
            toAddress: fulfillmentAddress,
            bridgeTokenOut: leg2BridgeTokenOut,
            refundAddress: params.refundAddress,
            extraData: bridgeExtraData
        });

        emit HopStart({
            depositAddress: depositAddress,
            fulfillmentAddress: fulfillmentAddress,
            params: params,
            fulfillment: fulfillment,
            bridgedAmount: bridgedAmount,
            leg1BridgeTokenOutPriceUsd: leg1BridgeTokenOutPrice.priceUsd,
            leg2BridgeTokenInPriceUsd: leg2BridgeTokenInPrice.priceUsd
        });
    }

    /// @notice Refunds tokens from a deposit address to its designated
    ///         refund address after the deposit address has expired.
    /// @param params The Deposit Address params containing the refund address
    /// @param tokens The tokens to refund from the deposit address
    /// @dev Refunds are only allowed after the deposit address expires
    function refundDepositAddress(
        DAParams calldata params,
        IERC20[] calldata tokens
    ) external nonReentrant {
        require(params.escrow == address(this), "DAM: wrong escrow");
        require(isDAExpired(params), "DAM: not expired");

        // Deploy (or fetch) the Deposit Address for this params
        DepositAddress da = depositAddressFactory.createDepositAddress(params);

        // Send refund to the designated refund address
        uint256[] memory amounts = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; ++i) {
            amounts[i] = da.sendBalance({
                params: params,
                token: tokens[i],
                recipient: payable(params.refundAddress)
            });
        }

        emit RefundDepositAddress({
            depositAddress: address(da),
            params: params,
            refundAddress: params.refundAddress,
            tokens: tokens,
            amounts: amounts
        });
    }

    /// @notice Refunds tokens from a fulfillment address to the designated
    ///         refund address after the params has expired.
    /// @param params The Deposit Address params containing the refund address
    /// @param bridgeTokenOut The token and amount that was bridged (used to
    ///        compute fulfillment address)
    /// @param relaySalt Unique salt from the original bridge transfer
    /// @param sourceChainId The chain ID where the bridge transfer originated
    /// @param tokens The tokens to refund from the fulfillment
    /// @dev Refunds are only allowed after the params expires. This allows
    ///      recovery of bridged funds that were never claimed or fast-finished.
    function refundFulfillment(
        DAParams calldata params,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId,
        IERC20[] calldata tokens
    ) external nonReentrant onlyRelayer {
        require(params.escrow == address(this), "DAM: wrong escrow");
        require(isDAExpired(params), "DAM: not expired");

        // Compute the fulfillment address for this fulfillment
        address da = depositAddressFactory.getDepositAddress(params);
        DAFulfillmentParams memory fulfillment = DAFulfillmentParams({
            depositAddress: da,
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: sourceChainId
        });

        // Pull and transfer each token to the refund address
        address fulfillmentAddress;
        uint256[] memory amounts = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; ++i) {
            (fulfillmentAddress, amounts[i]) = _deployAndPullFromFulfillment(
                fulfillment,
                tokens[i]
            );
            TokenUtils.transfer({
                token: tokens[i],
                recipient: payable(params.refundAddress),
                amount: amounts[i]
            });
        }

        emit RefundFulfillment({
            depositAddress: da,
            fulfillmentAddress: fulfillmentAddress,
            params: params,
            fulfillment: fulfillment,
            refundAddress: params.refundAddress,
            tokens: tokens,
            amounts: amounts
        });
    }

    /// @notice Computes a deterministic DAFulfillment address.
    /// @param fulfillment The bridge fulfillment
    /// @return addr The computed address for the DAFulfillment contract
    /// @return relaySalt The CREATE2 salt used to deploy the DAFulfillment
    function computeFulfillmentAddress(
        DAFulfillmentParams memory fulfillment
    ) public view returns (address payable addr, bytes32 relaySalt) {
        relaySalt = keccak256(abi.encode(fulfillment));
        bytes memory initCode = type(DAFulfillment).creationCode;
        addr = payable(Create2.computeAddress(relaySalt, keccak256(initCode)));
    }

    /// @notice Checks if a Deposit Address params has expired.
    /// @param params The Deposit Address params to check
    /// @return true if the params has expired, false otherwise
    function isDAExpired(DAParams calldata params) public view returns (bool) {
        return block.timestamp >= params.expiresAt;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Deploy a DAFulfillment if necessary and pull funds.
    /// @param fulfillment The fulfillment params used to compute fulfillment
    ///                    address
    /// @param token The token to pull from the fulfillment
    /// @return fulfillmentAddress The fulfillment contract address
    /// @return pulledAmount The amount pulled from the fulfillment
    function _deployAndPullFromFulfillment(
        DAFulfillmentParams memory fulfillment,
        IERC20 token
    ) internal returns (address fulfillmentAddress, uint256 pulledAmount) {
        bytes32 relaySalt;
        (fulfillmentAddress, relaySalt) = computeFulfillmentAddress(
            fulfillment
        );

        // Deploy fulfillment contract if necessary
        DAFulfillment fulfillmentContract;
        if (fulfillmentAddress.code.length == 0) {
            fulfillmentContract = new DAFulfillment{salt: relaySalt}();
            require(
                fulfillmentAddress == address(fulfillmentContract),
                "DAM: fulfillment"
            );
        } else {
            fulfillmentContract = DAFulfillment(payable(fulfillmentAddress));
        }

        // Pull funds from the fulfillment contract
        pulledAmount = fulfillmentContract.pull(token);
    }

    /// @dev Internal helper that completes a fulfillment by executing swaps,
    ///      delivering toToken to the recipient, and handling any surplus.
    ///      If the params has a finalCall, executes the call after swapping.
    ///      Precondition: input tokens must already be in PayExecutor.
    /// @param depositAddress   The deposit address for this fulfillment (for events)
    /// @param params           The DAParams containing
    ///                         recipient details and optional finalCall
    /// @param calls            Arbitrary swap calls to be executed by the
    ///                         executor
    /// @param minOutputAmount  The minimum amount of target token to deliver to
    ///                         the recipient
    function _finishFulfillment(
        address depositAddress,
        DAParams calldata params,
        Call[] calldata calls,
        uint256 minOutputAmount
    ) internal returns (uint256 outputAmount) {
        if (params.finalCallData.length > 0) {
            // Swap and keep tokens in executor for final call
            outputAmount = executor.executeAndSendBalance({
                calls: calls,
                minOutputAmount: TokenAmount({
                    token: params.toToken,
                    amount: minOutputAmount
                }),
                recipient: payable(address(executor))
            });

            // Execute final call - approves token to toAddress and calls it
            bool success = executor.executeFinalCall({
                finalCall: Call({
                    to: params.toAddress,
                    value: 0,
                    data: params.finalCallData
                }),
                finalCallToken: TokenAmount({
                    token: params.toToken,
                    amount: outputAmount
                }),
                refundAddr: payable(params.refundAddress)
            });

            emit FinalCallExecuted(depositAddress, params.toAddress, success);
        } else {
            // No final call - send directly to recipient
            outputAmount = executor.executeAndSendBalance({
                calls: calls,
                minOutputAmount: TokenAmount({
                    token: params.toToken,
                    amount: minOutputAmount
                }),
                recipient: payable(params.toAddress)
            });
        }
    }

    // ---------------------------------------------------------------------
    // Admin functions
    // ---------------------------------------------------------------------

    /// @notice Set the authorized relayer address.
    /// @param relayer The address of the new relayer
    /// @param authorized Whether the relayer is authorized
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        relayerAuthorized[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }
}

// ---------------------------------------------------------------------
// Minimal deterministic fulfillment
// ---------------------------------------------------------------------

/// @notice Minimal deterministic contract that receives bridged tokens and
///         allows the Deposit Address Manager to sweep them.
/// @dev Deployed via CREATE2 using a salt that encodes bridge transfer
///      parameters into the deployment address, creating predictable addresses
///      that are unique to each bridge transfer. Only the deploying manager
///      can pull funds from this contract.
contract DAFulfillment {
    using SafeERC20 for IERC20;

    /// @notice Address allowed to pull funds from this contract
    address payable public immutable depositAddressManager;

    constructor() {
        depositAddressManager = payable(msg.sender);

        // Emit event for any ETH that arrived before deployment
        if (address(this).balance > 0) {
            emit NativeTransfer(
                address(0),
                address(this),
                address(this).balance
            );
        }
    }

    // Accept native asset deposits.
    receive() external payable {
        emit NativeTransfer(msg.sender, address(this), msg.value);
    }

    /// @notice Sweep entire balance of `token` (ERC20 or native when
    ///         token == IERC20(address(0))) to the deployer address.
    /// @return amount The amount of tokens pulled
    function pull(IERC20 token) external returns (uint256) {
        require(msg.sender == depositAddressManager, "BR: not authorized");
        return
            TokenUtils.transferBalance({
                token: token,
                recipient: depositAddressManager
            });
    }
}
