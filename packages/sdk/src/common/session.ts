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
  /** Requested amount in destination token units. */
  amountUnits?: string;
  /** Optional calldata for the destination transaction. */
  calldata?: Hex;
  /** Set once funds are delivered. */
  delivery?: {
    txHash: Hex;
    receivedUnits: string;
  };
};

export type PaymentMethod =
  | PaymentMethodEvm
  | PaymentMethodTron
  | PaymentMethodSolana;

export type PaymentMethodEvm = {
  type: "evm";
  /** Address that receives user's funds, checksum encoded. */
  receiverAddress: Address;
  /** Populated once user initiates a transaction. */
  source?: {
    address?: Address;
    chainId: number;
    chainName: string;
    tokenAddress: Address;
    tokenSymbol: string;
    sentUnits: string;
    txHash?: Hex;
  };
  createdAt: number;
};

export type PaymentMethodTron = {
  type: "tron";
  receiverAddress: TronAddress;
  source?: {
    address?: TronAddress;
    chainId: 728126428;
    chainName: "tron";
    tokenAddress: TronAddress;
    tokenSymbol: string;
    sentUnits: string;
    txHash?: TronTxHash;
  };
  createdAt: number;
};

export type PaymentMethodSolana = {
  type: "solana";
  source?: {
    address?: SolanaAddress;
    chainId: 501;
    chainName: "solana";
    tokenAddress: SolanaAddress;
    tokenSymbol: string;
    sentUnits: string;
    txHash?: SolanaTxHash;
  };
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
