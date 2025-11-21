import {
  base,
  baseUSDC,
  bsc,
  bscUSDT,
  polygon,
  polygonUSDC,
  Token,
  worldchain,
  worldchainUSDC,
} from "@rozoai/intent-common";
import { useMemo } from "react";

const supportedChainsList = [base, polygon];
const supportedTokens = [baseUSDC, polygonUSDC];

/**
 * React hook to retrieve supported wallet payment chains and tokens.
 *
 * Returns the list of currently active chains and tokens in wallet payment options,
 * with dynamic logic for including BSC/Worldchain based on appId or preferences.
 *
 * CURRENTLY SUPPORTED CHAINS/TOKENS:
 * - Base (8453) - USDC
 * - Polygon (137) - USDC
 * - BSC (56) - USDT (only for MugglePay apps/pref)
 * - Worldchain (20240101) - USDC (only for World apps/pref)
 *
 * @param {string} appId - The Rozo appId; can affect which chains are enabled.
 * @param {number[]} [preferredChains=[]] - Preferred chain IDs (may enable Worldchain).
 * @returns {{
 *   chains: Array<{ chainId: number; [k: string]: any }>;
 *   tokens: Token[];
 * }} An object with arrays of supported chains and supported token addresses.
 *
 * @example
 * const { chains, tokens } = useSupportedChains("MP_demo", [8453, 56]);
 */
export function useSupportedChains(
  appId: string,
  preferredChains: number[] = []
): {
  chains: Array<{ chainId: number; [k: string]: any }>;
  tokens: Token[];
} {
  const showBSCUSDT = useMemo(() => appId.includes("MP"), [appId]);
  const showWorldchainUSDC = useMemo(
    () =>
      appId?.toLowerCase().includes("world") ||
      preferredChains?.includes(worldchain.chainId),
    [appId, preferredChains]
  );

  return {
    /**
     * Array of chain objects for use in wallet payment options UI.
     * Includes BSC and Worldchain if indicated by appId/preferences.
     */
    chains: [
      ...supportedChainsList,
      ...(showBSCUSDT ? [bsc] : []),
      ...(showWorldchainUSDC ? [worldchain] : []),
    ].filter(Boolean),
    /**
     * Array of supported payment token addresses.
     * Includes BSC USDT and Worldchain USDC if enabled.
     */
    tokens: [
      ...supportedTokens,
      ...(showBSCUSDT ? [bscUSDT] : []),
      ...(showWorldchainUSDC ? [worldchainUSDC] : []),
    ].filter(Boolean),
  };
}
