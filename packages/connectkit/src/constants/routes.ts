export enum ROUTES {
  SELECT_METHOD = "daimoPaySelectMethod",
  SELECT_TOKEN = "daimoPaySelectToken",
  SELECT_AMOUNT = "daimoPaySelectAmount",
  SELECT_EXTERNAL_AMOUNT = "daimoPaySelectExternalAmount",
  SELECT_EXCHANGE = "daimoPaySelectExchange",
  SELECT_DEPOSIT_ADDRESS_AMOUNT = "daimoPaySelectDepositAddressAmount",
  SELECT_WALLET_AMOUNT = "daimoPaySelectWalletAmount",
  SELECT_WALLET_CHAIN = "daimoPaySelectWalletChain",
  SELECT_ZKP2P = "daimoPaySelectZKP2P",
  WAITING_EXTERNAL = "daimoPayWaitingExternal",
  WAITING_WALLET = "daimoPayWaitingWallet",
  SELECT_DEPOSIT_ADDRESS_CHAIN = "daimoPaySelectDepositAddressChain",
  WAITING_DEPOSIT_ADDRESS = "daimoPayWaitingDepositAddress",
  PAY_WITH_TOKEN = "daimoPayPayWithToken",
  CONFIRMATION = "daimoPayConfirmation",
  SOLANA_CONNECTOR = "daimoPaySolanaConnector",
  SOLANA_SELECT_AMOUNT = "daimoPaySolanaSelectAmount",
  SOLANA_PAY_WITH_TOKEN = "daimoPaySolanaPayWithToken",
  ERROR = "daimoPayError",

  // Unused routes. Kept to minimize connectkit merge conflicts.
  ONBOARDING = "onboarding",
  ABOUT = "about",
  CONNECTORS = "connectors",
  MOBILECONNECTORS = "mobileConnectors",
  CONNECT = "connect",
  DOWNLOAD = "download",
  SWITCHNETWORKS = "switchNetworks",
}
