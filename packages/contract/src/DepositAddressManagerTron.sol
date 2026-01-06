// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/utils/SafeERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/Initializable.sol";
import "openzeppelin-contracts-upgradeable/contracts/utils/ReentrancyGuardUpgradeable.sol";
import "openzeppelin-contracts-upgradeable/contracts/access/OwnableUpgradeable.sol";
import "openzeppelin-contracts-upgradeable/contracts/proxy/utils/UUPSUpgradeable.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./DepositAddressFactory.sol";
import "./DepositAddress.sol";
import "./DaimoPayExecutor.sol";
import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Tron-optimized DepositAddressManager with only startIntent.
///         For source-chain (Tron) use only - no destination chain functions.
contract DepositAddressManagerTron is
    Initializable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable
{
    using SafeERC20 for IERC20;

    // ---------------------------------------------------------------------
    // Constants & Immutables
    // ---------------------------------------------------------------------

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

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    event RelayerAuthorized(address indexed relayer, bool authorized);

    event Start(
        address indexed depositAddress,
        address indexed receiverAddress,
        DepositAddressRoute route,
        DepositAddressIntent intent,
        address paymentToken,
        uint256 paymentAmount
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
    // Constructor & Initializer
    // ---------------------------------------------------------------------

    /// @dev Disable initializers on the implementation contract.
    constructor() {
        _disableInitializers();
    }

    // Accept native asset deposits (for swaps).
    receive() external payable {}

    /// @notice Initialize the contract.
    function initialize(
        address _owner,
        DepositAddressFactory _depositAddressFactory
    ) external initializer {
        __ReentrancyGuard_init();
        __Ownable_init(_owner);
        __UUPSUpgradeable_init();

        depositAddressFactory = _depositAddressFactory;
        executor = new DaimoPayExecutor(address(this));
    }

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Initiates a cross-chain transfer by pulling funds from the
    ///         Deposit Address vault, executing swaps if needed, and
    ///         initiating a bridge to the destination chain.
    /// @dev Must be called on the source chain. Creates a deterministic
    ///      receiver address on the destination chain and bridges the
    ///      specified token amount to it.
    function startIntent(
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

        // Deploy (or fetch) deposit address vault
        DepositAddress vault = depositAddressFactory.createDepositAddress(
            route
        );

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: block.chainid
        });
        (address receiverAddress, ) = computeReceiverAddress(intent);

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
        uint256 paymentAmount = vault.sendBalance({
            route: route,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Validate the inAmount is above the minimum output required by the
        // swap.
        TokenAmount memory minSwapOutput = _computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: bridgeTokenInPrice,
            sellAmount: paymentAmount,
            maxSlippage: route.maxStartSlippageBps
        });
        require(inAmount >= minSwapOutput.amount, "DAM: bridge input low");

        // Run arbitrary calls provided by the relayer. These will generally
        // approve the swap contract and swap if necessary.
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
            // Refund to the vault so that startIntent can be retried
            refundAddress: address(vault),
            extraData: bridgeExtraData
        });

        emit Start({
            depositAddress: address(vault),
            receiverAddress: receiverAddress,
            route: route,
            intent: intent,
            paymentToken: address(paymentToken),
            paymentAmount: paymentAmount
        });
    }

    /// @notice Computes a deterministic receiver address on the destination.
    /// @param intent The bridge intent
    /// @return addr The computed address for the receiver contract
    /// @return recvSalt The CREATE2 salt
    function computeReceiverAddress(
        DepositAddressIntent memory intent
    ) public view returns (address payable addr, bytes32 recvSalt) {
        recvSalt = keccak256(abi.encode(intent));
        // Use DepositAddressReceiver from main contract for compatibility
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
    // Internal swap math (inlined for Tron deployment efficiency)
    // ---------------------------------------------------------------------

    /// @dev Compute minimum swap output based on USD prices and slippage.
    function _computeMinSwapOutput(
        PriceData memory sellTokenPrice,
        PriceData memory buyTokenPrice,
        uint256 sellAmount,
        uint256 maxSlippage
    ) internal view returns (TokenAmount memory) {
        require(maxSlippage <= 10_000, "DAM: slippage > 100%");
        require(sellTokenPrice.priceUsd > 0, "DAM: sell price zero");
        require(buyTokenPrice.priceUsd > 0, "DAM: buy price zero");

        uint256 sellDecimals = IERC20Metadata(address(sellTokenPrice.token)).decimals();
        uint256 buyDecimals = IERC20Metadata(address(buyTokenPrice.token)).decimals();
        uint256 slippageFactor = 10_000 - maxSlippage;

        uint256 sellValueWithSlippage = sellAmount * sellTokenPrice.priceUsd * slippageFactor;
        uint256 buyAmount;

        if (buyDecimals >= sellDecimals) {
            uint256 numerator = sellValueWithSlippage * (10 ** (buyDecimals - sellDecimals));
            buyAmount = numerator / (buyTokenPrice.priceUsd * 10_000);
        } else {
            uint256 denominator = buyTokenPrice.priceUsd * 10_000 * (10 ** (sellDecimals - buyDecimals));
            buyAmount = sellValueWithSlippage / denominator;
        }

        return TokenAmount({token: IERC20(address(buyTokenPrice.token)), amount: buyAmount});
    }

    // ---------------------------------------------------------------------
    // UUPS upgrade authorization
    // ---------------------------------------------------------------------

    /// @dev Restrict upgrades to the contract owner.
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

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

    // ---------------------------------------------------------------------
    // Storage gap for upgradeability
    // ---------------------------------------------------------------------

    uint256[50] private __gap;
}

// Re-export DepositAddressReceiver for initCode compatibility
// (needed for computeReceiverAddress to work cross-chain)
import {DepositAddressReceiver} from "./DepositAddressManager.sol";
