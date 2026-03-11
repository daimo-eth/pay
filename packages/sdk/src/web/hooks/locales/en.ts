/** English (default) strings for DaimoModal UI. */
export const en = {
  // ConfirmationPage
  confirmYourPayment: "Confirm Your Payment",
  waitingForYourPayment: "Waiting for Your Payment",
  paymentReceived: "Payment Received",
  processingYourPayment: "Processing Your Payment...",
  paymentCompleted: "Payment Completed",
  refundingYourPayment: "Refunding Your Payment",
  paymentRefunded: "Payment Refunded",
  returnToApp: "Return to App",
  onChain: "on",

  // ExpiredPage
  expired: "Expired",
  paymentSessionExpired: "This payment session has expired",

  // DeeplinkPage
  continueIn: "Continue in",
  toCompleteYourPayment: "to complete your payment",
  openIn: "Open in",
  scanWithPhone: "Scan with your phone to open wallet",

  // ExchangePage
  continueTo: "Continue to",
  toCompleteYourDeposit: "to complete your deposit",
  open: "Open",
  refreshInvoice: "Refresh",

  // SelectAmountPage
  selectAmount: "Select Amount",
  loading: "Loading...",
  continue: "Continue",

  // SelectTokenPage
  selectToken: "Select Token",
  noTokensFound: "No tokens found",
  minimum: "Minimum",
  maximum: "Maximum",

  // WaitingDepositAddressPage
  deposit: "Deposit",
  depositOn: "Deposit on",
  generateNewAddress: "Generate New Address",
  showQR: "Show QR",
  hideQR: "Hide QR",
  oneTimeAddress: "One-Time Address",
  amount: "Amount",
  expiresIn: "Expires in:",

  // WalletAmountPage
  enterAmount: "Enter Amount",
  max: "Max",
  balance: "Balance:",

  // ErrorPage
  error: "Error",
  reload: "Reload",
  unknownError: "unknown error",

  // shared
  contactSupport: "Contact Support",
  tellUsHowWeCanHelp: "Tell us how we can help",
  showReceipt: "Show Receipt",
  poweredByDaimo: "Powered by Daimo",

  // containers
  close: "Close",

  // flows
  flowError: "Error:",
  back: "Back",
  tryAgain: "Try again",

  // hooks/useSessionNav
  tronUnavailable: "Tron unavailable. Try again later.",

  // formatUserError
  networkErrorOffline: "Network error. Offline?",
  somethingWentWrong: "Something went wrong",

  // embed page
  missingSessionParam: "missing session parameter",
  failedToLoadSession: "failed to load session",

  // session page
  connect: "Connect",
  connectWallet: "Connect Wallet",
  walletUnavailable: "Wallet unavailable",
  walletDisconnected: "Wallet disconnected",
  switchToChain: (chain: string) => `Please switch to ${chain}`,
  transactionFailed: "Transaction Failed",
  paymentCancelled: "Payment Cancelled",
  retryPayment: "Retry Payment",
  closeAndReturn: "Close this page and return to app",
};
