import { parseUnits } from "viem";
import {
  base,
  baseUSDC,
  bscUSDT,
  getKnownToken,
  polygonUSDC,
  RozoPayHydratedOrderWithOrg,
  RozoPayIntentStatus,
  RozoPayOrderMode,
  RozoPayOrderStatusDest,
  RozoPayOrderStatusSource,
  RozoPayUserMetadata,
  rozoSolanaUSDC,
  rozoStellar,
  rozoStellarUSDC,
} from ".";
import type { PaymentResponseData } from "./api/payment";

export interface PaymentBridgeConfig {
  toChain?: number;
  toToken?: string;
  toAddress: string;
  toStellarAddress?: string;
  toSolanaAddress?: string;
  toUnits: string;
  payInTokenAddress: string;
  log?: (msg: string) => void;
}

export interface PreferredPaymentConfig {
  preferredChain: string;
  preferredToken: "USDC" | "USDT" | "XLM";
  preferredTokenAddress?: string;
}

export interface DestinationConfig {
  destinationAddress?: string;
  chainId: string;
  amountUnits: string;
  tokenSymbol: string;
  tokenAddress: string;
}

/**
 * Creates payment bridge configuration for cross-chain payment routing
 *
 * Determines the optimal payment routing based on the destination chain/token
 * and the wallet payment option selected by the user. This function handles
 * the complexity of multi-chain payments by:
 *
 * 1. **Preferred Payment Method**: Identifies which chain/token the user will pay from
 *    - Supports Base USDC, Polygon USDC, Solana USDC, Stellar USDC, and BSC USDT
 *    - Sets appropriate chain ID and token address for the source transaction
 *
 * 2. **Destination Configuration**: Determines where funds will be received
 *    - Supports Base, Solana, and Stellar as destination chains
 *    - Handles special address formats for Solana and Stellar addresses
 *    - Defaults to Base USDC when no special destination is specified
 *
 * 3. **Cross-Chain Bridging**: Configures the payment bridge parameters
 *    - Maps user's selected wallet/token to the appropriate payment method
 *    - Sets up destination chain and token configuration
 *    - Handles token address formatting (e.g., Stellar's `USDC:issuerPK` format)
 *
 * @param config - Payment bridge configuration parameters
 * @param config.toChain - Destination chain ID (defaults to Base: 8453)
 * @param config.toToken - Destination token address (defaults to Base USDC)
 * @param config.toAddress - Standard EVM destination address
 * @param config.toStellarAddress - Stellar-specific destination address (if paying to Stellar)
 * @param config.toSolanaAddress - Solana-specific destination address (if paying to Solana)
 * @param config.toUnits - Amount in token units (smallest denomination)
 * @param config.payInTokenAddress - Token address user selected to pay with
 * @param config.log - Optional logging function for debugging
 *
 * @returns Payment routing configuration
 * @returns preferred - Source payment configuration (chain, token user will pay from)
 * @returns destination - Destination payment configuration (chain, token user will receive)
 *
 * @example
 * ```typescript
 * // User wants to pay with Polygon USDC to receive on Base
 * const { preferred, destination } = createPaymentBridgeConfig({
 *   toChain: 8453, // Base
 *   toToken: baseUSDC.token,
 *   toAddress: '0x123...',
 *   toUnits: '1000000', // 1 USDC
 *   payInTokenAddress: polygonUSDC.token,
 *   log: console.log
 * });
 *
 * // preferred = { preferredChain: '137', preferredToken: 'USDC', preferredTokenAddress: '0x2791...' }
 * // destination = { destinationAddress: '0x123...', chainId: '8453', amountUnits: '1000000', ... }
 * ```
 *
 * @example
 * ```typescript
 * // User wants to pay to a Stellar address
 * const { preferred, destination } = createPaymentBridgeConfig({
 *   toStellarAddress: 'GDZS...',
 *   toUnits: '1000000',
 *   payInTokenAddress: baseUSDC.token,
 * });
 *
 * // destination will be configured for Stellar chain with USDC:issuerPK format
 * ```
 *
 * @note Currently only supports Base USDC and Stellar USDC as destination chains.
 *       Support for additional destination chains is planned.
 *
 * @see PreferredPaymentConfig
 * @see DestinationConfig
 */
export function createPaymentBridgeConfig({
  toChain = baseUSDC.chainId,
  toToken = baseUSDC.token,
  toAddress,
  toStellarAddress,
  toSolanaAddress,
  toUnits,
  payInTokenAddress,
  log,
}: PaymentBridgeConfig): {
  preferred: PreferredPaymentConfig;
  destination: DestinationConfig;
} {
  // Default configuration for Base USDC payments
  let preferred: PreferredPaymentConfig = {
    preferredChain: String(toChain),
    preferredToken: "USDC",
  };

  let destination: DestinationConfig = {
    destinationAddress: toAddress,
    chainId: String(toChain),
    amountUnits: toUnits,
    tokenSymbol: "USDC",
    tokenAddress: toToken,
  };

  /**
   * IMPORTANT: Because we only support PAY OUT USDC BASE & STELLAR
   * So, We force toChain and toToken to Base USDC as default PayParams
   *
   * @TODO: Adjust this when we support another PAY OUT chain
   */
  if (toChain === base.chainId && toToken === baseUSDC.token) {
    // Determine preferred payment method based on wallet selection
    if (payInTokenAddress) {
      // Pay In USDC Polygon
      if (payInTokenAddress === polygonUSDC.token) {
        log?.(`[Payment Bridge] Pay In USDC Polygon`);
        preferred = {
          preferredChain: String(polygonUSDC.chainId),
          preferredToken: "USDC",
          preferredTokenAddress: polygonUSDC.token,
        };
      }
      // Pay In USDC Solana
      else if (payInTokenAddress === rozoSolanaUSDC.token) {
        log?.(`[Payment Bridge] Pay In USDC Solana`);
        preferred = {
          preferredChain: String(rozoSolanaUSDC.chainId),
          preferredToken: "USDC",
          preferredTokenAddress: rozoSolanaUSDC.token,
        };
      }
      // Pay In USDC Stellar
      else if (payInTokenAddress === rozoStellarUSDC.token) {
        log?.(`[Payment Bridge] Pay In USDC Stellar`);
        preferred = {
          preferredChain: String(rozoStellarUSDC.chainId),
          preferredToken: "USDC",
          preferredTokenAddress: `USDC:${rozoStellarUSDC.token}`,
        };
      }
      // Pay In USDT BSC
      else if (payInTokenAddress === bscUSDT.token) {
        log?.(`[Payment Bridge] Pay In USDT BSC`);
        preferred = {
          preferredChain: String(bscUSDT.chainId),
          preferredToken: "USDT",
          preferredTokenAddress: bscUSDT.token,
        };
      }
    }

    // Determine destination based on special address types
    if (toStellarAddress) {
      log?.(`[Payment Bridge] Pay Out USDC Stellar`);
      destination = {
        destinationAddress: toStellarAddress,
        chainId: String(rozoStellar.chainId),
        amountUnits: toUnits,
        tokenSymbol: "USDC",
        tokenAddress: `USDC:${rozoStellarUSDC.token}`,
      };
    } else if (toSolanaAddress) {
      log?.(`[Payment Bridge] Pay Out USDC Solana`);
      destination = {
        destinationAddress: toSolanaAddress,
        chainId: String(rozoSolanaUSDC.chainId),
        amountUnits: toUnits,
        tokenSymbol: "USDC",
        tokenAddress: rozoSolanaUSDC.token,
      };
    } else {
      log?.(`[Payment Bridge] Pay Out USDC Base`);
      // Keep default Base configuration
    }
  }

  return { preferred, destination };
}

/**
 * Transforms a payment API response into a fully hydrated order object
 *
 * Converts the payment response data from the RozoAI payment API into a complete
 * `RozoPayHydratedOrderWithOrg` object that contains all the information needed
 * to display order status, track payments, and handle cross-chain transactions.
 *
 * This function performs several key transformations:
 *
 * 1. **Token Resolution**: Identifies the correct token based on chain and address
 *    - Uses `getKnownToken()` to resolve token metadata (decimals, symbol, logo, etc.)
 *    - Handles special cases for Stellar tokens using issuer public key
 *
 * 2. **Order Structure**: Creates a complete order with all required fields
 *    - Generates random order ID for internal tracking
 *    - Sets up intent, handoff, and contract addresses
 *    - Configures bridge token options and destination amounts
 *
 * 3. **Status Initialization**: Sets initial payment statuses
 *    - Source status: WAITING_PAYMENT (awaiting user transaction)
 *    - Destination status: PENDING (not yet received)
 *    - Intent status: UNPAID (payment not initiated)
 *
 * 4. **Metadata Merge**: Combines various metadata sources
 *    - Merges order metadata, user metadata, and custom metadata
 *    - Preserves external ID and organization information
 *
 * @param order - Payment response data from the RozoAI payment API
 * @param order.metadata - Payment metadata including chain, token, and routing info
 * @param order.destination - Destination configuration (chain, token, amount, address)
 * @param order.source - Source transaction info (if payment has been initiated)
 * @param order.orgId - Organization ID for the payment
 * @param order.externalId - External reference ID (if provided by merchant)
 *
 * @returns Complete hydrated order object with all payment tracking information
 * @returns id - Unique order identifier (random BigInt)
 * @returns mode - Order mode (HYDRATED)
 * @returns sourceStatus - Source transaction status
 * @returns destStatus - Destination transaction status
 * @returns intentStatus - Overall payment intent status
 * @returns metadata - Merged metadata from all sources
 * @returns org - Organization information
 *
 * @example
 * ```typescript
 * const paymentResponse = await getRozoPayment(paymentId);
 *
 * const hydratedOrder = formatPaymentResponseDataToHydratedOrder(
 *   paymentResponse.data,
 *   'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
 * );
 *
 * console.log(hydratedOrder.sourceStatus); // 'WAITING_PAYMENT'
 * console.log(hydratedOrder.destFinalCallTokenAmount.token.symbol); // 'USDC'
 * console.log(hydratedOrder.usdValue); // 10.00
 * ```
 *
 * @note The generated order ID is random and intended for client-side tracking only.
 *       Use `externalId` or the API payment ID for server-side reference.
 *
 * @note The function sets a 5-minute expiration timestamp from the current time.
 *
 * @see PaymentResponseData
 * @see RozoPayHydratedOrderWithOrg
 * @see getKnownToken
 */
export function formatResponseToHydratedOrder(
  order: PaymentResponseData
): RozoPayHydratedOrderWithOrg {
  const destAddress = order.metadata.receivingAddress as `0x${string}`;

  const requiredChain = order.metadata.preferredChain || baseUSDC.chainId;

  const chain = getKnownToken(
    Number(requiredChain),
    Number(requiredChain) === rozoStellar.chainId
      ? rozoStellarUSDC.token
      : order.metadata.preferredTokenAddress
  );

  return {
    id: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    mode: RozoPayOrderMode.HYDRATED,
    intentAddr: destAddress,
    handoffAddr: destAddress,
    escrowContractAddress: destAddress,
    bridgerContractAddress: destAddress,
    // @TODO: use correct destination token
    bridgeTokenOutOptions: [
      {
        token: {
          chainId: baseUSDC.chainId,
          token: baseUSDC.token,
          symbol: baseUSDC.symbol,
          usd: 1,
          priceFromUsd: 1,
          decimals: baseUSDC.decimals,
          displayDecimals: 2,
          logoSourceURI: baseUSDC.logoSourceURI,
          logoURI: baseUSDC.logoURI,
          maxAcceptUsd: 100000,
          maxSendUsd: 0,
        },
        amount: parseUnits(
          order.destination.amountUnits,
          baseUSDC.decimals
        ).toString() as `${bigint}`,
        usd: Number(order.destination.amountUnits),
      },
    ],
    selectedBridgeTokenOutAddr: null,
    selectedBridgeTokenOutAmount: null,
    destFinalCallTokenAmount: {
      token: {
        chainId: chain ? chain.chainId : baseUSDC.chainId,
        token: chain ? chain.token : baseUSDC.token,
        symbol: chain ? chain.symbol : baseUSDC.symbol,
        usd: 1,
        priceFromUsd: 1,
        decimals: chain ? chain.decimals : baseUSDC.decimals,
        displayDecimals: 2,
        logoSourceURI: chain ? chain.logoSourceURI : baseUSDC.logoSourceURI,
        logoURI: chain ? chain.logoURI : baseUSDC.logoURI,
        maxAcceptUsd: 100000,
        maxSendUsd: 0,
      },
      amount: parseUnits(
        order.destination.amountUnits,
        chain ? chain.decimals : baseUSDC.decimals
      ).toString() as `${bigint}`,
      usd: Number(order.destination.amountUnits),
    },
    usdValue: Number(order.destination.amountUnits),
    destFinalCall: {
      to: destAddress,
      value: BigInt("0"),
      data: "0x",
    },
    refundAddr: (order.source?.sourceAddress as `0x${string}`) || null,
    nonce: order.nonce as unknown as bigint,
    sourceTokenAmount: null,
    sourceFulfillerAddr: null,
    sourceInitiateTxHash: null,
    sourceStartTxHash: null,
    sourceStatus: RozoPayOrderStatusSource.WAITING_PAYMENT,
    destStatus: RozoPayOrderStatusDest.PENDING,
    intentStatus: RozoPayIntentStatus.UNPAID,
    destFastFinishTxHash: null,
    destClaimTxHash: null,
    redirectUri: null,
    createdAt: Math.floor(Date.now() / 1000),
    lastUpdatedAt: Math.floor(Date.now() / 1000),
    orgId: order.orgId as string,
    metadata: {
      ...(order?.metadata ?? {}),
      ...(order.userMetadata ?? {}),
      ...(order.metadata ?? {}),
    } as any,
    externalId: order.externalId as string | null,
    userMetadata: order.userMetadata as RozoPayUserMetadata | null,
    expirationTs: BigInt(Math.floor(Date.now() / 1000 + 5 * 60).toString()),
    org: {
      orgId: order.orgId as string,
      name: "Pay Rozo",
    },
  };
}
