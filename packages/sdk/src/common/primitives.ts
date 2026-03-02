import { getAddress, Hex } from "viem";
import { z } from "zod";

export type UUID = string;

export type SolanaAddress = string;
export type SolanaTxHash = string;

export type TronAddress = string;
export type TronTxHash = string;

export const zUUID = z.string().uuid().describe("UUID");

export const zHex = z
  .string()
  .regex(/^0x[0-9a-fA-F]*$/)
  .describe("Hex-encoded bytes")
  .refine((value): value is Hex => true);

export const zAddress = z
  .string()
  .regex(/^0x[0-9a-fA-F]{40}$/)
  .describe("Checksummed Ethereum address")
  .transform((value) => getAddress(value));

export const zSolanaAddress = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)
  .describe("Solana public key (base58)");

export const zTronAddress = z
  .string()
  .regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/)
  .describe("Tron address");

export const zUnixTimestamp = z.number().int().nonnegative();
