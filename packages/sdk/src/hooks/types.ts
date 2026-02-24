import type {
  NavNode,
  Session,
  WalletPaymentOption,
} from "../common/session.js";

/** Session state for the modal */
export type SessionState = Session;

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
      flowType: "deposit" | "tron" | "exchange";
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
      error?: string;
      autoNav?: boolean;
    }
  | { type: "wallet-connect"; nodeId: string; autoNav?: boolean }
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
      autoNav?: boolean;
    };

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
