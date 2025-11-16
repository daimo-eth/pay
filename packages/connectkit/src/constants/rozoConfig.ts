import { rozoStellar, rozoStellarUSDC, TokenLogo } from "@rozoai/intent-common";

/**
 * ROZO CONFIG
 * API constants are re-exported from @rozoai/intent-common for convenience
 */
export const ROZO_INVOICE_URL = "https://invoice.rozo.ai";

export const DEFAULT_ROZO_APP_ID = "rozoIntentPay";

// --- Stellar ---
export const DEFAULT_STELLAR_RPC_URL = "https://horizon.stellar.org";

// --- ⭐️ Updated Static Token Information to match JSON structure ---
export const STELLAR_XLM_TOKEN_INFO = {
  chainId: rozoStellar.chainId,
  token: "native",
  name: "Stellar Lumens",
  symbol: "XLM",
  decimals: 7,
  logoSourceURI: TokenLogo.XLM,
  logoURI: TokenLogo.XLM,
  usd: 0.1, // Default/fallback price
  priceFromUsd: 10,
  displayDecimals: 4,
  fiatSymbol: "$",
  maxAcceptUsd: 100000,
  maxSendUsd: 100000,
};

export const STELLAR_USDC_TOKEN_INFO = {
  chainId: rozoStellar.chainId, // Placeholder for Stellar Mainnet
  token: rozoStellarUSDC.token,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 7,
  logoSourceURI: TokenLogo.USDC,
  logoURI: TokenLogo.USDC,
  usd: 1,
  priceFromUsd: 1,
  displayDecimals: 2,
  fiatSymbol: "$",
  maxAcceptUsd: 100000,
  maxSendUsd: 0,
};
