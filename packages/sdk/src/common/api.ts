import { z } from "zod";

import { zAccountRail } from "./account.js";
import type { TronAddress, UUID } from "./primitives.js";
import { zAddress, zSolanaAddress } from "./primitives.js";
import type { SessionPublicInfo } from "./session.js";

const zPlatform = z.enum(["ios", "android", "other", "desktop", "mobile"]);

export const zSessionId = z
  .string()
  .describe("Session ID");

export const zCreatePaymentMethodRequest = z.object({
  clientSecret: z.string(),
  paymentMethod: z.discriminatedUnion("type", [
    z.object({ type: z.literal("evm") }),
    z.object({ type: z.literal("tron"), amountUsd: z.number().positive() }),
    z.object({
      type: z.literal("solana"),
      walletAddress: z.string().min(1),
      inputTokenMint: z.string().min(1),
      amountUsd: z.number().positive(),
    }),
    z.object({
      type: z.literal("exchange"),
      exchangeId: z.enum(["Coinbase", "Binance", "Lemon", "CashApp"]),
      amountUsd: z.number().positive(),
      platform: zPlatform.optional(),
    }),
    z.object({
      type: z.literal("account_deposit"),
      rail: zAccountRail.optional(),
    }),
  ]),
});

export const zCheckSessionRequest = z.object({
  clientSecret: z.string(),
  txHash: z.string().optional(),
});

export const zTokenOptionsRequest = z
  .object({
    evmAddress: zAddress.optional(),
    solanaAddress: zSolanaAddress.optional(),
    clientSecret: z.string(),
  })
  .refine((data) => data.evmAddress || data.solanaAddress, {
    message: "at least one of evmAddress or solanaAddress is required",
  });

export const zLogNavEventRequest = z.object({
  clientSecret: z.string(),
  event: z.string().min(1),
});

export type CreatePaymentMethodRequest = z.output<
  typeof zCreatePaymentMethodRequest
>;

export type CheckSessionRequest = z.output<typeof zCheckSessionRequest>;

export type TokenOptionsRequest = z.output<typeof zTokenOptionsRequest>;
export type LogNavEventRequest = z.output<typeof zLogNavEventRequest>;

export type RetrieveSessionResponse = {
  /** Current session state. */
  session: SessionPublicInfo;
};

export type CreatePaymentMethodResponse = {
  /** Updated session state after payment method creation. */
  session: SessionPublicInfo;
  /** Tron-specific payment details, present when payment method is Tron. */
  tron?: {
    /** Tron address to send funds to. */
    receiverAddress: TronAddress;
    /** When this payment method expires (unix seconds). */
    expiresAt: number;
  };
  /** Solana-specific payment details, present when payment method is Solana. */
  solana?: {
    /** Base64-encoded Solana transaction for the user to sign. */
    serializedTx: string;
  };
  /** Exchange-specific payment details, present when payment method is Exchange. */
  exchange?: {
    /** Deeplink URL for the exchange. */
    url: string;
    /** Message to display while waiting. */
    waitingMessage: string;
    /** Invoice expiry time (unix seconds). Present for Lightning invoices. */
    expiresAt?: number;
  };
  /** Account deposit details, present when payment method is account_deposit. */
  accountDeposit?: {
    /** Hosted URL where the user completes KYC and the selected rail flow. */
    hostedUrl: string;
    /** Selected fiat rail for this hosted flow, when pinned to one rail. */
    rail?: z.infer<typeof zAccountRail>;
  };
};

export type CheckSessionResponse = {
  /** Current session state. */
  session: SessionPublicInfo;
};

export type TokenOption = {
  /** Chain ID, e.g. 8453. */
  chainId: number;
  /** Token contract address, checksum encoded. */
  tokenAddress: string;
  /** Token symbol, e.g. "USDC". */
  tokenSymbol: string;
  /** Amount required in token units, e.g. "1.23" for $1.23 USDC. */
  requiredUnits: string;
  /** User's balance in token units, e.g. "5.00" for $5.00 USDC. */
  balanceUnits?: string;
};

export type TokenOptionsResponse = {
  /** Session this token options response belongs to. */
  sessionId: UUID;
  /** Available token options the user can pay with. */
  options: TokenOption[];
};
