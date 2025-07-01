import { ReactNode } from "react";
import { CustomAvatarProps } from "./components/Common/Avatar";
import { Languages as Lang } from "./localizations";
export type Languages = Lang;

export type Theme =
  | "auto"
  | "web95"
  | "retro"
  | "soft"
  | "midnight"
  | "minimal"
  | "rounded"
  | "nouns";
export type Mode = "light" | "dark" | "auto";
export type CustomTheme = any; // TODO: define type

export type All = {
  theme?: Theme;
  mode?: Mode;
  customTheme?: CustomTheme;
  lang?: Languages;
};

export type { CustomAvatarProps };

/** Global options, across all pay buttons and payments. */
export type DaimoPayContextOptions = {
  language?: Languages;
  hideBalance?: boolean;
  hideTooltips?: boolean;
  hideQuestionMarkCTA?: boolean;
  hideNoWalletCTA?: boolean;
  hideRecentBadge?: boolean;
  /** Avoids layout shift when the DaimoPay modal is open by adding padding to the body */
  avoidLayoutShift?: boolean;
  /** Automatically embeds Google Font of the current theme. Does not work with custom themes */
  embedGoogleFonts?: boolean;
  truncateLongENSAddress?: boolean;
  reducedMotion?: boolean;
  disclaimer?: ReactNode | string;
  bufferPolyfill?: boolean;
  customAvatar?: React.FC<CustomAvatarProps>;
  initialChainId?: number;
  enforceSupportedChains?: boolean;
  ethereumOnboardingUrl?: string;
  walletOnboardingUrl?: string;
  /** Blur the background when the modal is open */
  overlayBlur?: number;
  /** Disable mobile wallet injector detection */
  disableMobileInjector?: boolean;
};

/** Modal UI options, set on the pay button triggering that modal. */
export type DaimoPayModalOptions = {
  closeOnSuccess?: boolean;
  resetOnSuccess?: boolean;
  connectedWalletOnly?: boolean;
};

// TODO: move types here from daimo-common/daimoPay.ts:
// type PayEventBase = {
//   /** The type of payment event. */
//   type: PaymentStatus;
//   /** The unique payment ID. */
//   paymentId: string;
//   /** The chain ID where the payment transaction was sent. */
//   chainId?: number;
//   /** The transaction hash, if available. */
//   txHash?: string;
// };

// export type PayEventStarted = PayEventBase & {
//   type: "payment_started";
// };

// export type PayEventCompleted = PayEventBase & {
//   type: "payment_completed";
// };

// export type PayEventBounced = PayEventBase & {
//   type: "payment_bounced";
// };
