import type { Address } from "viem";
import type { SessionPublicInfo } from "../../common/session.js";

/** Session with navigation tree for the modal UI. */
export type SessionWithNav = SessionPublicInfo & {
  /** Client secret for session updates */
  clientSecret: string;
  /** Server-defined nav */
  navTree: NavNode[];
  /** Base URL for receipt links and icon resolution (set by server). */
  baseUrl: string;
};

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
  requiredUsd?: number;
  minimumUsd: number;
  maximumUsd: number;
  expiresAt: number;
  tokenSuffix: string;
};

/** Mobile wallet deeplink. Opens directly on mobile; shows as QR code on desktop. */
export type NavNodeDeeplink = NavNodeCommon & {
  type: "Deeplink";
  url: string;
  icon?: string;
};

export type NavNodeExchange = NavNodeCommon & {
  type: "Exchange";
  exchangeId: "Coinbase" | "Binance" | "Lemon";
  icon?: string;
  requiredUsd?: number;
  minimumUsd: number;
  maximumUsd: number;
};

export type NavNodeCashApp = NavNodeCommon & {
  type: "CashApp";
  icon?: string;
  requiredUsd?: number;
  minimumUsd: number;
  maximumUsd: number;
};

export type NavNodeTronDeposit = NavNodeCommon & {
  type: "TronDeposit";
  icon?: string;
  requiredUsd?: number;
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
  | NavNodeCashApp
  | NavNodeTronDeposit
  | NavNodeConnectedWallet;
