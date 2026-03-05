import type { SessionPublicInfo } from "../../common/session.js";
import type { NavNode } from "./navTree.js";
import type { WalletPaymentOption } from "./walletTypes.js";

export type {
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
  session: SessionPublicInfo & { navTree: NavNode[] };
};

export type WalletOptionsResponse = WalletPaymentOption[];
