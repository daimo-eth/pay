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
export { useDaimoPay } from "./hooks/useDaimoPay";
export { useDaimoPayStatus } from "./hooks/useDaimoPayStatus";

// For convenience, export components to show connected account.
export { default as Avatar } from "./components/Common/Avatar";
export { default as ChainIcon } from "./components/Common/Chain";
export { wallets } from "./wallets";

// Export utilities.
export * from "./utils/exports";

// Export types
export * from "./types";

// TODO: expose this more selectively.
export { usePayContext } from "./hooks/usePayContext";
export { PayContext as DaimoPayContext } from "./provider/PayContext";
