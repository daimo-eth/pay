import type {
  NavNodeChooseOption,
  NavNodeExchange,
  WalletPaymentOption,
} from "../common/session.js";
import { useCallback, useMemo, useState } from "react";

import { useDaimoClient } from "./DaimoClientContext.js";
import { t } from "./locale.js";
import { createNavLogger, type NavNodeType } from "./navEvent.js";
import { findNode, type NavEntry, type SessionState } from "./types.js";

type NodeContext = { nodeId: string | null; nodeType: NavNodeType | null };

type SessionNavResult = {
  stack: NavEntry[];
  topEntry: NavEntry | null;
  getNodeCtx: () => NodeContext;
  canGoBack: boolean;

  handleNavigate: (nodeId: string, options?: { autoNav?: boolean }) => void;
  handleBack: () => void;
  handleAmountContinue: (amountUsd: number) => void;
  handleRetry: () => void;
  handleRefresh: () => Promise<void>;

  handleWalletConnected: () => void;
  handleWalletSelectToken: (token: WalletPaymentOption) => void;
  handleWalletSending: (token: WalletPaymentOption, amountUsd: number) => void;
  handleWalletTxResult: (txHash?: string, error?: string) => void;
};

/**
 * Manages session navigation via a single NavEntry stack.
 * Back = pop (collapsing auto-nav entries). Flow screens are stack entries.
 */
export function useSessionNav(
  session: SessionState,
  setSession: React.Dispatch<React.SetStateAction<SessionState>>,
  platform?: "ios" | "android" | "other",
): SessionNavResult {
  const client = useDaimoClient();
  const logNavEvent = createNavLogger(client);

  const [stack, setStack] = useState<NavEntry[]>([]);

  const topEntry = stack.length > 0 ? stack[stack.length - 1] : null;

  const getNodeCtx = useCallback((): NodeContext => {
    const nodeId = topEntry?.nodeId ?? session.navTree[0]?.id ?? null;
    const nodeType = nodeId
      ? (findNode(nodeId, session.navTree)?.type ?? null)
      : null;
    return { nodeId, nodeType };
  }, [topEntry, session.navTree]);

  const canGoBack = stack.length > 0 && stack.some((e) => !e.autoNav);

  // ─── Async fetchers ─────────────────────────────────────────────────────

  const fetchTronAddress = useCallback(
    async (nodeId: string, amountUsd: number) => {
      try {
        const result = await client.createTronAddress({
          sessionId: session.sessionId,
          amountUsd,
        });

        if ("error" in result) {
          logNavEvent(session.sessionId, {
            nodeId,
            nodeType: "TronDeposit",
            action: "flow_tron_address",
            success: false,
            error: result.error,
          });
          setStack((prev) => {
            const top = prev[prev.length - 1];
            if (top?.type !== "waiting-tron" || top.nodeId !== nodeId)
              return prev;
            return [...prev.slice(0, -1), { ...top, error: result.error }];
          });
        } else {
          logNavEvent(session.sessionId, {
            nodeId,
            nodeType: "TronDeposit",
            action: "flow_tron_address",
            success: true,
            address: result.address,
          });
          setStack((prev) => {
            const top = prev[prev.length - 1];
            if (top?.type !== "waiting-tron" || top.nodeId !== nodeId)
              return prev;
            return [
              ...prev.slice(0, -1),
              {
                ...top,
                address: result.address,
                expiresAt: result.expiresAt,
                error: undefined,
              },
            ];
          });
        }
      } catch (error) {
        console.error("failed to create tron address:", error);
        logNavEvent(session.sessionId, {
          nodeId,
          nodeType: "TronDeposit",
          action: "flow_tron_address",
          success: false,
          error: t.tronUnavailable,
        });
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.type !== "waiting-tron" || top.nodeId !== nodeId)
            return prev;
          return [...prev.slice(0, -1), { ...top, error: t.tronUnavailable }];
        });
      }
    },
    [session.sessionId, client],
  );

  const fetchExchangeUrl = useCallback(
    async (nodeId: string, exchangeId: string, amountUsd: number) => {
      try {
        const result = await client.getExchangeUrl({
          sessionId: session.sessionId,
          daAddr: session.depositAddress,
          exchangeId,
          amountUsd,
          platform,
        });
        if (!result) return;
        logNavEvent(session.sessionId, {
          nodeId,
          nodeType: "Exchange",
          action: "flow_exchange_url",
          exchangeId,
          success: true,
          url: result.url,
        });
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.type !== "exchange-page" || top.nodeId !== nodeId)
            return prev;
          return [
            ...prev.slice(0, -1),
            {
              ...top,
              exchangeUrl: result.url,
              waitingMessage: result.waitingMessage,
              error: undefined,
            },
          ];
        });
      } catch (error) {
        console.error("failed to get exchange url:", error);
        const errorMsg =
          error instanceof Error ? error.message : "failed to get exchange url";
        logNavEvent(session.sessionId, {
          nodeId,
          nodeType: "Exchange",
          action: "flow_exchange_url",
          exchangeId,
          success: false,
          error: errorMsg,
        });
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.type !== "exchange-page" || top.nodeId !== nodeId)
            return prev;
          return [...prev.slice(0, -1), { ...top, error: errorMsg }];
        });
      }
    },
    [session.sessionId, session.depositAddress, platform, client],
  );

  // ─── Navigation handlers ────────────────────────────────────────────────

  const handleNavigate = useCallback(
    (nodeId: string, options?: { autoNav?: boolean }) => {
      const nodeCtx = getNodeCtx();
      const targetNode = findNode(nodeId, session.navTree);
      if (!targetNode) return;

      const autoNav = options?.autoNav ?? false;

      if (targetNode.type === "Deeplink" && targetNode.url) {
        logNavEvent(session.sessionId, {
          ...nodeCtx,
          action: "nav_deeplink",
          url: targetNode.url,
        });
        window.open(targetNode.url, "_blank");
      }

      logNavEvent(session.sessionId, {
        ...nodeCtx,
        action: "nav_select",
        targetNodeId: nodeId,
        targetNodeType: targetNode.type,
      });

      if (targetNode.type === "ChooseOption") {
        setStack((prev) => [
          ...prev,
          { type: "choose-option", nodeId, autoNav },
        ]);
        return;
      }

      if (targetNode.type === "Deeplink") {
        setStack((prev) => [...prev, { type: "deeplink", nodeId, autoNav }]);
        return;
      }

      if (targetNode.type === "ConnectedWallet") {
        setStack((prev) => [
          ...prev,
          { type: "wallet-connect", nodeId, autoNav },
        ]);
        return;
      }

      const { amountUnits, tokenSymbol } = session.destination;
      if (amountUnits) {
        console.assert(
          tokenSymbol.includes("USD"),
          `expected USD destination, got ${tokenSymbol}`,
        );
      }
      const requiredUsd = amountUnits ? parseFloat(amountUnits) : 0;

      if (targetNode.type === "DepositAddress") {
        if (requiredUsd > 0) {
          setStack((prev) => [
            ...prev,
            {
              type: "waiting-deposit",
              nodeId,
              amountUsd: requiredUsd,
              autoNav,
            },
          ]);
          return;
        }
        setStack((prev) => [
          ...prev,
          { type: "select-amount", nodeId, flowType: "deposit", autoNav },
        ]);
        return;
      }

      if (targetNode.type === "TronDeposit") {
        if (requiredUsd > 0) {
          setStack((prev) => [
            ...prev,
            {
              type: "waiting-tron",
              nodeId,
              amountUsd: requiredUsd,
              autoNav,
            },
          ]);
          fetchTronAddress(nodeId, requiredUsd);
          return;
        }
        setStack((prev) => [
          ...prev,
          { type: "select-amount", nodeId, flowType: "tron", autoNav },
        ]);
        return;
      }

      if (targetNode.type === "Exchange") {
        if (requiredUsd > 0) {
          setStack((prev) => [
            ...prev,
            { type: "exchange-page", nodeId, amountUsd: requiredUsd, autoNav },
          ]);
          fetchExchangeUrl(
            nodeId,
            (targetNode as NavNodeExchange).exchangeId,
            requiredUsd,
          );
          return;
        }
        setStack((prev) => [
          ...prev,
          { type: "select-amount", nodeId, flowType: "exchange", autoNav },
        ]);
      }
    },
    [
      session.navTree,
      session.sessionId,
      session.destination,
      getNodeCtx,
      fetchTronAddress,
      fetchExchangeUrl,
    ],
  );

  const handleBack = useCallback(() => {
    logNavEvent(session.sessionId, { ...getNodeCtx(), action: "nav_back" });

    setStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      while (next.length > 0) {
        const top = next[next.length - 1];
        if (!top.autoNav) break;
        if (top.type === "select-amount") break;
        if (top.type === "choose-option") {
          const node = findNode(
            top.nodeId,
            session.navTree,
          ) as NavNodeChooseOption | null;
          if (node != null && node.options.length > 1) break;
        }
        next.pop();
      }
      return next;
    });
  }, [session.sessionId, session.navTree, getNodeCtx]);

  // ─── Flow handlers ──────────────────────────────────────────────────────

  const handleAmountContinue = useCallback(
    (amountUsd: number) => {
      if (!topEntry || topEntry.type !== "select-amount") return;
      const { nodeId, flowType } = topEntry;

      logNavEvent(session.sessionId, {
        nodeId,
        nodeType:
          flowType === "deposit"
            ? "DepositAddress"
            : flowType === "tron"
              ? "TronDeposit"
              : "Exchange",
        action: "flow_amount_continue",
        amountUsd,
      });

      if (flowType === "deposit") {
        setStack((prev) => [
          ...prev,
          { type: "waiting-deposit", nodeId, amountUsd },
        ]);
      } else if (flowType === "tron") {
        setStack((prev) => [
          ...prev,
          { type: "waiting-tron", nodeId, amountUsd },
        ]);
        fetchTronAddress(nodeId, amountUsd);
      } else if (flowType === "exchange") {
        const node = findNode(nodeId, session.navTree) as NavNodeExchange;
        setStack((prev) => [
          ...prev,
          { type: "exchange-page", nodeId, amountUsd },
        ]);
        if (node) fetchExchangeUrl(nodeId, node.exchangeId, amountUsd);
      }
    },
    [
      topEntry,
      session.sessionId,
      session.navTree,
      fetchTronAddress,
      fetchExchangeUrl,
    ],
  );

  const handleRetry = useCallback(() => {
    if (!topEntry) return;

    if (topEntry.type === "waiting-tron") {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type !== "waiting-tron") return prev;
        return [
          ...prev.slice(0, -1),
          {
            ...top,
            address: undefined,
            expiresAt: undefined,
            error: undefined,
          },
        ];
      });
      fetchTronAddress(topEntry.nodeId, topEntry.amountUsd);
      return;
    }

    if (topEntry.type === "exchange-page") {
      const node = findNode(
        topEntry.nodeId,
        session.navTree,
      ) as NavNodeExchange;
      if (!node) return;
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type !== "exchange-page") return prev;
        return [
          ...prev.slice(0, -1),
          { ...top, exchangeUrl: undefined, error: undefined },
        ];
      });
      fetchExchangeUrl(topEntry.nodeId, node.exchangeId, topEntry.amountUsd);
    }
  }, [topEntry, session.navTree, fetchTronAddress, fetchExchangeUrl]);

  const handleRefresh = useCallback(async () => {
    logNavEvent(session.sessionId, { ...getNodeCtx(), action: "flow_refresh" });

    try {
      const newSession = await client.recreateSession({
        sessionId: session.sessionId,
      });
      setStack([]);
      setSession(newSession);
    } catch (error) {
      console.error("failed to recreate session:", error);
    }
  }, [session.sessionId, getNodeCtx, setSession, client]);

  // ─── Wallet flow handlers ───────────────────────────────────────────────

  const handleWalletConnected = useCallback(() => {
    if (topEntry?.type !== "wallet-connect") return;
    setStack((prev) => [
      ...prev,
      { type: "wallet-select-token", nodeId: topEntry.nodeId },
    ]);
  }, [topEntry]);

  const handleWalletSelectToken = useCallback(
    (token: WalletPaymentOption) => {
      if (topEntry?.type !== "wallet-select-token") return;
      const { amountUnits } = session.destination;
      const requiredUsd = amountUnits ? parseFloat(amountUnits) : 0;
      if (requiredUsd > 0) {
        setStack((prev) => [
          ...prev,
          {
            type: "wallet-sending",
            nodeId: topEntry.nodeId,
            token,
            amountUsd: requiredUsd,
          },
        ]);
      } else {
        setStack((prev) => [
          ...prev,
          { type: "wallet-select-amount", nodeId: topEntry.nodeId, token },
        ]);
      }
    },
    [topEntry, session.destination],
  );

  const handleWalletSending = useCallback(
    (token: WalletPaymentOption, amountUsd: number) => {
      if (
        topEntry?.type !== "wallet-select-amount" &&
        topEntry?.type !== "wallet-select-token"
      )
        return;
      setStack((prev) => [
        ...prev,
        { type: "wallet-sending", nodeId: topEntry.nodeId, token, amountUsd },
      ]);
    },
    [topEntry],
  );

  const handleWalletTxResult = useCallback(
    (txHash?: string, error?: string) => {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type !== "wallet-sending") return prev;
        return [...prev.slice(0, -1), { ...top, txHash, error }];
      });
    },
    [],
  );

  return useMemo(
    () => ({
      stack,
      topEntry,
      getNodeCtx,
      canGoBack,
      handleNavigate,
      handleBack,
      handleAmountContinue,
      handleRetry,
      handleRefresh,
      handleWalletConnected,
      handleWalletSelectToken,
      handleWalletSending,
      handleWalletTxResult,
    }),
    [
      stack,
      topEntry,
      getNodeCtx,
      canGoBack,
      handleNavigate,
      handleBack,
      handleAmountContinue,
      handleRetry,
      handleRefresh,
      handleWalletConnected,
      handleWalletSelectToken,
      handleWalletSending,
      handleWalletTxResult,
    ],
  );
}
