export type * as Types from "./types";

export { version } from "../package.json";

// Configure Daimo Pay
export { default as getDefaultConfig } from "./defaultConfig";
export { DaimoPayProvider } from "./provider/DaimoPayProvider";

// Pay button
export {
  DaimoPayButton,
  DaimoPayButtonCustomProps,
  DaimoPayButtonProps,
  DaimoPayment,
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

// Export types
export * from "./types";

// TODO: expose this more selectively.
export {
  PayContext as DaimoPayContext,
  usePayContext,
} from "./hooks/usePayContext";
