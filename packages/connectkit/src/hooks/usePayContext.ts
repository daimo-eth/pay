import React, { createContext } from "react";
import { ROUTES } from "../constants/routes";
import { useConnectCallbackProps } from "./useConnectCallback";
import { PaymentState } from "./usePaymentState";
import { Languages } from "../localizations";
import {
  CustomTheme,
  DaimoPayContextOptions,
  DaimoPayModalOptions,
  Mode,
  Theme,
} from "../types";
import { WalletConfigProps } from "../wallets/walletConfigs";
import { SolanaWalletName } from "../components/contexts/solana";

/** Daimo Pay internal context. */
export const usePayContext = () => {
  const context = React.useContext(PayContext);
  if (!context) throw Error("DaimoPay Hook must be inside a Provider.");
  return context;
};

/** Meant for internal use. This will be non-exported in a future SDK version. */
export const PayContext = createContext<PayContextValue | null>(null);

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
  open: boolean;
  setOpen: (open: boolean, meta?: Record<string, any>) => void;
  route: string;
  setRoute: (route: ROUTES, data?: Record<string, any>) => void;
  connector: Connector;
  setConnector: React.Dispatch<React.SetStateAction<Connector>>;
  wcWallet: WalletConfigProps | undefined;
  setWcWallet: React.Dispatch<
    React.SetStateAction<WalletConfigProps | undefined>
  >;
  errorMessage: string | React.ReactNode | null;
  debugMode?: boolean;
  log: (...props: any) => void;
  displayError: (message: string | React.ReactNode | null, code?: any) => void;
  resize: number;
  triggerResize: () => void;

  // All options below are new, specific to Daimo Pay.
  /** Session ID. */
  sessionId: string;
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

/** Chosen Ethereum wallet, eg MM or Rainbow. Specifies wallet ID. */
type Connector = {
  id: string;
};
