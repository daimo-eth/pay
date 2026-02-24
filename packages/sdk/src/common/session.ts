import { Address, Hex } from "viem";
import { z } from "zod";
import { zAddress, zBigIntStr } from "./primitiveTypes.js";
import type { BigIntStr, SolanaPublicKey, UUID } from "./primitiveTypes.js";
import type { Token } from "./token.js";


// ─── Session ────────────────────────────────────────────────────────────────

/** Represents a transfer. On success, a session results in a single transfer from (fiat or crypto) to (fiat or crypto). */
export type Session = {
  /** Unique ID for this session. */
  sessionId: UUID;
  /** Overall state. Happy path: pending > processing > completed. */
  status: SessionState;
  /** Display metadata */
  display: SessionDisplay;
  /** Free-form metadata supplied at creation, available in webhooks and status polling. */
  metadata: UserMetadata;
  /** The source of funds for this session. Filled in once the session is paid. */
  source?: SessionSource;
  /** The receiver, which is where the source sends funds to. */
  receivers: SessionReceivers;
  /** The destination for this session. */
  destination: SessionDestination;
  // navTree: NavNode[];
  // orgId: string;
  /** Expiration, in Unix seconds. */
  expiresAt: number;
};

/** Session display metadata. */
export type SessionDisplay = {
  /** Title, eg "Deposit to Acme" */
  title: string;
  /** One-word verb, eg "Deposit" */
  verb: string;
  /** Custom theme CSS URL, overrides default theme */
  themeCssUrl?: string;
}

/** Source for a funds transfer. */
export type SessionSource = {
  type: "evm";
  /** Source address, checksum encoded. */
  address?: Address;
  /** Chain ID, eg 8453 */
  chainId: number;
  /** Chain name, eg "base" */
  chainName: string;
  /** Token address, checksum encoded. */
  tokenAddress: Address;
  /** Token symbol, eg "USDC" */
  tokenSymbol: string;
  /** Transaction hash of the initial deposit. */
  initTxHash: Hex;
  /** Units of tokenAddress, eg "1.23" for $1.23 USDT. */
  initUnits: string;
} | {
  type: "tron";
  /** Tron address that sent funds. */
  address: string;
  /** Token contract Tron address. */
  tokenAddress: string;
  /** Token symbol, eg "USDT" */
  tokenSymbol: string;
  /** Transaction hash of the initial deposit. */
  initTxHash: Hex;
  /** Units of tokenAddress, eg "1.23" for $1.23 USDT. */
  initUnits: string;
} | {
  type: "solana";
  /** Solana address that sent funds. */
  address: string;
  /** Token contract Solana address. */
  tokenAddress: string;
  /** Token symbol, eg "USDC" */
  tokenSymbol: string;
  /** Solana transaction signature for the initial deposit. */
  initTxHash: Hex;
  /** Units of tokenAddress, eg "1.23" for $1.23 USDC. */
  initUnits: string;
};

/** Receiver. Funds sent to ANY receiver for a given session will complete that session */
export type SessionReceivers = {
  evm: {address: Address},
  tron?: {address: string}
  // fiatAch?: { ... }
};

/** Destination for a funds transfer. */
export type SessionDestinationDefinition = SessionDestinationDefinitionEvm;

export type SessionDestinationDefinitionEvm = {
  type: "evm";
  /** Destination address, checksum encoded. */
  address: Address;
  /** Chain ID, eg 8453 */
  chainId: number;
  /** Chain name, eg "base" */
  chainName: string;
  /** Token address, checksum encoded. */
  tokenAddress: Address;
  /** Token symbol, eg "USDC" */
  tokenSymbol: string;
  /** Amount, eg "1.23" for $1.23 USDC. Omitted for sessions with no amount specified. */
  presetUnits?: string;
};

/** Destination, including the final transfer info for finished sessions. */
export type SessionDestination = SessionDestinationEvm;

export type SessionDestinationEvm = SessionDestinationDefinitionEvm & {
  finishTxHash?: Hex;
  finishUnits?: string;
} ;

// ─── Session state ──────────────────────────────────────────────────────────

export const zSessionState = z.enum([
  "pending",
  "processing",
  "completed",
  "bounced",
  "expired",
]);

export type SessionState = z.infer<typeof zSessionState>;

/**
 * Returns true if the session is still active (pending or processing), meaning
 * polling should continue. Returns false for terminal states (completed,
 * bounced, expired) where the session outcome is final.
 */
export function isSessionActive(state: SessionState): boolean {
  return state === "pending" || state === "processing";
}

// ─── CreateSession params ───────────────────────────────────────────────────

export type CreateSessionParams = {
  appId: string;
  display: {
    intent?: string;
    intentVerb?: string;
    paymentOptions?: (string | string[])[];
  };
  destination: {
    chain: number;
    token: Address;
    address: Address;
    units?: string;
    calldata?: Hex;
  };
  refundAddress?: Address;
  userMetadata?: UserMetadata;
};

// ─── Navigation tree ────────────────────────────────────────────────────────

type NavNodeCommon = {
  id: string;
  /** Page header title when this node is active */
  title: string;
  /** Button label when shown as option in parent (defaults to title) */
  label?: string;
  /** Icons to display on option button (defaults to child icons or node icon) */
  icons?: string[];
};

export type NavNodeChooseOption = NavNodeCommon & {
  type: "ChooseOption";
  options: NavNode[];
  /** Layout for displaying options. Defaults to "list". */
  layout?: "list" | "grid";
};

export type NavNodeDepositAddress = NavNodeCommon & {
  type: "DepositAddress";
  address: Address;
  chainId: number;
  icon?: string;
  minimumUsd: number;
  maximumUsd: number;
  expiresAt: number;
  tokenSuffix: string;
};

export type NavNodeDeeplink = NavNodeCommon & {
  type: "Deeplink";
  url: string;
  icon?: string;
};

export type NavNodeExchange = NavNodeCommon & {
  type: "Exchange";
  exchangeId: "Coinbase" | "Binance" | "Lemon";
  icon?: string;
  minimumUsd: number;
  maximumUsd: number;
};

export type NavNodeTronDeposit = NavNodeCommon & {
  type: "TronDeposit";
  icon?: string;
  minimumUsd: number;
  maximumUsd: number;
};

export type NavNodeConnectedWallet = NavNodeCommon & {
  type: "ConnectedWallet";
  icon?: string;
};

export type NavNode =
  | NavNodeChooseOption
  | NavNodeDepositAddress
  | NavNodeDeeplink
  | NavNodeExchange
  | NavNodeTronDeposit
  | NavNodeConnectedWallet;

// ─── Token amounts and payment options ──────────────────────────────────────

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
  usd: number;
}

export type WalletPaymentOption = {
  /** The user's balance of this token. */
  balance: DaimoPayTokenAmount;

  // TODO: deprecate, replace with requiredUsd / minRequiredUsd / feesUsd
  required: DaimoPayTokenAmount;
  minimumRequired: DaimoPayTokenAmount;
  fees: DaimoPayTokenAmount;

  /** If present, the option is disabled. */
  disabledReason?: string;

  /** If present, send directly to passthroughAddress, no swap or bridge. */
  passthroughAddress?: Address;
};

// ─── Payment option enums ───────────────────────────────────────────────────

export enum ExternalPaymentOptions {
  AllWallets = "AllWallets",
  ConnectedWallet = "ConnectedWallet",
  Metamask = "MetaMask",
  Trust = "Trust",
  Rainbow = "Rainbow",
  BaseApp = "Base App",
  Backpack = "Backpack",
  Bitget = "Bitget",
  Family = "Family",
  Farcaster = "Farcaster",
  Phantom = "Phantom",
  MiniPay = "MiniPay",
  OKX = "OKX",
  Solflare = "Solflare",
  World = "World",
  Zerion = "Zerion",
  AllExchanges = "AllExchanges",
  Coinbase = "Coinbase",
  Binance = "Binance",
  Lemon = "Lemon",
  AllAddresses = "AllAddresses",
  Tron = "Tron",
  Base = "Base",
  Arbitrum = "Arbitrum",
  Optimism = "Optimism",
  Polygon = "Polygon",
  Ethereum = "Ethereum",
  /** @deprecated */
  AllPaymentApps = "AllPaymentApps",
  /** @deprecated */
  Venmo = "Venmo",
  /** @deprecated */
  CashApp = "CashApp",
  /** @deprecated */
  MercadoPago = "MercadoPago",
  /** @deprecated */
  Revolut = "Revolut",
  /** @deprecated */
  Wise = "Wise",
  /** @deprecated */
  Zelle = "Zelle",
  /** @deprecated */
  Daimo = "Daimo",
  /** @deprecated */
  ExternalChains = "ExternalChains",
}

export type ExternalPaymentOptionsString = `${ExternalPaymentOptions}`;

export type ExternalPaymentOptionMetadata = {
  id: ExternalPaymentOptions;
  optionType: "external" | "exchange";
  cta: string;
  logoURI: string;
  logoShape: "circle" | "squircle";
  paymentToken: DaimoPayToken;
  disabled: boolean;
  message?: string;
  minimumUsd?: number;
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

// ─── Metadata schemas ───────────────────────────────────────────────────────

export const zUserMetadata = z
  .record(
    z.string().max(40, "metadata keys cannot be longer than 40 characters"),
    z.string().max(500, "metadata values cannot be longer than 500 characters"),
  )
  .nullable()
  .refine(
    (obj) => !obj || Object.keys(obj).length <= 50,
    "metadata cannot have more than 50 key-value pairs",
  );

export type UserMetadata = z.infer<typeof zUserMetadata>;

// --- Legacy PayOrder metadata; deprecated -----------------------------------

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
      preferredChains: z.array(z.number()).optional(),
      preferredTokens: z
        .array(
          z.object({
            chain: z.number(),
            address: zAddress.transform((a) => a),
          }),
        )
        .optional(),
      evmChains: z.array(z.number()).optional(),
      paymentOptions: z
        .array(z.union([z.string(), z.array(z.string())]))
        .optional(),
      passthroughTokens: z
        .array(
          z.object({
            chain: z.number(),
            address: zAddress.transform((a) => a),
          }),
        )
        .optional(),
    })
    .optional(),
  finalRefundUrl: z.string().optional(),
});

export type DaimoPayOrderMetadata = z.infer<typeof zDaimoPayOrderMetadata>;
