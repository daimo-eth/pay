import type { NavNode } from "../common/legacy/session.js";
import type { DaimoClient } from "../common/legacy/client.js";

/** Node types from NavNode union */
export type NavNodeType = NavNode["type"];

/** Context for every nav event */
export type NavEventContext = {
  nodeId: string | null;
  nodeType: NavNodeType | null;
};

/** All nav event actions with their data */
export type NavEventAction =
  | { action: "nav_open" }
  | { action: "nav_close" }
  | { action: "nav_select"; targetNodeId: string; targetNodeType: NavNodeType }
  | { action: "nav_back" }
  | { action: "nav_deeplink"; url: string }
  | { action: "flow_amount_continue"; amountUsd: number }
  | { action: "flow_refresh" }
  | {
      action: "flow_exchange_url";
      exchangeId: string;
      success: boolean;
      url?: string;
      error?: string;
    }
  | {
      action: "flow_tron_address";
      success: boolean;
      address?: string;
      error?: string;
    }
  | { action: "qr_toggle"; visible: boolean }
  | { action: "copy_address"; address: string }
  | { action: "session_expired" }
  | { action: "session_completed" }
  | { action: "session_bounced" }
  | { action: "error_shown"; error: string };

/** Full nav event payload */
export type NavEvent = NavEventContext & NavEventAction;

/** Create a fire-and-forget nav event logger bound to a DaimoClient. */
export function createNavLogger(client: DaimoClient) {
  return function logNavEvent(sessionId: string, event: NavEvent): void {
    const { action, nodeId, nodeType, ...rest } = event;
    client
      .logNavEvent({
        sessionId,
        action,
        data: { nodeId, nodeType, ...rest },
      })
      .catch((e) => {
        console.error("[navEvent] failed to log:", action, e);
      });
  };
}
