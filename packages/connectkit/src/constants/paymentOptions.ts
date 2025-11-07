import {
  ExternalPaymentOptions,
  ExternalPaymentOptionsString,
} from "@daimo/pay-common";

// Top-level categories the UI understands at the first select screen
export const TOP_LEVEL_PAYMENT_OPTIONS: ExternalPaymentOptionsString[] = [
  ExternalPaymentOptions.AllWallets,
  ExternalPaymentOptions.AllExchanges,
  ExternalPaymentOptions.AllAddresses,
  ExternalPaymentOptions.AllPaymentApps,
  ExternalPaymentOptions.Tron,
];

// Default order when no explicit order is provided
export const DEFAULT_TOP_OPTIONS_ORDER: ExternalPaymentOptionsString[] = [
  ExternalPaymentOptions.AllWallets,
  ExternalPaymentOptions.AllExchanges,
  ExternalPaymentOptions.AllAddresses,
];

// Specific option ids by category (excluding the All* entries)
export const WALLET_OPTION_IDS: ExternalPaymentOptionsString[] = [
  ExternalPaymentOptions.Metamask,
  ExternalPaymentOptions.Trust,
  ExternalPaymentOptions.Rainbow,
  ExternalPaymentOptions.BaseApp,
  ExternalPaymentOptions.Backpack,
  ExternalPaymentOptions.Bitget,
  ExternalPaymentOptions.Family,
  ExternalPaymentOptions.Farcaster,
  ExternalPaymentOptions.Phantom,
  ExternalPaymentOptions.MiniPay,
  ExternalPaymentOptions.OKX,
  ExternalPaymentOptions.Solflare,
  ExternalPaymentOptions.World,
  ExternalPaymentOptions.Zerion,
];

export const EXCHANGE_OPTION_IDS: ExternalPaymentOptionsString[] = [
  ExternalPaymentOptions.Coinbase,
  ExternalPaymentOptions.Binance,
  ExternalPaymentOptions.Lemon,
];

export const ADDRESS_OPTION_IDS: ExternalPaymentOptionsString[] = [
  ExternalPaymentOptions.Tron,
  ExternalPaymentOptions.Base,
  ExternalPaymentOptions.Arbitrum,
  ExternalPaymentOptions.Optimism,
  ExternalPaymentOptions.Polygon,
  ExternalPaymentOptions.Ethereum,
];

/** Infer which top-level category a nested array corresponds to. */
export function inferTopLevelFromArray(
  items: string[],
):
  | typeof ExternalPaymentOptions.AllWallets
  | typeof ExternalPaymentOptions.AllExchanges
  | typeof ExternalPaymentOptions.AllAddresses
  | undefined {
  const areAllWallets = items.every((i) =>
    WALLET_OPTION_IDS.includes(i as ExternalPaymentOptionsString),
  );
  if (areAllWallets) return ExternalPaymentOptions.AllWallets;

  const areAllExchanges = items.every((i) =>
    EXCHANGE_OPTION_IDS.includes(i as ExternalPaymentOptionsString),
  );
  if (areAllExchanges) return ExternalPaymentOptions.AllExchanges;

  const areAllAddresses = items.every((i) =>
    ADDRESS_OPTION_IDS.includes(i as ExternalPaymentOptionsString),
  );
  if (areAllAddresses) return ExternalPaymentOptions.AllAddresses;

  return undefined;
}
