import type { AccountRegion } from "../../common/account.js";
import type { NavNode, SessionWithNav } from "../api/navTree.js";
import type { WalletPaymentOption } from "../api/walletTypes.js";

export type { SessionWithNav };

type AccountNavBase = { nodeId: string; region: AccountRegion; autoNav?: boolean };

/**
 * A single entry in the navigation stack. Back = pop.
 * autoNav marks entries pushed by auto-navigation (single-option chains).
 */
export type NavEntry =
  | { type: "choose-option"; nodeId: string; autoNav: boolean }
  | { type: "deeplink"; nodeId: string; autoNav?: boolean }
  | {
      type: "select-amount";
      nodeId: string;
      flowType: "deposit" | "tron" | "exchange" | "cashapp";
      autoNav?: boolean;
    }
  | {
      type: "waiting-deposit";
      nodeId: string;
      amountUsd: number;
      autoNav?: boolean;
    }
  | {
      type: "waiting-tron";
      nodeId: string;
      amountUsd: number;
      address?: string;
      expiresAt?: number;
      error?: string;
      autoNav?: boolean;
    }
  | {
      type: "exchange-page";
      nodeId: string;
      amountUsd: number;
      exchangeUrl?: string;
      waitingMessage?: string;
      expiresAt?: number;
      error?: string;
      autoNav?: boolean;
    }
  | { type: "wallet-choose-chain"; nodeId: string; walletName: string; walletIcon: string; autoNav?: boolean }
  | { type: "wallet-connect"; nodeId: string; walletName?: string; walletIcon?: string; autoNav?: boolean }
  | { type: "wallet-select-token"; nodeId: string; autoNav?: boolean }
  | {
      type: "wallet-select-amount";
      nodeId: string;
      token: WalletPaymentOption;
      autoNav?: boolean;
    }
  | {
      type: "wallet-sending";
      nodeId: string;
      token: WalletPaymentOption;
      amountUsd: number;
      txHash?: string;
      error?: string;
      rejected?: boolean;
      autoNav?: boolean;
    }
  | ({ type: "account-email" } & AccountNavBase)
  | ({ type: "account-otp" } & AccountNavBase)
  | ({ type: "account-creating-wallet" } & AccountNavBase)
  | ({ type: "account-enrollment" } & AccountNavBase)
  | ({ type: "account-payment" } & AccountNavBase)
  | ({ type: "account-bank-picker" } & AccountNavBase)
  | ({ type: "account-deeplink" } & AccountNavBase)
  | ({ type: "account-status" } & AccountNavBase)
  | ({ type: "account-error"; message: string } & AccountNavBase);

export type DaimoModalEventHandlers = {
  onPaymentStarted?: () => void;
  onPaymentCompleted?: () => void;
  onOpen?: () => void;
  onClose?: () => void;
};

/** Helper to find a node by ID in the nav tree */
export function findNode(nodeId: string, nodes: NavNode[]): NavNode | null {
  for (const node of nodes) {
    if (node.id === nodeId) return node;
    if (node.type !== "ChooseOption") continue;
    const found = findNode(nodeId, node.options);
    if (found) return found;
  }
  return null;
}

/** Helper to find a node by type in the nav tree */
export function findNodeByType(
  type: string,
  nodes: NavNode[],
): NavNode | null {
  for (const node of nodes) {
    if (node.type === type) return node;
    if (node.type !== "ChooseOption") continue;
    const found = findNodeByType(type, node.options);
    if (found) return found;
  }
  return null;
}
