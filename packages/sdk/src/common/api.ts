import { z } from "zod";

import type { TronAddress, UUID } from "./primitives.js";
import { zAddress, zSolanaAddress } from "./primitives.js";
import type { SessionPublicInfo } from "./session.js";

export const zSessionId = z.string().regex(/^[0-9a-f]{32}$/);

export const zCreatePaymentMethodRequest = z.object({
  clientSecret: z.string().min(1),
  paymentMethod: z.discriminatedUnion("type", [
    z.object({ type: z.literal("evm") }),
    z.object({ type: z.literal("tron"), amountUsd: z.number().positive() }),
    z.object({
      type: z.literal("solana"),
      walletAddress: z.string().min(1),
      inputTokenMint: z.string().min(1),
      amountUsd: z.number().positive(),
    }),
  ]),
});

export const zCheckSessionRequest = z.object({
  clientSecret: z.string().min(1),
  txHash: z.string().optional(),
});

export const zTokenOptionsRequest = z
  .object({
    evmAddress: zAddress.optional(),
    solanaAddress: zSolanaAddress.optional(),
    clientSecret: z.string().min(1),
  })
  .refine((data) => data.evmAddress || data.solanaAddress, {
    message: "at least one of evmAddress or solanaAddress is required",
  });

export const zLogNavEventRequest = z.object({
  clientSecret: z.string().min(1),
  event: z.string().min(1),
});

export type CreatePaymentMethodRequest = z.output<
  typeof zCreatePaymentMethodRequest
>;

export type CheckSessionRequest = z.output<typeof zCheckSessionRequest>;

export type TokenOptionsRequest = z.output<typeof zTokenOptionsRequest>;
export type LogNavEventRequest = z.output<typeof zLogNavEventRequest>;

export type RetrieveSessionResponse = { session: SessionPublicInfo };

export type CreatePaymentMethodResponse = {
  session: SessionPublicInfo;
  tron?: { receiverAddress: TronAddress; expiresAt: number };
  solana?: { serializedTx: string };
};

export type CheckSessionResponse = { session: SessionPublicInfo };

export type TokenOption = {
  chainId: number;
  tokenAddress: string;
  tokenSymbol: string;
  requiredUnits: string;
  balanceUnits?: string;
};

export type TokenOptionsResponse = {
  sessionId: UUID;
  options: TokenOption[];
};
