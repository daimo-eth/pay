export type * as Types from "./types";

export { version } from "../package.json";

// Configure Rozo Pay
export { default as getDefaultConfig } from "./defaultConfig";
export { RozoPayProvider } from "./provider/RozoPayProvider";

// Pay button
export {
  RozoPayButton,
  RozoPayButtonCustomProps,
  RozoPayButtonProps,
  RozoPayment,
} from "./components/RozoPayButton";

// Hooks to track payment status + UI status.
export { useRozoPay } from "./hooks/useRozoPay";
export { useRozoPayStatus } from "./hooks/useRozoPayStatus";
export { useRozoPayUI } from "./hooks/useRozoPayUI";

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
export { PayContext as RozoPayContext } from "./provider/PayContext";
