import React, { createContext } from "react";
import { SolanaWalletName } from "../provider/SolanaContextProvider";
import { ROUTES } from "../constants/routes";
import { Languages } from "../localizations";
import {
  CustomTheme,
  DaimoPayContextOptions,
  DaimoPayModalOptions,
  Mode,
  Theme,
} from "../types";
import { WalletConfigProps } from "../wallets/walletConfigs";
import { useConnectCallbackProps } from "./useConnectCallback";
import { PaymentState } from "./usePaymentState";

/** Daimo Pay internal context. */
export const usePayContext = () => {
  const context = React.useContext(PayContext);
  if (!context) throw Error("DaimoPay Hook must be inside a Provider.");
  return context;
};

/** Meant for internal use. This will be non-exported in a future SDK version. */
export const PayContext = createContext<PayContextValue | null>(null);

export type PayLogFn = (message: string, ...props: any[]) => void;

/** Daimo Pay internal context. */
export type PayContextValue = {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  customTheme: CustomTheme | undefined;
  setCustomTheme: React.Dispatch<React.SetStateAction<CustomTheme | undefined>>;
  lang: Languages;
  setLang: React.Dispatch<React.SetStateAction<Languages>>;
  setOnOpen: (fn?: () => void) => void;
  setOnClose: (fn?: () => void) => void;
  open: boolean;
  setOpen: (open: boolean, meta?: Record<string, any>) => void;
  route: string;
  setRoute: (route: ROUTES, data?: Record<string, any>) => void;
  errorMessage: string | React.ReactNode | null;
  debugMode?: boolean;
  log: PayLogFn;
  displayError: (message: string | React.ReactNode | null, code?: any) => void;
  resize: number;
  triggerResize: () => void;

  // All options below are new, specific to Daimo Pay.
  /** Session ID. */
  sessionId: string;
  /** EVM mobile connector */
  wcWallet: WalletConfigProps | undefined;
  /** EVM pending connector */
  pendingConnectorId: string | undefined;
  setPendingConnectorId: (id: string) => void;
  /** Chosen Solana wallet, eg Phantom.*/
  solanaConnector: SolanaWalletName | undefined;
  setSolanaConnector: React.Dispatch<
    React.SetStateAction<SolanaWalletName | undefined>
  >;
  /** Global options, across all pay buttons and payments. */
  options?: DaimoPayContextOptions;
  /** Loads a payment, then shows the modal to complete payment. */
  showPayment: (modalOptions: DaimoPayModalOptions) => Promise<void>;
  /** Payment status & callbacks. */
  paymentState: PaymentState;
  /** TRPC API client. Internal use only. */
  trpc: any;
  /** Callback to call when the payment is successful. */
  onSuccess: () => void;
  /** Custom message to display on confirmation page. */
  confirmationMessage?: string;
  setConfirmationMessage: React.Dispatch<
    React.SetStateAction<string | undefined>
  >;
  /** Redirect URL to return to the app. E.g. after Coinbase, Binance, RampNetwork. */
  redirectReturnUrl?: string;
  setRedirectReturnUrl: React.Dispatch<
    React.SetStateAction<string | undefined>
  >;
} & useConnectCallbackProps;
