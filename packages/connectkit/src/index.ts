export type * as Types from "./types";

export { version } from "../package.json";

// Configure Daimo Pay
export { DaimoPayProvider } from "./components/DaimoPay";
export { default as getDefaultConfig } from "./defaultConfig";

// Pay button
export {
  DaimoPayBouncedEvent,
  DaimoPayButton,
  DaimoPayButtonCustomProps,
  DaimoPayButtonProps,
  DaimoPayCompletedEvent,
  DaimoPayEvent,
  DaimoPayment,
  DaimoPayStartedEvent,
} from "./components/DaimoPayButton";

// Hooks to track payment status + UI status.
export { useDaimoPayStatus } from "./hooks/useDaimoPayStatus";

// TODO: replace with useDaimoPay() more comprehensive status.
// export { useModal as useDaimoPayModal } from "./hooks/useModal";

// For convenience, export components to show connected account.
export { default as Avatar } from "./components/Common/Avatar";
export { default as ChainIcon } from "./components/Common/Chain";
export { wallets } from "./wallets";

// Export utilities.
export * from "./utils/exports";

// TODO: expose this more selectively.
export {
  PayContext as DaimoPayContext,
  usePayContext,
} from "./hooks/usePayContext";
