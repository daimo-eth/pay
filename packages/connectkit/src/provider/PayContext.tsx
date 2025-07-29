import React, { createContext } from "react";

import { ROUTES } from "../constants/routes";
import { useConnectCallbackProps } from "../hooks/useConnectCallback";
import { PaymentState } from "../hooks/usePaymentState";
import {
  CustomTheme,
  RozoPayContextOptions,
  RozoPayModalOptions,
  Languages,
  Mode,
  Theme,
} from "../types";
import { SolanaWalletName } from "./SolanaContextProvider";
import { StellarWalletName } from "./StellarContextProvider";

/** Meant for internal use. This will be non-exported in a future SDK version. */
export const PayContext = createContext<PayContextValue | null>(null);

export type PayLogFn = (message: string, ...props: any[]) => void;

/** Rozo Pay internal context. */
export type PayContextValue = {
  theme: Theme;
  setTheme: React.Dispatch<React.SetStateAction<Theme>>;
  mode: Mode;
  setMode: React.Dispatch<React.SetStateAction<Mode>>;
  customTheme: CustomTheme | undefined;
  setCustomTheme: React.Dispatch<React.SetStateAction<CustomTheme | undefined>>;
  lang: Languages;
  setLang: React.Dispatch<React.SetStateAction<Languages>>;
  disableMobileInjector: boolean;
  setDisableMobileInjector: React.Dispatch<React.SetStateAction<boolean>>;
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

  // All options below are new, specific to Rozo Pay.
  /** Session ID. */
  sessionId: string;
  /** EVM pending connector */
  pendingConnectorId: string | undefined;
  setPendingConnectorId: (id: string) => void;
  /** Chosen Solana wallet, eg Phantom.*/
  solanaConnector: SolanaWalletName | undefined;
  setSolanaConnector: React.Dispatch<
    React.SetStateAction<SolanaWalletName | undefined>
  >;
  /** Chosen Stellar wallet, eg Lobstr.*/
  stellarConnector: StellarWalletName | undefined;
  setStellarConnector: React.Dispatch<
    React.SetStateAction<StellarWalletName | undefined>
  >;
  /** Global options, across all pay buttons and payments. */
  options?: RozoPayContextOptions;
  /** Loads a payment, then shows the modal to complete payment. */
  showPayment: (modalOptions: RozoPayModalOptions) => Promise<void>;
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
