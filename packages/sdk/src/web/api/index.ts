import type { SessionPublicInfo } from "../../common/session.js";
import type { NavNode, SessionWithNav } from "./navTree.js";
import type { WalletPaymentOption } from "./walletTypes.js";

export type {
  NavNodeCashApp,
  NavNode,
  NavNodeChooseOption,
  NavNodeConnectedWallet,
  NavNodeDeeplink,
  NavNodeDepositAddress,
  NavNodeExchange,
  NavNodeTronDeposit,
  SessionWithNav,
} from "./navTree.js";

export type {
  DaimoPayToken,
  DaimoPayTokenAmount,
  WalletPaymentOption,
} from "./walletTypes.js";

export type RetrieveSessionWithNavResponse = {
  session: SessionPublicInfo & { navTree: NavNode[]; baseUrl: string };
  /** Privy app ID, present when the nav tree includes AccountDeposit. */
  privyAppId?: string;
};

export type RecreateSessionWithNavResponse = {
  session: SessionWithNav;
  /** Privy app ID, present when the nav tree includes AccountDeposit. */
  privyAppId?: string;
};

export type WalletOptionsResponse = WalletPaymentOption[];
