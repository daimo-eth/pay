import type { NavNodeChooseOption, NavNodeExchange } from "../api/navTree.js";
import type { SessionWithNav } from "../api/navTree.js";
import type { WalletPaymentOption } from "../api/walletTypes.js";
import { useCallback, useMemo, useState } from "react";

import { useDaimoClient } from "./DaimoClientContext.js";
import { t } from "./locale.js";
import { createNavLogger, type NavNodeType } from "./navEvent.js";
import { findNode, type NavEntry } from "./types.js";
import type { EthereumProvider } from "./walletProvider.js";
import type { WalletFlowResult } from "./useWalletFlow.js";

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

  handleInjectedWalletSelect: (provider: EthereumProvider, walletName: string, walletIcon: string) => void;
  handleWalletConnected: () => void;
  handleWalletSelectToken: (token: WalletPaymentOption) => void;
  handleWalletSending: (token: WalletPaymentOption, amountUsd: number) => void;
  handleWalletTxResult: (txHash?: string, error?: string) => void;
};

export function useSessionNav(
  session: SessionWithNav,
  setSession: React.Dispatch<React.SetStateAction<SessionWithNav>>,
  platform?: "ios" | "android" | "other",
  walletFlow?: WalletFlowResult,
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
        const result = await client.sessions.paymentMethods.create(
          session.sessionId,
          {
            clientSecret: session.clientSecret,
            paymentMethod: { type: "tron", amountUsd },
          },
        );

        if (!result.tron) {
          throw new Error("tron address not returned");
        }

        logNavEvent(session.sessionId, session.clientSecret, {
          nodeId,
          nodeType: "TronDeposit",
          action: "flow_tron_address",
          success: true,
          address: result.tron.receiverAddress,
        });
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.type !== "waiting-tron" || top.nodeId !== nodeId)
            return prev;
          return [
            ...prev.slice(0, -1),
            {
              ...top,
              address: result.tron!.receiverAddress,
              expiresAt: result.tron!.expiresAt,
              error: undefined,
            },
          ];
        });
      } catch (error) {
        console.error("failed to create tron address:", error);
        const errorMsg =
          error instanceof Error ? error.message : t.tronUnavailable;
        logNavEvent(session.sessionId, session.clientSecret, {
          nodeId,
          nodeType: "TronDeposit",
          action: "flow_tron_address",
          success: false,
          error: errorMsg,
        });
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.type !== "waiting-tron" || top.nodeId !== nodeId)
            return prev;
          return [...prev.slice(0, -1), { ...top, error: errorMsg }];
        });
      }
    },
    [session.sessionId, session.clientSecret, client],
  );

  const fetchExchangeUrl = useCallback(
    async (nodeId: string, exchangeId: string, amountUsd: number) => {
      try {
        const result = await client.sessions.paymentMethods.create(
          session.sessionId,
          {
            clientSecret: session.clientSecret,
            paymentMethod: {
              type: "exchange",
              exchangeId: exchangeId as "Coinbase" | "Binance" | "Lemon",
              amountUsd,
              platform,
            },
          },
        );
        if (!result.exchange) return;
        logNavEvent(session.sessionId, session.clientSecret, {
          nodeId,
          nodeType: "Exchange",
          action: "flow_exchange_url",
          exchangeId,
          success: true,
          url: result.exchange.url,
        });
        setStack((prev) => {
          const top = prev[prev.length - 1];
          if (top?.type !== "exchange-page" || top.nodeId !== nodeId)
            return prev;
          return [
            ...prev.slice(0, -1),
            {
              ...top,
              exchangeUrl: result.exchange!.url,
              waitingMessage: result.exchange!.waitingMessage,
              error: undefined,
            },
          ];
        });
      } catch (error) {
        console.error("failed to get exchange url:", error);
        const errorMsg =
          error instanceof Error ? error.message : "failed to get exchange url";
        logNavEvent(session.sessionId, session.clientSecret, {
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
    [session.sessionId, session.clientSecret, platform, client],
  );

  // ─── Navigation handlers ────────────────────────────────────────────────

  const handleNavigate = useCallback(
    (nodeId: string, options?: { autoNav?: boolean }) => {
      const nodeCtx = getNodeCtx();
      const targetNode = findNode(nodeId, session.navTree);
      if (!targetNode) return;

      const autoNav = options?.autoNav ?? false;

      if (targetNode.type === "Deeplink" && targetNode.url) {
        logNavEvent(session.sessionId, session.clientSecret, {
          ...nodeCtx,
          action: "nav_deeplink",
          url: targetNode.url,
        });
        window.open(targetNode.url, "_blank");
      }

      logNavEvent(session.sessionId, session.clientSecret, {
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
    logNavEvent(session.sessionId, session.clientSecret, { ...getNodeCtx(), action: "nav_back" });

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

      logNavEvent(session.sessionId, session.clientSecret, {
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
    logNavEvent(session.sessionId, session.clientSecret, { ...getNodeCtx(), action: "flow_refresh" });

    try {
      const { session: newSession } = await client.internal.sessions.recreate(
        session.sessionId,
        session.clientSecret,
      );
      setStack([]);
      setSession(newSession);
    } catch (error) {
      console.error("failed to recreate session:", error);
    }
  }, [session.sessionId, session.clientSecret, getNodeCtx, setSession, client]);

  // ─── Wallet flow handlers ───────────────────────────────────────────────

  const handleInjectedWalletSelect = useCallback(
    (provider: EthereumProvider, walletName: string, walletIcon: string) => {
      setStack((prev) => [
        ...prev,
        { type: "wallet-connect", nodeId: "InjectedWallet", walletName, walletIcon },
      ]);
      walletFlow?.connectWithProvider(provider);
    },
    [walletFlow],
  );

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
      handleInjectedWalletSelect,
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
      handleInjectedWalletSelect,
      handleWalletConnected,
      handleWalletSelectToken,
      handleWalletSending,
      handleWalletTxResult,
    ],
  );
}
