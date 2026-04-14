import { Address, Hex } from "viem";
import { z } from "zod";

import type { AccountRail } from "./account.js";
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
  /** Selected fiat rail, when known. */
  rail?: AccountRail;
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
