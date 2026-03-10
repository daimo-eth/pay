// Components
export { DaimoModal } from "./components/DaimoModal.js";
export type { DaimoModalProps } from "./components/DaimoModal.js";
export { DaimoSDKProvider } from "./hooks/DaimoClientContext.js";
export { ErrorPage } from "./components/ErrorPage.js";

// Types
export * from "./api/index.js";
export type { InjectedWallet, InjectedWalletInfo } from "./hooks/useInjectedWallets.js";

// Hooks
export { useInjectedWallets } from "./hooks/useInjectedWallets.js";

// Localization
export { setLocale, t } from "./hooks/locale.js";
