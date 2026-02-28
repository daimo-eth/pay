import type { Address } from "viem";
import type { Session } from "../../common/session.js";

/** Session with navigation tree for the modal UI. */
export type SessionWithNav = Session & { navTree: NavNode[] };

type NavNodeCommon = {
  id: string;
  title: string;
  label?: string;
  icons?: string[];
};

export type NavNodeChooseOption = NavNodeCommon & {
  type: "ChooseOption";
  options: NavNode[];
  layout?: "list" | "grid";
};

export type NavNodeDepositAddress = NavNodeCommon & {
  type: "DepositAddress";
  address: Address;
  chainId: number;
  icon?: string;
  minimumUsd: number;
  maximumUsd: number;
  expiresAt: number;
  tokenSuffix: string;
};

export type NavNodeDeeplink = NavNodeCommon & {
  type: "Deeplink";
  url: string;
  icon?: string;
};

export type NavNodeExchange = NavNodeCommon & {
  type: "Exchange";
  exchangeId: "Coinbase" | "Binance" | "Lemon";
  icon?: string;
  minimumUsd: number;
  maximumUsd: number;
};

export type NavNodeTronDeposit = NavNodeCommon & {
  type: "TronDeposit";
  icon?: string;
  minimumUsd: number;
  maximumUsd: number;
};

export type NavNodeConnectedWallet = NavNodeCommon & {
  type: "ConnectedWallet";
  icon?: string;
};

export type NavNode =
  | NavNodeChooseOption
  | NavNodeDepositAddress
  | NavNodeDeeplink
  | NavNodeExchange
  | NavNodeTronDeposit
  | NavNodeConnectedWallet;
