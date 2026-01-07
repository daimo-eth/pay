// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.12;

import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-contracts/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "openzeppelin-contracts/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "openzeppelin-contracts/contracts/access/Ownable.sol";
import "openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";
import "openzeppelin-contracts/contracts/utils/Create2.sol";

import "./DepositAddressTron.sol";
import "./DepositAddress.sol";
import "./DaimoPayExecutorTron.sol";
import "./TokenUtils.sol";
import "./interfaces/IDaimoPayBridger.sol";
import "./interfaces/IDaimoPayPricer.sol";

/// @author Daimo, Inc
/// @custom:security-contact security@daimo.com
/// @notice Tron-optimized DepositAddressManager with inlined factory.
///         Handles TRC20-USDT's non-standard transfer behavior.
///         For source-chain (Tron) use only - no destination chain functions.
contract DepositAddressManagerTron is Ownable, ReentrancyGuard {
    // ---------------------------------------------------------------------
    // Immutables
    // ---------------------------------------------------------------------

    /// Singleton implementation for deposit address vaults.
    DepositAddressTron public immutable depositAddressImpl;

    /// Dedicated contract that performs swap / contract calls.
    DaimoPayExecutorTron public immutable executor;

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

    event DepositAddressDeployed(
        address indexed depositAddress,
        DepositAddressRoute route
    );

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

    modifier onlyRelayer() {
        require(relayerAuthorized[msg.sender], "DAM: not relayer");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    constructor(address _owner) Ownable(_owner) {
        depositAddressImpl = new DepositAddressTron();
        executor = new DaimoPayExecutorTron(address(this));
    }

    receive() external payable {}

    // ---------------------------------------------------------------------
    // External user / relayer entrypoints
    // ---------------------------------------------------------------------

    /// @notice Initiates a cross-chain transfer by pulling funds from the
    ///         Deposit Address vault, executing swaps if needed, and
    ///         initiating a bridge to the destination chain.
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

        // Get or deploy deposit address vault
        DepositAddressTron vault = _getOrCreateVault(route);

        DepositAddressIntent memory intent = DepositAddressIntent({
            depositAddress: address(vault),
            relaySalt: relaySalt,
            bridgeTokenOut: bridgeTokenOut,
            sourceChainId: block.chainid
        });
        (address receiverAddress, ) = computeReceiverAddress(intent);

        // Generate a unique receiver address for each bridge transfer.
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

        // Send payment token to executor (uses balance-diff for TRC20-USDT)
        uint256 paymentAmount = vault.sendBalance({
            route: route,
            token: paymentToken,
            recipient: payable(address(executor))
        });

        // Validate the inAmount is above the minimum output required.
        TokenAmount memory minSwapOutput = _computeMinSwapOutput({
            sellTokenPrice: paymentTokenPrice,
            buyTokenPrice: bridgeTokenInPrice,
            sellAmount: paymentAmount,
            maxSlippage: route.maxStartSlippageBps
        });
        require(inAmount >= minSwapOutput.amount, "DAM: bridge input low");

        // Run arbitrary calls provided by the relayer.
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

        // Approve bridger and initiate bridging (raw call to avoid SafeERC20)
        // solhint-disable-next-line avoid-low-level-calls
        (bool approveSuccess, ) = bridgeTokenIn.call(
            abi.encodeWithSelector(
                IERC20.approve.selector,
                address(route.bridger),
                inAmount
            )
        );
        require(approveSuccess, "DAM: approve failed");
        route.bridger.sendToChain({
            toChainId: route.toChainId,
            toAddress: receiverAddress,
            bridgeTokenOut: bridgeTokenOut,
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
    function computeReceiverAddress(
        DepositAddressIntent memory intent
    ) public view returns (address payable addr, bytes32 recvSalt) {
        recvSalt = keccak256(abi.encode(intent));
        bytes memory initCode = type(DepositAddressReceiver).creationCode;
        addr = payable(Create2.computeAddress(recvSalt, keccak256(initCode)));
    }

    /// @notice Checks if a Deposit Address route has expired.
    function isRouteExpired(
        DepositAddressRoute calldata route
    ) public view returns (bool) {
        return block.timestamp >= route.expiresAt;
    }

    /// @notice Compute the deposit address for a route (Tron CREATE2 with 0x41 prefix).
    function getDepositAddress(
        DepositAddressRoute calldata route
    ) public view returns (address) {
        bytes32 routeHashVal = calcRouteHash(route);
        bytes memory initData = abi.encodeCall(
            DepositAddressTron.initialize,
            routeHashVal
        );
        bytes memory initCode = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(address(depositAddressImpl), initData)
        );

        // Tron TVM uses 0x41 prefix for CREATE2, EVM uses 0xff.
        // Use 0x41 on Tron mainnet (728126428), 0xff elsewhere.
        bytes1 prefix = block.chainid == 728126428 ? bytes1(0x41) : bytes1(0xff);
        bytes32 initCodeHash = keccak256(initCode);
        return
            address(
                uint160(
                    uint256(
                        keccak256(
                            abi.encodePacked(
                                prefix,
                                address(this),
                                bytes32(0),
                                initCodeHash
                            )
                        )
                    )
                )
            );
    }

    // ---------------------------------------------------------------------
    // Internal: Vault creation (inlined factory)
    // ---------------------------------------------------------------------

    function _getOrCreateVault(
        DepositAddressRoute calldata route
    ) internal returns (DepositAddressTron) {
        address computedAddr = getDepositAddress(route);

        // If vault already exists, return it
        if (computedAddr.code.length > 0) {
            return DepositAddressTron(payable(computedAddr));
        }

        // Deploy new vault via CREATE2
        bytes32 routeHashVal = calcRouteHash(route);
        DepositAddressTron vault = DepositAddressTron(
            payable(
                address(
                    new ERC1967Proxy{salt: bytes32(0)}(
                        address(depositAddressImpl),
                        abi.encodeCall(
                            DepositAddressTron.initialize,
                            routeHashVal
                        )
                    )
                )
            )
        );

        emit DepositAddressDeployed(address(vault), route);
        return vault;
    }

    // ---------------------------------------------------------------------
    // Internal swap math
    // ---------------------------------------------------------------------

    function _computeMinSwapOutput(
        PriceData memory sellTokenPrice,
        PriceData memory buyTokenPrice,
        uint256 sellAmount,
        uint256 maxSlippage
    ) internal view returns (TokenAmount memory) {
        require(maxSlippage <= 10_000, "DAM: slippage > 100%");
        require(sellTokenPrice.priceUsd > 0, "DAM: sell price zero");
        require(buyTokenPrice.priceUsd > 0, "DAM: buy price zero");

        uint256 sellDecimals = IERC20Metadata(address(sellTokenPrice.token))
            .decimals();
        uint256 buyDecimals = IERC20Metadata(address(buyTokenPrice.token))
            .decimals();
        uint256 slippageFactor = 10_000 - maxSlippage;

        uint256 sellValueWithSlippage = sellAmount *
            sellTokenPrice.priceUsd *
            slippageFactor;
        uint256 buyAmount;

        if (buyDecimals >= sellDecimals) {
            uint256 numerator = sellValueWithSlippage *
                (10 ** (buyDecimals - sellDecimals));
            buyAmount = numerator / (buyTokenPrice.priceUsd * 10_000);
        } else {
            uint256 denominator = buyTokenPrice.priceUsd *
                10_000 *
                (10 ** (sellDecimals - buyDecimals));
            buyAmount = sellValueWithSlippage / denominator;
        }

        return
            TokenAmount({
                token: IERC20(address(buyTokenPrice.token)),
                amount: buyAmount
            });
    }

    // ---------------------------------------------------------------------
    // Admin functions
    // ---------------------------------------------------------------------

    /// @notice Set the authorized relayer address.
    function setRelayer(address relayer, bool authorized) external onlyOwner {
        relayerAuthorized[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }
}

// Re-export DepositAddressReceiver for initCode compatibility
import {DepositAddressReceiver} from "./DepositAddressManager.sol";
