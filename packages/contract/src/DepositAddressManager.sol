// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
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

    /// On the source chain, record receiver addresses that have been used.
    mapping(address receiver => bool used) public receiverUsed;

    /// On the destination chain, map receiver address to status:
    /// - address(0) = not finished.
    /// - Relayer address = fast-finished, awaiting claim to repay relayer.
    /// - ADDR_MAX = claimed. any additional funds received are refunded.
    mapping(address receiver => address recipient) public receiverToRecipient;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event RelayerAuthorized(address indexed relayer, bool authorized);

    event Start(
        address indexed depositAddress,
        address indexed receiverAddress,
        DepositAddressRoute route,
        DepositAddressFulfillment fulfillment,
        address paymentToken,
        uint256 paymentAmount,
        uint256 paymentTokenPriceUsd,
        uint256 bridgeTokenInPriceUsd
    );
    event FastFinish(
        address indexed depositAddress,
        address indexed receiverAddress,
        address indexed newRecipient,
        DepositAddressRoute route,
        DepositAddressFulfillment fulfillment,
        uint256 outputAmount,
        uint256 bridgeTokenOutPriceUsd,
        uint256 toTokenPriceUsd
    );
    event Claim(
        address indexed depositAddress,
        address indexed receiverAddress,
        address indexed finalRecipient,
        DepositAddressRoute route,
        DepositAddressFulfillment fulfillment,
        uint256 outputAmount,
        uint256 bridgeTokenOutPriceUsd,
        uint256 toTokenPriceUsd
    );
    event SameChainFinish(
        address indexed depositAddress,
        DepositAddressRoute route,
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
        address indexed hopReceiverAddress,
        address indexed destReceiverAddress,
        DepositAddressRoute route,
        DepositAddressFulfillment leg1Fulfillment,
        DepositAddressFulfillment leg2Fulfillment,
        uint256 hopAmount,
        uint256 leg1BridgeTokenOutPriceUsd,
        uint256 leg2BridgeTokenInPriceUsd
    );
    event RefundDepositAddress(
        address indexed depositAddress,
        DepositAddressRoute route,
        address refundAddress,
        IERC20[] tokens,
        uint256[] amounts
    );
    event RefundFulfillment(
        address indexed depositAddress,
        address indexed receiverAddress,
        DepositAddressRoute route,
        DepositAddressFulfillment fulfillment,
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
    ///      receiver address on the destination chain and bridges the
    ///      specified token amount to it.
    /// @param route           The cross-chain route containing destination
    ///                        chain, recipient, and token details
    /// @param paymentToken    The token the user paid the deposit address.
    /// @param bridgeTokenOut  The token and amount to be bridged to the
    ///                        destination chain
    /// @param relaySalt       Unique salt provided by the relayer to generate
    ///                        a unique receiver address
    /// @param calls           Optional swap calls to convert payment token to
    ///                        required bridge input token
    /// @param bridgeExtraData Additional data required by the specific bridge
    ///                        implementation
    function start(
        DepositAddressRoute calldata route,
        IERC20 paymentToken,
        TokenAmount calldata bridgeTokenOut,
        PriceData calldata paymentTokenPrice,
        PriceData calldata bridgeTokenInPrice,
        bytes32 relaySalt,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant onlyRelayer {
        require(block.chainid != route.toChainId, "DAM: start on dest chain");
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(!isRouteExpired(route), "DAM: expired");

        bool paymentTokenPriceValid = route.pricer.validatePrice(
            paymentTokenPrice
        );
        bool bridgeTokenInPriceValid = route.pricer.validatePrice(
            bridgeTokenInPrice
        );
        require(paymentTokenPriceValid, "DAM: payment price invalid");
        require(bridgeTokenInPriceValid, "DAM: bridge price invalid");
        require(
            paymentTokenPrice.token == address(paymentToken),
            "DAM: payment token mismatch"
        );

        // Deploy (or fetch) deposit address
        DepositAddress da = depositAddressFactory.createDepositAddress(route);

        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: address(da),
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: block.chainid
            });
        (address receiverAddress, ) = computeReceiverAddress(fulfillment);

        // Generate a unique receiver address for each bridge transfer. Without
        // this check, a malicious relayer could reuse the same receiver address
        // to claim multiple bridge transfers, double-paying themselves.
        require(!receiverUsed[receiverAddress], "DAM: receiver used");
        receiverUsed[receiverAddress] = true;

        // Quote bridge input requirements.
        (address bridgeTokenIn, uint256 inAmount) = route
            .bridger
            .getBridgeTokenIn({
                toChainId: route.toChainId,
                bridgeTokenOut: bridgeTokenOut
            });
        require(
            bridgeTokenIn == address(bridgeTokenInPrice.token),
            "DAM: bridge token mismatch"
        );

        // Send payment token to executor
        uint256 paymentAmount = da.sendBalance({
            route: route,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Validate the inAmount is above the minimum output required by the
        // swap.
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: bridgeTokenInPrice,
            sellAmount: paymentAmount,
            maxSlippage: route.maxStartSlippageBps
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
            spender: address(route.bridger),
            value: inAmount
        });
        route.bridger.sendToChain({
            toChainId: route.toChainId,
            toAddress: receiverAddress,
            bridgeTokenOut: bridgeTokenOut,
            refundAddress: route.refundAddress,
            extraData: bridgeExtraData
        });

        emit Start({
            depositAddress: address(da),
            receiverAddress: receiverAddress,
            route: route,
            fulfillment: fulfillment,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount,
            paymentTokenPriceUsd: paymentTokenPrice.priceUsd,
            bridgeTokenInPriceUsd: bridgeTokenInPrice.priceUsd
        });
    }

    /// @notice Send funds that are already on the destination chain.
    ///
    /// @param route        The DepositAddressRoute for the deposit address
    /// @param paymentToken Token to be used to pay the deposit address
    /// @param calls        Arbitrary swap calls to be executed by the executor
    ///                     Can be empty when assets are already `toToken`
    function sameChainFinish(
        DepositAddressRoute calldata route,
        IERC20 paymentToken,
        PriceData calldata paymentTokenPrice,
        PriceData calldata toTokenPrice,
        Call[] calldata calls
    ) external nonReentrant onlyRelayer {
        require(route.toChainId == block.chainid, "DAM: wrong chain");
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(!isRouteExpired(route), "DAM: expired");

        bool paymentTokenPriceValid = route.pricer.validatePrice(
            paymentTokenPrice
        );
        bool toTokenPriceValid = route.pricer.validatePrice(toTokenPrice);
        require(paymentTokenPriceValid, "DAM: payment price invalid");
        require(toTokenPriceValid, "DAM: toToken price invalid");
        require(
            paymentTokenPrice.token == address(paymentToken),
            "DAM: payment token mismatch"
        );
        require(
            toTokenPrice.token == address(route.toToken),
            "DAM: toToken mismatch"
        );

        // Deploy (or fetch) the Deposit Address for this route.
        DepositAddress da = depositAddressFactory.createDepositAddress(route);

        // Pull specified token balances from the da into the executor.
        uint256 paymentAmount = da.sendBalance({
            route: route,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Compute the minimum amount of toToken the user should receive.
        TokenAmount memory minSwapOutput = SwapMath.computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: toTokenPrice,
            sellAmount: paymentAmount,
            maxSlippage: route.maxSameChainFinishSlippageBps
        });

        // Finish the fulfillment and return any leftover tokens to the caller
        uint256 outputAmount = _finishFulfillment({
            depositAddress: address(da),
            route: route,
            calls: calls,
            minOutputAmount: minSwapOutput.amount
        });

        emit SameChainFinish({
            depositAddress: address(da),
            route: route,
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
    /// @param route           The DepositAddressRoute for the deposit address
    /// @param calls           Arbitrary swap calls to be executed by the executor
    /// @param token           The token sent by the relayer
    /// @param bridgeTokenOut  The token and amount expected from the bridge
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    function fastFinish(
        DepositAddressRoute calldata route,
        Call[] calldata calls,
        IERC20 token,
        PriceData calldata bridgeTokenOutPrice,
        PriceData calldata toTokenPrice,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant onlyRelayer {
        require(sourceChainId != block.chainid, "DAM: same chain finish");
        require(route.toChainId == block.chainid, "DAM: wrong chain");
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(!isRouteExpired(route), "DAM: expired");

        bool bridgeTokenOutPriceValid = route.pricer.validatePrice(
            bridgeTokenOutPrice
        );
        bool toTokenPriceValid = route.pricer.validatePrice(toTokenPrice);
        require(bridgeTokenOutPriceValid, "DAM: bridgeTokenOut price invalid");
        require(toTokenPriceValid, "DAM: toToken price invalid");
        require(
            bridgeTokenOutPrice.token == address(bridgeTokenOut.token),
            "DAM: bridgeTokenOut mismatch"
        );
        require(
            toTokenPrice.token == address(route.toToken),
            "DAM: toToken mismatch"
        );

        // Calculate salt for this bridge transfer.
        address da = depositAddressFactory.getDepositAddress(route);
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: da,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: sourceChainId
            });
        (address receiverAddress, ) = computeReceiverAddress(fulfillment);

        // Check that the salt hasn't already been fast finished or claimed.
        require(
            receiverToRecipient[receiverAddress] == address(0),
            "DAM: already finished"
        );
        // Record relayer as new recipient when the bridged tokens arrive
        receiverToRecipient[receiverAddress] = msg.sender;

        // Finish the fulfillment and return any leftover tokens to the caller
        TokenUtils.transferBalance({
            token: token,
            recipient: payable(address(executor))
        });
        TokenAmount memory toTokenAmount = SwapMath.computeMinSwapOutput({
            sellTokenPrice: bridgeTokenOutPrice,
            buyTokenPrice: toTokenPrice,
            sellAmount: bridgeTokenOut.amount,
            maxSlippage: route.maxFastFinishSlippageBps
        });
        uint256 outputAmount = _finishFulfillment({
            depositAddress: da,
            route: route,
            calls: calls,
            minOutputAmount: toTokenAmount.amount
        });

        emit FastFinish({
            depositAddress: da,
            receiverAddress: receiverAddress,
            newRecipient: msg.sender,
            route: route,
            fulfillment: fulfillment,
            outputAmount: outputAmount,
            bridgeTokenOutPriceUsd: bridgeTokenOutPrice.priceUsd,
            toTokenPriceUsd: toTokenPrice.priceUsd
        });
    }

    /// @notice Completes a fulfillment after bridged tokens arrive on the
    ///         destination chain, either repaying a relayer or finishing the
    ///         fulfillment directly.
    /// @param route           The DepositAddressRoute for the deposit address
    /// @param calls           Arbitrary swap from bridgeTokenOut to toToken
    /// @param bridgeTokenOut  The token and amount that was bridged
    /// @param relaySalt       Unique salt from the original bridge transfer
    /// @param sourceChainId   The chain ID where the bridge transfer originated
    function claim(
        DepositAddressRoute calldata route,
        Call[] calldata calls,
        TokenAmount calldata bridgeTokenOut,
        PriceData calldata bridgeTokenOutPrice,
        PriceData calldata toTokenPrice,
        bytes32 relaySalt,
        uint256 sourceChainId
    ) external nonReentrant onlyRelayer {
        require(route.toChainId == block.chainid, "DAM: wrong chain");
        require(route.escrow == address(this), "DAM: wrong escrow");

        // Calculate salt for this bridge transfer.
        address da = depositAddressFactory.getDepositAddress(route);
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: da,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: sourceChainId
            });
        (address receiverAddress, ) = computeReceiverAddress(fulfillment);

        // Check the recipient for this fulfillment.
        address recipient = receiverToRecipient[receiverAddress];
        require(recipient != ADDR_MAX, "DAM: already claimed");
        // Mark fulfillment as claimed
        receiverToRecipient[receiverAddress] = ADDR_MAX;

        // Deploy receiver and pull bridged tokens
        uint256 bridgedAmount;
        (receiverAddress, bridgedAmount) = _deployAndPullFromReceiver(
            fulfillment,
            bridgeTokenOut.token
        );

        uint256 outputAmount = 0;
        if (recipient == address(0)) {
            // Validate prices
            bool bridgeTokenOutPriceValid = route.pricer.validatePrice(
                bridgeTokenOutPrice
            );
            bool toTokenPriceValid = route.pricer.validatePrice(toTokenPrice);
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
                toTokenPrice.token == address(route.toToken),
                "DAM: toToken mismatch"
            );

            // No relayer showed up, so complete the fulfillment. Update the
            // recipient to the route's recipient.
            recipient = route.toAddress;

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
                maxSlippage: route.maxFastFinishSlippageBps
            });

            // Finish the fulfillment and return any leftover tokens to the caller
            outputAmount = _finishFulfillment({
                depositAddress: da,
                route: route,
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
            receiverAddress: receiverAddress,
            finalRecipient: recipient,
            route: route,
            fulfillment: fulfillment,
            outputAmount: outputAmount,
            bridgeTokenOutPriceUsd: bridgeTokenOutPrice.priceUsd,
            toTokenPriceUsd: toTokenPrice.priceUsd
        });
    }

    /// @notice Continues a multi-hop transfer by pulling funds from a hop chain
    ///         receiver and bridging to the final destination chain.
    /// @dev Must be called on the hop chain. Pulls funds from the receiver
    ///      created by the source→hop leg, then initiates hop→dest bridge.
    /// @param route               The DepositAddressRoute for the intent
    /// @param leg1BridgeTokenOut  Token and amount that was bridged in leg 1
    ///                            (source → hop)
    /// @param leg1SourceChainId   Source chain ID for leg 1
    /// @param leg2BridgeTokenOut  Token and amount to bridge in leg 2 (hop → dest)
    /// @param leg1BridgeTokenOutPrice  Price data for leg 1 bridge token out
    /// @param leg2BridgeTokenInPrice   Price data for leg 2 bridge token in
    /// @param leg2RelaySalt       Relay salt for leg 2
    /// @param calls               Swap calls to convert leg 1 token to leg 2
    ///                            bridge input token
    /// @param bridgeExtraData     Additional data for the hop → dest bridge
    function hopStart(
        DepositAddressRoute calldata route,
        TokenAmount calldata leg1BridgeTokenOut,
        bytes32 leg1RelaySalt,
        uint256 leg1SourceChainId,
        PriceData calldata leg1BridgeTokenOutPrice,
        TokenAmount calldata leg2BridgeTokenOut,
        bytes32 leg2RelaySalt,
        PriceData calldata leg2BridgeTokenInPrice,
        Call[] calldata calls,
        bytes calldata bridgeExtraData
    ) external nonReentrant onlyRelayer {
        // Must be on hop chain (not source, not dest)
        require(block.chainid != leg1SourceChainId, "DAM: hop on source chain");
        require(block.chainid != route.toChainId, "DAM: hop on dest chain");
        require(route.escrow == address(this), "DAM: wrong escrow");

        // Validate prices
        bool leg1PriceValid = route.pricer.validatePrice(
            leg1BridgeTokenOutPrice
        );
        bool leg2PriceValid = route.pricer.validatePrice(
            leg2BridgeTokenInPrice
        );
        require(leg1PriceValid, "DAM: leg1 price invalid");
        require(leg2PriceValid, "DAM: leg2 price invalid");
        require(
            leg1BridgeTokenOutPrice.token == address(leg1BridgeTokenOut.token),
            "DAM: leg1 bridge token mismatch"
        );

        // Compute and deploy/fetch the hop receiver from leg 1
        address depositAddress = depositAddressFactory.getDepositAddress(route);
        DepositAddressFulfillment
            memory leg1Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg1RelaySalt,
                bridgeTokenOut: leg1BridgeTokenOut,
                sourceChainId: leg1SourceChainId
            });
        (address hopReceiverAddress, ) = computeReceiverAddress(
            leg1Fulfillment
        );

        // Check that leg1 hasn't been claimed already
        address recipient = receiverToRecipient[hopReceiverAddress];
        require(recipient != ADDR_MAX, "DAM: already claimed");
        // Mark as claimed to prevent double-processing
        receiverToRecipient[hopReceiverAddress] = ADDR_MAX;

        // Deploy receiver and pull funds
        uint256 bridgedAmount;
        (hopReceiverAddress, bridgedAmount) = _deployAndPullFromReceiver(
            leg1Fulfillment,
            leg1BridgeTokenOut.token
        );

        // Compute leg 2 receiver address
        DepositAddressFulfillment
            memory leg2Fulfillment = DepositAddressFulfillment({
                depositAddress: depositAddress,
                relaySalt: leg2RelaySalt,
                bridgeTokenOut: leg2BridgeTokenOut,
                sourceChainId: block.chainid
            });
        (address destReceiverAddress, ) = computeReceiverAddress(
            leg2Fulfillment
        );

        // Ensure leg 2 receiver hasn't been used
        require(!receiverUsed[destReceiverAddress], "DAM: receiver used");
        receiverUsed[destReceiverAddress] = true;

        // Get bridge input requirements for leg 2
        (address bridgeTokenIn, uint256 inAmount) = route
            .bridger
            .getBridgeTokenIn({
                toChainId: route.toChainId,
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
            maxSlippage: route.maxStartSlippageBps
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
            spender: address(route.bridger),
            value: inAmount
        });
        route.bridger.sendToChain({
            toChainId: route.toChainId,
            toAddress: destReceiverAddress,
            bridgeTokenOut: leg2BridgeTokenOut,
            refundAddress: route.refundAddress,
            extraData: bridgeExtraData
        });

        emit HopStart({
            depositAddress: depositAddress,
            hopReceiverAddress: hopReceiverAddress,
            destReceiverAddress: destReceiverAddress,
            route: route,
            leg1Fulfillment: leg1Fulfillment,
            leg2Fulfillment: leg2Fulfillment,
            hopAmount: bridgedAmount,
            leg1BridgeTokenOutPriceUsd: leg1BridgeTokenOutPrice.priceUsd,
            leg2BridgeTokenInPriceUsd: leg2BridgeTokenInPrice.priceUsd
        });
    }

    /// @notice Refunds tokens from a deposit address to its designated
    ///         refund address after the deposit address has expired.
    /// @param route The Deposit Address route containing the refund address
    /// @param tokens The tokens to refund from the deposit address
    /// @dev Refunds are only allowed after the deposit address expires
    function refundDepositAddress(
        DepositAddressRoute calldata route,
        IERC20[] calldata tokens
    ) external nonReentrant {
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(isRouteExpired(route), "DAM: not expired");

        // Deploy (or fetch) the Deposit Address for this route
        DepositAddress da = depositAddressFactory.createDepositAddress(route);

        // Send refund to the designated refund address
        uint256[] memory amounts = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; ++i) {
            amounts[i] = da.sendBalance({
                route: route,
                token: tokens[i],
                recipient: payable(route.refundAddress)
            });
        }

        emit RefundDepositAddress({
            depositAddress: address(da),
            route: route,
            refundAddress: route.refundAddress,
            tokens: tokens,
            amounts: amounts
        });
    }

    /// @notice Refunds tokens from a receiver address to the designated refund
    ///         address after the route has expired.
    /// @param route The Deposit Address route containing the refund address
    /// @param bridgeTokenOut The token and amount that was bridged (used to
    ///        compute receiver address)
    /// @param relaySalt Unique salt from the original bridge transfer
    /// @param sourceChainId The chain ID where the bridge transfer originated
    /// @param tokens The tokens to refund from the receiver
    /// @dev Refunds are only allowed after the route expires. This allows
    ///      recovery of bridged funds that were never claimed or fast-finished.
    function refundFulfillment(
        DepositAddressRoute calldata route,
        TokenAmount calldata bridgeTokenOut,
        bytes32 relaySalt,
        uint256 sourceChainId,
        IERC20[] calldata tokens
    ) external nonReentrant onlyRelayer {
        require(route.escrow == address(this), "DAM: wrong escrow");
        require(isRouteExpired(route), "DAM: not expired");

        // Compute the receiver address for this fulfillment
        address da = depositAddressFactory.getDepositAddress(route);
        DepositAddressFulfillment
            memory fulfillment = DepositAddressFulfillment({
                depositAddress: da,
                relaySalt: relaySalt,
                bridgeTokenOut: bridgeTokenOut,
                sourceChainId: sourceChainId
            });

        // Pull and transfer each token to the refund address
        address receiverAddress;
        uint256[] memory amounts = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; ++i) {
            (receiverAddress, amounts[i]) = _deployAndPullFromReceiver(
                fulfillment,
                tokens[i]
            );
            TokenUtils.transfer({
                token: tokens[i],
                recipient: payable(route.refundAddress),
                amount: amounts[i]
            });
        }

        emit RefundFulfillment({
            depositAddress: da,
            receiverAddress: receiverAddress,
            route: route,
            fulfillment: fulfillment,
            refundAddress: route.refundAddress,
            tokens: tokens,
            amounts: amounts
        });
    }

    /// @notice Computes a deterministic DepositAddressReceiver address.
    /// @param fulfillment The bridge fulfillment
    /// @return addr The computed address for the DepositAddressReceiver contract
    /// @return recvSalt The CREATE2 salt used to deploy the DepositAddressReceiver
    function computeReceiverAddress(
        DepositAddressFulfillment memory fulfillment
    ) public view returns (address payable addr, bytes32 recvSalt) {
        recvSalt = keccak256(abi.encode(fulfillment));
        bytes memory initCode = type(DepositAddressReceiver).creationCode;
        addr = payable(Create2.computeAddress(recvSalt, keccak256(initCode)));
    }

    /// @notice Checks if a Deposit Address route has expired.
    /// @param route The Deposit Address route to check
    /// @return true if the route has expired, false otherwise
    function isRouteExpired(
        DepositAddressRoute calldata route
    ) public view returns (bool) {
        return block.timestamp >= route.expiresAt;
    }

    // ---------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------

    /// @dev Deploy a DepositAddressReceiver if necessary and pull funds.
    /// @param fulfillment The bridge fulfillment used to compute receiver address
    /// @param token The token to pull from the receiver
    /// @return receiverAddress The receiver contract address
    /// @return pulledAmount The amount pulled from the receiver
    function _deployAndPullFromReceiver(
        DepositAddressFulfillment memory fulfillment,
        IERC20 token
    ) internal returns (address receiverAddress, uint256 pulledAmount) {
        bytes32 recvSalt;
        (receiverAddress, recvSalt) = computeReceiverAddress(fulfillment);

        // Deploy receiver if necessary
        DepositAddressReceiver receiver;
        if (receiverAddress.code.length == 0) {
            receiver = new DepositAddressReceiver{salt: recvSalt}();
            require(receiverAddress == address(receiver), "DAM: receiver");
        } else {
            receiver = DepositAddressReceiver(payable(receiverAddress));
        }

        // Pull funds from the receiver
        pulledAmount = receiver.pull(token);
    }

    /// @dev Internal helper that completes a fulfillment by executing swaps,
    ///      delivering toToken to the recipient, and handling any surplus.
    ///      If the route has a finalCall, executes the call after swapping.
    ///      Precondition: input tokens must already be in PayExecutor.
    /// @param depositAddress   The deposit address for this fulfillment (for events)
    /// @param route            The DepositAddressRoute containing
    ///                         recipient details and optional finalCall
    /// @param calls            Arbitrary swap calls to be executed by the
    ///                         executor
    /// @param minOutputAmount  The minimum amount of target token to deliver to
    ///                         the recipient
    function _finishFulfillment(
        address depositAddress,
        DepositAddressRoute calldata route,
        Call[] calldata calls,
        uint256 minOutputAmount
    ) internal returns (uint256 outputAmount) {
        if (route.finalCallData.length > 0) {
            // Swap and keep tokens in executor for final call
            outputAmount = executor.executeAndSendBalance({
                calls: calls,
                minOutputAmount: TokenAmount({
                    token: route.toToken,
                    amount: minOutputAmount
                }),
                recipient: payable(address(executor))
            });

            // Execute final call - approves token to toAddress and calls it
            bool success = executor.executeFinalCall({
                finalCall: Call({
                    to: route.toAddress,
                    value: 0,
                    data: route.finalCallData
                }),
                finalCallToken: TokenAmount({
                    token: route.toToken,
                    amount: outputAmount
                }),
                refundAddr: payable(route.refundAddress)
            });

            emit FinalCallExecuted(depositAddress, route.toAddress, success);
        } else {
            // No final call - send directly to recipient
            outputAmount = executor.executeAndSendBalance({
                calls: calls,
                minOutputAmount: TokenAmount({
                    token: route.toToken,
                    amount: minOutputAmount
                }),
                recipient: payable(route.toAddress)
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
// Minimal deterministic receiver
// ---------------------------------------------------------------------

/// @notice Minimal deterministic contract that receives bridged tokens and
///         allows the Deposit Address Manager to sweep them.
/// @dev Deployed via CREATE2 using a salt that encodes bridge transfer
///      parameters into the deployment address, creating predictable addresses
///      that are unique to each bridge transfer. Only the deploying manager
///      can pull funds from this contract.
contract DepositAddressReceiver {
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
