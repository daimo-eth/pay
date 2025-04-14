export enum PaymentMethod {
  Binance = "Binance",
  Coinbase = "Coinbase",
  Daimo = "Daimo",
  // ChangeNow chains. Bitcoin, Litecoin, Doge, Tron, etc.
  ExternalChains = "ExternalChains",
  EVMWallets = "EVMWallets",
  Lemon = "Lemon",
  RampNetwork = "RampNetwork",
  SolanaWallets = "SolanaWallets",
}

export enum PaymentMethodType {
  /** Payment method that links out to a deposit address. */
  DepositAddress = "DepositAddress",
  /** Pay with an EVM wallet. */
  EVMWallets = "EVMWallets",
  /** Payment method that links out to an external website. */
  External = "External",
  /** Pay with a Solana wallet. */
  SolanaWallets = "SolanaWallets",
}

export type PaymentMethodMetadata = {
  id: PaymentMethod;
  type: PaymentMethodType;
  cta: string;
  disabled: boolean;
  logos?: { uri: string; shape: "circle" | "squircle" }[];
  message?: string;
  minimumUsd?: number;
};
