import { rozoStellar } from "@rozoai/intent-common";
import { Asset } from "@stellar/stellar-sdk";

/**
 * ROZO CONFIG
 */
export const ROZO_INVOICE_URL = "https://invoice.rozo.ai";
export const ROZO_API_URL = "https://intentapiv2.rozo.ai/functions/v1/";
export const ROZO_API_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4Y3Zmb2xobmNtdXZmYXp1cXViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4Mzg2NjYsImV4cCI6MjA2ODQxNDY2Nn0.B4dV5y_-zCMKSNm3_qyCbAvCPJmoOGv_xB783LfAVUA";
export const ROZO_DAIMO_APP_ID = "rozoIntentPay";

export const ROZO_STELLAR_ADDRESS =
  "GDQDR7RY2GJW7XBENWAX7F5X42HBTA2YREAD6SYGZLUNDGDQ3DRRYBPK";
export const ROZO_BASE_ADDRESS = "0x5772FBe7a7817ef7F586215CA8b23b8dD22C8897";

// --- Stellar ---
export const DEFAULT_STELLAR_RPC_URL = "https://horizon.stellar.org";
export const STELLAR_NATIVE_ASSET = Asset.native();
export const STELLAR_USDC_ASSET_CODE = "USDC";
export const STELLAR_USDC_ISSUER_PK =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"; // Mainnet USDC Issuer

// --- Solana ---
export const SOLANA_USDC_ASSET_CODE = "USDC";
export const ROZO_SOLANA_USDC_MINT_ADDRESS =
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"; // Mainnet USDC Mint Address

// --- ⭐️ Updated Static Token Information to match JSON structure ---
export const STELLAR_XLM_TOKEN_INFO = {
  chainId: rozoStellar.chainId,
  token: "native",
  name: "Stellar Lumens",
  symbol: "XLM",
  decimals: 7,
  logoSourceURI: "https://invoice.rozo.ai/tokens/stellar.svg", // Placeholder
  logoURI: "https://invoice.rozo.ai/tokens/stellar.svg", // Placeholder
  usd: 0.1, // Default/fallback price
  priceFromUsd: 10,
  displayDecimals: 4,
  fiatSymbol: "$",
  maxAcceptUsd: 100000,
  maxSendUsd: 100000,
};

export const STELLAR_USDC_TOKEN_INFO = {
  chainId: rozoStellar.chainId, // Placeholder for Stellar Mainnet
  token: STELLAR_USDC_ISSUER_PK,
  name: "USD Coin",
  symbol: "USDC",
  decimals: 7,
  logoSourceURI: "https://invoice.rozo.ai/tokens/usdc.png",
  logoURI: "https://invoice.rozo.ai/tokens/usdc.png",
  usd: 1,
  priceFromUsd: 1,
  displayDecimals: 2,
  fiatSymbol: "$",
  maxAcceptUsd: 100000,
  maxSendUsd: 0,
};
