// TODO: this file defines types that shouldn't be exposed to the client.
// Clean this up to only expose the types that are needed by the client.

import { base58 } from "@scure/base";
import {
  Address,
  bytesToBigInt,
  formatUnits,
  getAddress,
  Hex,
  numberToBytes,
  zeroAddress,
} from "viem";
import z from "zod";
import { Token } from "./token";

import { assertNotNull } from "./assert";
import {
  BigIntStr,
  SolanaPublicKey,
  zAddress,
  zBigIntStr,
} from "./primitiveTypes";

// lifecycle: waiting payment -> pending processing -> start submitted -> processed (onchain tx was successful)
export enum DaimoPayOrderStatusSource {
  WAITING_PAYMENT = "waiting_payment",
  PENDING_PROCESSING = "pending_processing",
  START_SUBMITTED = "start_submitted",
  /* Start transaction receipt confirmed. */
  PROCESSED = "processed",
}

// lifecycle: pending -> fast-finish-submitted (onchain tx submitted) -> fast-finished (onchain tx was successful) -> claimed (onchain tx was successful)
export enum DaimoPayOrderStatusDest {
  PENDING = "pending",
  FAST_FINISH_SUBMITTED = "fast_finish_submitted",
  /* Fast finish transaction receipt confirmed. */
  FAST_FINISHED = "fast_finished",
  CLAIM_SUCCESSFUL = "claimed",
}

export enum DaimoPayOrderMode {
  SALE = "sale", // product or item sale
  CHOOSE_AMOUNT = "choose_amount", // let the user specify the amount to pay
  HYDRATED = "hydrated", // once hydrated, the order is final and all parameters are known and immutable
}

/**
 * Status values:
 * - `payment_unpaid` - the user has not paid yet
 * - `payment_started` - the user has paid & payment is in progress. This status
 *    typically lasts a few seconds.
 * - `payment_completed` - the final call or transfer succeeded
 * - `payment_bounced` - the final call or transfer reverted. Funds were sent
 *    to the payment's configured refund address on the destination chain.
 */
export enum DaimoPayIntentStatus {
  UNPAID = "payment_unpaid",
  STARTED = "payment_started",
  COMPLETED = "payment_completed",
  BOUNCED = "payment_bounced",
}

export interface DaimoPayOrderItem {
  name: string;
  description: string;
  image?: string;
}

export const zBridgeTokenOutOptions = z.array(
  z.object({
    token: zAddress,
    amount: zBigIntStr.transform((a) => BigInt(a)),
  }),
);

export type BridgeTokenOutOptions = z.infer<typeof zBridgeTokenOutOptions>;

// NOTE: be careful to modify this type only in backward-compatible ways.
//       Add OPTIONAL fields, etc. Anything else requires a migration.
export const zDaimoPayOrderMetadata = z.object({
  style: z
    .object({
      background: z.string().optional().describe("Background color."),
    })
    .optional()
    .describe("Style of the checkout page."),
  orgLogo: z.string().optional().describe("Logo of the organization."),
  intent: z
    .string()
    .describe("Title verb, eg 'Preorder', 'Check out', 'Deposit'."),
  items: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        image: z.string().optional(),
        price: z.string().optional(),
        priceDetails: z.string().optional(),
      }),
    )
    .describe("Details about what's being ordered, donated, deposited, etc."),
  payer: z
    .object({
      preferredChains: z
        .array(z.number())
        .optional()
        .describe(
          "Preferred chain IDs, in descending order. Any assets the user owns on preferred chains will appear first. Defaults to destination chain.",
        ),
      preferredTokens: z
        .array(
          z.object({
            chain: z.number(),
            address: zAddress.transform((a) => getAddress(a)),
          }),
        )
        .optional()
        .describe(
          "Preferred tokens, in descending order. Any preferred assets the user owns will appear first. Defaults to destination token.",
        ),
      // Filter to only allow payments on these chains. Keep this
      // parameter undocumented. Only for specific customers.
      evmChains: z
        .array(z.number())
        .optional()
        .describe(
          "Filter to only allow payments on these EVM chains. Defaults to all chains.",
        ),
      paymentOptions: z
        .array(z.string())
        .optional()
        .describe(
          "Payment options like Coinbase, Binance, etc. Defaults to all available options.",
        ),
    })
    .optional()
    .describe(""),
});

export type DaimoPayOrderMetadata = z.infer<typeof zDaimoPayOrderMetadata>;

/**
 * The user-passed metadata must meet these criteria:
 * - All keys must be strings
 * - All values must be strings
 * - At most 50 key-value pairs
 * - Maximum of 40 characters per key
 * - Maximum of 500 characters per value
 */
export const zDaimoPayUserMetadata = z
  .record(
    z.string().max(40, "Metadata keys cannot be longer than 40 characters"),
    z.string().max(500, "Metadata values cannot be longer than 500 characters"),
  )
  .nullable()
  .refine(
    (obj) => !obj || Object.keys(obj).length <= 50,
    "Metadata cannot have more than 50 key-value pairs",
  );

export type DaimoPayUserMetadata = z.infer<typeof zDaimoPayUserMetadata>;

export type DaimoPayDehydratedOrder = {
  mode: DaimoPayOrderMode.SALE | DaimoPayOrderMode.CHOOSE_AMOUNT;
  id: bigint;
  destFinalCallTokenAmount: DaimoPayTokenAmount;
  destFinalCall: OnChainCall;
  nonce: bigint;
  redirectUri: string | null;
  orgId: string | null;
  createdAt: number | null;
  lastUpdatedAt: number | null;
  intentStatus: DaimoPayIntentStatus;
  metadata: DaimoPayOrderMetadata;
  externalId: string | null;
  userMetadata: DaimoPayUserMetadata | null;
  refundAddr: Address | null;
};

export type DaimoPayHydratedOrder = {
  mode: DaimoPayOrderMode.HYDRATED;
  id: bigint;
  intentAddr: Address;
  /** Nullable because old intents don't record escrow address. */
  escrowContractAddress: Address | null;
  /** Nullable because old intents don't record bridger address. */
  bridgerContractAddress: Address | null;
  /** @deprecated included for backcompat with old versions. Remove soon. */
  handoffAddr: Address;
  bridgeTokenOutOptions: DaimoPayTokenAmount[];
  selectedBridgeTokenOutAddr: Address | null;
  selectedBridgeTokenOutAmount: bigint | null;
  destFinalCallTokenAmount: DaimoPayTokenAmount;
  destFinalCall: OnChainCall;
  usdValue: number;
  refundAddr: Address;
  nonce: bigint;
  sourceFulfillerAddr: Address | SolanaPublicKey | null;
  sourceTokenAmount: DaimoPayTokenAmount | null;
  sourceInitiateTxHash: Hex | null;
  sourceStartTxHash: Hex | null;
  sourceStatus: DaimoPayOrderStatusSource;
  destStatus: DaimoPayOrderStatusDest;
  destFastFinishTxHash: Hex | null;
  destClaimTxHash: Hex | null;
  redirectUri: string | null;
  orgId: string | null;
  sourceInitiateUpdatedAt: number | null;
  createdAt: number | null;
  lastUpdatedAt: number | null;
  intentStatus: DaimoPayIntentStatus;
  metadata: DaimoPayOrderMetadata;
  externalId: string | null;
  userMetadata: DaimoPayUserMetadata | null;
  /** Nullable because old intents don't have expiration time. */
  expirationTs: bigint | null;
};

export type DaimoPayOrderWithOrg = DaimoPayOrder & {
  org: DaimoPayOrgPublicInfo;
};

export type DaimoPayHydratedOrderWithOrg = DaimoPayHydratedOrder & {
  org: DaimoPayOrgPublicInfo;
};

export type DaimoPayOrgPublicInfo = {
  orgId: string;
  name: string;
  logoURI?: string;
};

export type DaimoPayHydratedOrderWithoutIntentAddr = Omit<
  DaimoPayHydratedOrder,
  "intentAddr" | "handoffAddr"
>;

export type DaimoPayOrder = DaimoPayDehydratedOrder | DaimoPayHydratedOrder;

export function isHydrated(
  order: DaimoPayOrder,
): order is DaimoPayHydratedOrder {
  return order.mode === DaimoPayOrderMode.HYDRATED;
}

export type DaimoPayOrderView = {
  id: DaimoPayOrderID;
  status: DaimoPayIntentStatus;
  createdAt: string;
  display: {
    intent: string;
    paymentValue: string;
    currency: "USD";
  };
  source: {
    payerAddress: Address | SolanaPublicKey | null;
    txHash: Hex | string | null;
    chainId: string;
    amountUnits: string;
    tokenSymbol: string;
    tokenAddress: Address | string;
  } | null;
  destination: {
    destinationAddress: Address;
    txHash: Hex | null;
    chainId: string;
    amountUnits: string;
    tokenSymbol: string;
    tokenAddress: Address;
    callData: Hex | null;
  };
  externalId: string | null;
  metadata: DaimoPayUserMetadata | null;
};

export function getOrderSourceChainId(
  order: DaimoPayHydratedOrder,
): number | null {
  if (order.sourceTokenAmount == null) {
    return null;
  }
  return order.sourceTokenAmount.token.chainId;
}

export function getOrderDestChainId(
  order: DaimoPayOrder | DaimoPayHydratedOrderWithoutIntentAddr,
): number {
  return order.destFinalCallTokenAmount.token.chainId;
}

export function getDaimoPayOrderView(order: DaimoPayOrder): DaimoPayOrderView {
  return {
    id: writeDaimoPayOrderID(order.id),
    status: order.intentStatus,
    createdAt: assertNotNull(
      order.createdAt,
      `createdAt is null for order with id: ${order.id}`,
    ).toString(),
    display: {
      intent: order.metadata.intent,
      // Show 2 decimal places for USD
      paymentValue: order.destFinalCallTokenAmount.usd.toFixed(2),
      currency: "USD",
    },
    source:
      order.mode === DaimoPayOrderMode.HYDRATED &&
      order.sourceTokenAmount != null
        ? {
            payerAddress: order.sourceFulfillerAddr,
            txHash: order.sourceInitiateTxHash,
            chainId: assertNotNull(
              getOrderSourceChainId(order),
              `source chain id is null for order with source token: ${order.id}`,
            ).toString(),
            amountUnits: formatUnits(
              BigInt(order.sourceTokenAmount.amount),
              order.sourceTokenAmount.token.decimals,
            ),
            tokenSymbol: order.sourceTokenAmount.token.symbol,
            tokenAddress: order.sourceTokenAmount.token.token,
          }
        : null,
    destination: {
      destinationAddress: order.destFinalCall.to,
      txHash:
        order.mode === DaimoPayOrderMode.HYDRATED
          ? (order.destFastFinishTxHash ?? order.destClaimTxHash)
          : null,
      chainId: getOrderDestChainId(order).toString(),
      amountUnits: formatUnits(
        BigInt(order.destFinalCallTokenAmount.amount),
        order.destFinalCallTokenAmount.token.decimals,
      ),
      tokenSymbol: order.destFinalCallTokenAmount.token.symbol,
      tokenAddress: getAddress(order.destFinalCallTokenAmount.token.token),
      callData: order.destFinalCall.data,
    },
    externalId: order.externalId,
    metadata: order.userMetadata,
  };
}

export type WalletPaymentOption = {
  balance: DaimoPayTokenAmount;

  // TODO: deprecate, replace with requiredUsd / minRequiredUsd / feesUsd
  // These are overly large objects that duplicate DaimoPayToken
  required: DaimoPayTokenAmount;
  minimumRequired: DaimoPayTokenAmount;
  fees: DaimoPayTokenAmount;

  disabledReason?: string;
};

export type ExternalPaymentOptionMetadata = {
  id: ExternalPaymentOptions;
  optionType: "external" | "zkp2p" | "exchange";
  cta: string;
  logoURI: string;
  logoShape: "circle" | "squircle";
  paymentToken: DaimoPayToken;
  disabled: boolean;
  message?: string;
  minimumUsd?: number;
};

export enum ExternalPaymentOptions {
  Daimo = "Daimo",
  Solana = "Solana",
  ExternalChains = "ExternalChains",
  // All exchanges
  AllExchanges = "AllExchanges",
  Coinbase = "Coinbase",
  Binance = "Binance",
  Lemon = "Lemon",
  // All available payment apps
  AllPaymentApps = "AllPaymentApps",
  Venmo = "Venmo",
  CashApp = "CashApp",
  MercadoPago = "MercadoPago",
  Revolut = "Revolut",
  Wise = "Wise",
  Zelle = "Zelle",
}

export type ExternalPaymentOptionsString = `${ExternalPaymentOptions}`;

export type ExternalPaymentOptionData = {
  url: string;
  waitingMessage: string;
};

export enum DepositAddressPaymentOptions {
  TRON_USDT = "USDT on Tron",
  BASE = "Base",
  ARBITRUM = "Arbitrum",
  OP_MAINNET = "Optimism",
  POLYGON = "Polygon",
  ETH_L1 = "Ethereum",

  /** @deprecated */
  BITCOIN = "Bitcoin",
  /** @deprecated */
  TON = "TON",
  /** @deprecated */
  MONERO = "Monero",
  /** @deprecated */
  DOGE = "Doge",
  /** @deprecated */
  LITECOIN = "Litecoin",
  /** @deprecated */
  ZCASH = "Zcash",
  /** @deprecated */
  DASH = "Dash",
}

export type DepositAddressPaymentOptionMetadata = {
  id: DepositAddressPaymentOptions;
  logoURI: string;
  minimumUsd: number;
};

export type DepositAddressPaymentOptionData = {
  address: string;
  uri: string;
  amount: string;
  suffix: string;
  expirationS: number;
};

export interface DaimoPayToken extends Token {
  token: Address | SolanaPublicKey;
  /** Price to convert 1.0 of this token to a USD stablecoin. */
  usd: number;
  /** Price to convert $1 to this token T. If 2.00, then we receive 0.5 T. */
  priceFromUsd: number;
  /** Max payment accepted in this token, based on liquidity & mode. */
  maxAcceptUsd: number;
  /** Max payment we can send from this token, based on liquidity & mode. */
  maxSendUsd: number;
  /** Display decimals, separate from token decimals. Eg: 2 for USDC. */
  displayDecimals: number;
  /** Symbol for fiat currency, eg: "$" */
  fiatSymbol?: string;
}

export interface DaimoPayTokenAmount {
  token: DaimoPayToken;
  amount: BigIntStr;
  usd: number; // amount in dollars
}

export type OnChainCall = {
  to: Address;
  data: Hex;
  value: bigint;
};

export const emptyOnChainCall: OnChainCall = {
  to: zeroAddress,
  data: "0x",
  value: 0n,
};

// base58 encoded bigint
const zDaimoPayOrderID = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]+$/);

export type DaimoPayOrderID = z.infer<typeof zDaimoPayOrderID>;

/**
 * Read a base58-encoded id into a bigint.
 */
export function readDaimoPayOrderID(id: string): bigint {
  return bytesToBigInt(base58.decode(id));
}

/**
 * Write a bigint into a base58-encoded id.
 */
export function writeDaimoPayOrderID(id: bigint): string {
  return base58.encode(numberToBytes(id));
}

export const zUUID = z.string().uuid();

export type UUID = z.infer<typeof zUUID>;

export enum DaimoPayEventType {
  PaymentStarted = "payment_started",
  PaymentCompleted = "payment_completed",
  PaymentBounced = "payment_bounced",
  PaymentRefunded = "payment_refunded",
}

export type PaymentStartedEvent = {
  type: DaimoPayEventType.PaymentStarted;
  isTestEvent?: boolean;
  paymentId: DaimoPayOrderID;
  chainId: number;
  txHash: Hex | string | null;
  payment: DaimoPayOrderView;
};

export type PaymentCompletedEvent = {
  type: DaimoPayEventType.PaymentCompleted;
  isTestEvent?: boolean;
  paymentId: DaimoPayOrderID;
  chainId: number;
  txHash: Hex;
  payment: DaimoPayOrderView;
};

export type PaymentBouncedEvent = {
  type: DaimoPayEventType.PaymentBounced;
  isTestEvent?: boolean;
  paymentId: DaimoPayOrderID;
  chainId: number;
  txHash: Hex;
  payment: DaimoPayOrderView;
};

export type PaymentRefundedEvent = {
  type: DaimoPayEventType.PaymentRefunded;
  isTestEvent?: boolean;
  paymentId: DaimoPayOrderID;
  refundAddress: Address;
  chainId: number;
  tokenAddress: Address;
  txHash: Hex;
  amountUnits: string;
  payment: DaimoPayOrderView;
};

export type DaimoPayEvent =
  | PaymentStartedEvent
  | PaymentCompletedEvent
  | PaymentBouncedEvent
  | PaymentRefundedEvent;

export interface WebhookEndpoint {
  id: UUID;
  orgId: UUID;
  url: string;
  token: string;
  createdAt: Date;
  deletedAt: Date | null;
}

// Lifecycle: Pending (just created) -> (if failing) Retrying (exponential backoff) -> Successful or Failed
export enum WebhookEventStatus {
  PENDING = "pending", // waiting to be delivered
  RETRYING = "retrying", // currently in exponential backoff queue
  SUCCESSFUL = "successful", // successfully delivered
  FAILED = "failed", // gave up after retrying
}

export interface WebhookEvent {
  id: UUID;
  endpoint: WebhookEndpoint;
  isTestEvent: boolean;
  body: DaimoPayEvent;
  status: WebhookEventStatus;
  deliveries: WebhookDelivery[];
  createdAt: Date;
}

export interface WebhookDelivery {
  id: UUID;
  eventId: UUID;
  httpStatus: number | null;
  body: string | null;
  createdAt: Date;
}
