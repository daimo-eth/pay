import { Address, Hex } from "viem";
import { z } from "zod";

import type {
  SolanaAddress,
  SolanaTxHash,
  TronAddress,
  TronTxHash,
  UUID,
} from "./primitives.js";

export const zSessionStatus = z.enum([
  "requires_payment_method",
  "waiting_payment",
  "processing",
  "succeeded",
  "bounced",
  "expired",
]);

export type SessionStatus = z.infer<typeof zSessionStatus>;

/** UI display metadata. */
export type SessionDisplay = {
  /** Title shown in the payment modal, e.g. "Deposit to Acme". */
  title: string;
  /** One-word verb for CTAs, e.g. "Deposit". */
  verb: string;
  /** Optional custom theme CSS URL. */
  themeCssUrl?: string;
};

export type SessionDestination = SessionDestinationEvm;

export type SessionDestinationEvm = {
  type: "evm";
  /** Destination address, checksum encoded. */
  address: Address;
  /** Chain ID, e.g. 8453. */
  chainId: number;
  /** Chain name, e.g. "base". */
  chainName: string;
  /** Destination token address, checksum encoded. */
  tokenAddress: Address;
  /** Destination token symbol, e.g. "USDC". */
  tokenSymbol: string;
  /**
   * Requested amount in destination token units. e.g. "1.23" for $1.23 USDC.
   * Omitted for open-amount sessions.
   */
  amountUnits?: string;
  /** Optional calldata for the destination transaction. */
  calldata?: Hex;
  /**
   * Present when status is "succeeded" or "bounced".
   * On success, the delivery tx and amount received by the destination.
   * On bounce, the refund tx and amount returned to the refundAddress.
   */
  delivery?: {
    /** Transaction hash of the delivery or refund. */
    txHash: Hex;
    /** Amount received in destination token units, e.g. "1.23". */
    receivedUnits: string;
  };
};

export type PaymentMethod =
  | PaymentMethodEvm
  | PaymentMethodTron
  | PaymentMethodSolana
  | PaymentMethodAccountDeposit;

export type PaymentMethodAccountDeposit = {
  type: "account_deposit";
  /** When this payment method was created (unix seconds). */
  createdAt: number;
};

export type PaymentMethodEvm = {
  type: "evm";
  /** Address that receives user's funds, checksum encoded. */
  receiverAddress: Address;
  /** Populated once user initiates a transaction. */
  source?: {
    /** Sender address, checksum encoded. */
    address?: Address;
    /** Source chain ID, e.g. 8453. */
    chainId: number;
    /** Source chain name, e.g. "base". */
    chainName: string;
    /** Source token address, checksum encoded. */
    tokenAddress: Address;
    /** Source token symbol, e.g. "USDC". */
    tokenSymbol: string;
    /** Amount sent in source token units, e.g. "1.23". */
    sentUnits: string;
    /** Source transaction hash, set once tx is confirmed. */
    txHash?: Hex;
  };
  /** When this payment method was created (unix seconds). */
  createdAt: number;
};

export type PaymentMethodTron = {
  type: "tron";
  /** Address that receives user's funds. */
  receiverAddress: TronAddress;
  /** Populated once user initiates a transaction. */
  source?: {
    /** Sender address. */
    address?: TronAddress;
    chainId: 728126428;
    chainName: "tron";
    /** Source token address. */
    tokenAddress: TronAddress;
    /** Source token symbol, e.g. "USDT". */
    tokenSymbol: string;
    /** Amount sent in source token units, e.g. "1.23". */
    sentUnits: string;
    /** Source transaction hash, set once tx is confirmed. */
    txHash?: TronTxHash;
  };
  /** When this payment method was created (unix seconds). */
  createdAt: number;
};

export type PaymentMethodSolana = {
  type: "solana";
  /** Populated once user initiates a transaction. */
  source?: {
    /** Sender address. */
    address?: SolanaAddress;
    chainId: 501;
    chainName: "solana";
    /** Source token address (mint). */
    tokenAddress: SolanaAddress;
    /** Source token symbol, e.g. "USDC". */
    tokenSymbol: string;
    /** Amount sent in source token units, e.g. "1.23". */
    sentUnits: string;
    /** Source transaction hash, set once tx is confirmed. */
    txHash?: SolanaTxHash;
  };
  /** When this payment method was created (unix seconds). */
  createdAt: number;
};

export type UserMetadata = Record<string, string> | null;

/**
 * User-facing fee charged by the org to the end user. Independent of the
 * org-billing fee that Daimo charges. Set per-session at creation, immutable
 * for the lifetime of the session.
 */
export type UserFeeRule = {
  /** Fixed USD added to every fee, regardless of amount. */
  fixedUsd: number;
  /** Per-mille of mille (basis points). 100 = 1%, 1000 = 10% (hard cap). */
  bps: number;
};

/**
 * Quote of a user-facing fee for a specific dollar amount.
 *
 * For fixed-amount sessions: the merchant set destUsd; sourceUsd is what the
 * user must pay (dest + fee).
 *
 * For open-amount/Max sessions: the user picks sourceUsd; destUsd is what
 * the recipient receives (source - fee).
 */
export type UserFeeQuote = {
  /** What the user pays in source token USD. */
  sourceUsd: number;
  /** What the org charges the user, in USD. */
  feeUsd: number;
  /** What the recipient receives, in destination token USD. */
  destUsd: number;
};

/**
 * Session-level fee state surfaced to the modal and merchant SDK.
 * Only present when the session has a non-zero user fee rule.
 */
export type SessionFees = {
  user: {
    /** Snapshot of the rule at session creation. */
    rule: UserFeeRule;
    /**
     * Quote computed at create time for fixed-amount sessions. Omitted for
     * open-amount sessions, where the basis is unknown until the user picks an
     * amount.
     */
    quote?: UserFeeQuote;
    /**
     * Realized quote, populated once a fulfillment exists.
     * V1: tracked but not yet collected on-chain (DA contract update is
     * future work).
     */
    charged?: UserFeeQuote;
  };
};

export type SessionPublicInfo = {
  /** Unique ID for this session. */
  sessionId: UUID;
  /** Overall status. */
  status: SessionStatus;
  /** Funds destination. */
  destination: SessionDestination;
  /** Display metadata for UI rendering. */
  display: SessionDisplay;
  /** Latest payment method. */
  paymentMethod: PaymentMethod | null;
  /** Optional user-facing fee. Omitted when no fee is configured. */
  fees?: SessionFees;
  /** Created at (unix seconds). */
  createdAt: number;
  /** Expires at (unix seconds). */
  expiresAt: number;
};

/** Full server view. */
export type Session = SessionPublicInfo & {
  /** Metadata set at creation time. */
  metadata: UserMetadata;
  /** Session-scoped secret for client lifecycle management. */
  clientSecret: string;
};

export function isSessionTerminal(status: SessionStatus): boolean {
  return status === "succeeded" || status === "bounced" || status === "expired";
}

export function isSessionActive(status: SessionStatus): boolean {
  return !isSessionTerminal(status);
}

/** Payment has been initiated (processing, succeeded, or bounced). */
export function isSessionStarted(status: SessionStatus): boolean {
  return (
    status === "processing" || status === "succeeded" || status === "bounced"
  );
}
