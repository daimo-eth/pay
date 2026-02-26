import { getAddress, Hex } from "viem";
import { z } from "zod";

export type UUID = string;

export type SolanaAddress = string;
export type SolanaTxHash = string;

export type TronAddress = string;
export type TronTxHash = string;

export const zUUID = z.string().uuid();

export const zAddress = z.string().transform((value) => getAddress(value));

export const zHex = z
  .string()
  .regex(/^0x[0-9a-fA-F]*$/)
  .refine((value): value is Hex => true);

export const zTronAddress = z.string().regex(/^T[1-9A-HJ-NP-Za-km-z]{33}$/);

export const zSolanaAddress = z
  .string()
  .regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);

export const zUnixTimestamp = z.number().int().nonnegative();
