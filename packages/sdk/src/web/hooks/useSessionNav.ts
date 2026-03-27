import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  NavNode,
  NavNodeCashApp,
  NavNodeChooseOption,
  NavNodeExchange,
  NavNodeAccountDeposit,
  SessionWithNav,
} from "../api/navTree.js";
import type { WalletPaymentOption } from "../api/walletTypes.js";

import { isDesktopBrowser } from "../isDesktopBrowser.js";
import { useDaimoClient } from "./DaimoClientContext.js";
import { formatUserError } from "./formatUserError.js";
import { t } from "./locale.js";
import { createNavLogger, type NavNodeType } from "./navEvent.js";
import { findNode, type NavEntry } from "./types.js";
import type { InjectedWallet } from "./useInjectedWallets.js";
import type { AccountFlowState } from "./useAccountFlow.js";
import { isUserRejection, type WalletFlowResult } from "./useWalletFlow.js";

type NodeContext = { nodeId: string | null; nodeType: NavNodeType | null };
type ExchangeId = "Coinbase" | "Binance" | "Lemon" | "CashApp";
type ExchangeNode = NavNodeExchange | NavNodeCashApp;

import type { AccountRegion } from "../../common/account.js";

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

  handleInjectedWalletSelect: (wallet: InjectedWallet) => void;
  handleChainSelect: (chain: "evm" | "solana") => void;
  handleWalletSelectToken: (token: WalletPaymentOption) => void;
  handleWalletSending: (token: WalletPaymentOption, amountUsd: number) => void;

  /** Advance account flow to the next screen. */
  handleAccountAdvance: (nextType: NavEntry["type"]) => void;
};

function isExchangeNode(node: NavNode | null): node is ExchangeNode {
  return node?.type === "Exchange" || node?.type === "CashApp";
}

function getExchangeSelection(node: ExchangeNode): {
  exchangeId: ExchangeId;
  nodeType: "Exchange" | "CashApp";
} {
  if (node.type === "CashApp") {
    return { exchangeId: "CashApp", nodeType: "CashApp" };
  }
  return { exchangeId: node.exchangeId, nodeType: "Exchange" };
}

export function useSessionNav(
  session: SessionWithNav,
  setSession: React.Dispatch<React.SetStateAction<SessionWithNav>>,
  isOpen: boolean,
  platform?: "ios" | "android" | "other",
  walletFlow?: WalletFlowResult,
  accountFlow?: AccountFlowState | null,
): SessionNavResult {
  const effectivePlatform =
    platform ?? (isDesktopBrowser() ? "other" : "android");
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
    async (
      nodeId: string,
      exchangeId: ExchangeId,
      amountUsd: number,
      nodeType: "Exchange" | "CashApp",
    ) => {
      try {
        const result = await client.sessions.paymentMethods.create(
          session.sessionId,
          {
            clientSecret: session.clientSecret,
            paymentMethod: {
              type: "exchange",
              exchangeId,
              amountUsd,
              platform: effectivePlatform,
            },
          },
        );
        if (!result.exchange) return;
        logNavEvent(session.sessionId, session.clientSecret, {
          nodeId,
          nodeType,
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
              expiresAt: result.exchange!.expiresAt,
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
          nodeType,
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
    [session.sessionId, session.clientSecret, effectivePlatform, client],
  );

  // ─── Account deposit handler ────────────────────────────────────────────────

  const handleAccountNavigate = useCallback(
    async (nodeId: string, node: NavNodeAccountDeposit, autoNav: boolean) => {
      const { region } = node;

      if (!accountFlow) {
        setStack((prev) => [
          ...prev,
          {
            type: "account-error",
            nodeId,
            region,
            autoNav,
            message:
              "account deposit is not available for this session.",
          },
        ]);
        return;
      }

      // Wait for Privy to finish restoring session from storage before
      // deciding whether to show login. Without this, auto-nav fires
      // before Privy is ready and always shows the email screen.
      await accountFlow.waitForReady();

      // Re-check auth after ready — getAccessToken reads from the ref
      // which always has the latest Privy state.
      const token = await accountFlow.getAccessToken();

      // If user has an active Privy session, check their account status
      // to skip onboarding steps they've already completed.
      if (token) {
        const sessionCtx = { sessionId: session.sessionId, clientSecret: session.clientSecret };
        const result = await accountFlow.getAccount(client, sessionCtx, region);
        if (result) {
          if (result.nextAction === "ready_for_payment") {
            setStack((prev) => [
              ...prev,
              { type: "account-payment", nodeId, region, autoNav },
            ]);
            return;
          }
          if (result.nextAction === "enrollment") {
            setStack((prev) => [
              ...prev,
              { type: "account-enrollment", nodeId, region, autoNav },
            ]);
            return;
          }
        }
      }

      // New user or no session — start from email
      setStack((prev) => [
        ...prev,
        { type: "account-email", nodeId, region, autoNav },
      ]);
    },
    [accountFlow, client, session.clientSecret, session.sessionId],
  );

  // ─── Navigation handlers ────────────────────────────────────────────────

  const handleNavigate = useCallback(
    (nodeId: string, options?: { autoNav?: boolean }) => {
      const nodeCtx = getNodeCtx();
      const targetNode = findNode(nodeId, session.navTree);
      if (!targetNode || targetNode.disabledReason) return;

      const autoNav = options?.autoNav ?? false;

      if (targetNode.type === "Deeplink" && targetNode.url) {
        logNavEvent(session.sessionId, session.clientSecret, {
          ...nodeCtx,
          action: "nav_deeplink",
          url: targetNode.url,
        });
        if (!isDesktopBrowser()) {
          window.open(targetNode.url, "_blank");
        }
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
          { type: "wallet-select-token", nodeId, autoNav },
        ]);
        return;
      }

      if (targetNode.type === "DepositAddress") {
        const requiredUsd = targetNode.requiredUsd ?? 0;
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
        const requiredUsd = targetNode.requiredUsd ?? 0;
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

      if (isExchangeNode(targetNode)) {
        const { exchangeId, nodeType } = getExchangeSelection(targetNode);
        const requiredUsd = targetNode.requiredUsd ?? 0;
        if (requiredUsd > 0) {
          setStack((prev) => [
            ...prev,
            { type: "exchange-page", nodeId, amountUsd: requiredUsd, autoNav },
          ]);
          fetchExchangeUrl(nodeId, exchangeId, requiredUsd, nodeType);
          return;
        }
        setStack((prev) => [
          ...prev,
          {
            type: "select-amount",
            nodeId,
            flowType: targetNode.type === "CashApp" ? "cashapp" : "exchange",
            autoNav,
          },
        ]);
        return;
      }

      if (targetNode.type === "AccountDeposit") {
        handleAccountNavigate(nodeId, targetNode, autoNav);
        return;
      }
    },
    [
      session.navTree,
      session.sessionId,
      getNodeCtx,
      fetchTronAddress,
      fetchExchangeUrl,
      handleAccountNavigate,
    ],
  );

  const handleBack = useCallback(() => {
    logNavEvent(session.sessionId, session.clientSecret, {
      ...getNodeCtx(),
      action: "nav_back",
    });

    setStack((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.slice(0, -1);
      while (next.length > 0) {
        const top = next[next.length - 1];
        // Skip auto-advancing account gates on back — these re-poll and
        // jump forward when revisited, creating a loop.
        if (
          top.type === "account-creating-wallet" ||
          top.type === "account-enrollment"
        ) {
          next.pop();
          continue;
        }
        if (!top.autoNav) break;
        if (top.type === "select-amount") break;
        if (top.type === "wallet-select-token") break;
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
              : flowType === "cashapp"
                ? "CashApp"
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
      } else if (flowType === "exchange" || flowType === "cashapp") {
        const node = findNode(nodeId, session.navTree);
        if (!isExchangeNode(node)) return;
        const { exchangeId, nodeType } = getExchangeSelection(node);
        setStack((prev) => [
          ...prev,
          { type: "exchange-page", nodeId, amountUsd },
        ]);
        fetchExchangeUrl(nodeId, exchangeId, amountUsd, nodeType);
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

  const updateWalletTxResult = useCallback(
    (txHash?: string, error?: string) => {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type !== "wallet-sending") return prev;
        return [...prev.slice(0, -1), { ...top, txHash, error }];
      });
    },
    [],
  );

  /** Send wallet tx, setting rejected/error on the top stack entry. */
  const doWalletSend = useCallback(
    (token: WalletPaymentOption, amountUsd: number) => {
      walletFlow
        ?.sendTransaction(token, amountUsd)
        .then(({ txHash }) => updateWalletTxResult(txHash))
        .catch((err) => {
          if (isUserRejection(err)) {
            setStack((prev) => {
              const top = prev[prev.length - 1];
              if (top?.type !== "wallet-sending") return prev;
              return [...prev.slice(0, -1), { ...top, rejected: true }];
            });
            return;
          }
          updateWalletTxResult(
            undefined,
            formatUserError(err, t.transactionFailed),
          );
        });
    },
    [walletFlow, updateWalletTxResult],
  );

  const handleRetry = useCallback(() => {
    if (!topEntry) return;

    if (topEntry.type === "wallet-sending") {
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type !== "wallet-sending") return prev;
        return [...prev.slice(0, -1), { ...top, rejected: false }];
      });
      doWalletSend(topEntry.token, topEntry.amountUsd);
      return;
    }

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
      const node = findNode(topEntry.nodeId, session.navTree);
      if (!isExchangeNode(node)) return;
      const { exchangeId, nodeType } = getExchangeSelection(node);
      setStack((prev) => {
        const top = prev[prev.length - 1];
        if (top?.type !== "exchange-page") return prev;
        return [
          ...prev.slice(0, -1),
          {
            ...top,
            exchangeUrl: undefined,
            expiresAt: undefined,
            error: undefined,
          },
        ];
      });
      fetchExchangeUrl(
        topEntry.nodeId,
        exchangeId,
        topEntry.amountUsd,
        nodeType,
      );
    }
  }, [
    topEntry,
    session.navTree,
    fetchTronAddress,
    fetchExchangeUrl,
    doWalletSend,
  ]);

  const handleRefresh = useCallback(async () => {
    logNavEvent(session.sessionId, session.clientSecret, {
      ...getNodeCtx(),
      action: "flow_refresh",
    });

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

  const pendingWalletRef = useRef<InjectedWallet | null>(null);

  const handleInjectedWalletSelect = useCallback(
    (wallet: InjectedWallet) => {
      const { name: walletName, icon: walletIcon } = wallet.info;

      if (wallet.evmProvider && wallet.solanaProvider) {
        pendingWalletRef.current = wallet;
        setStack((prev) => [
          ...prev,
          {
            type: "wallet-choose-chain",
            nodeId: "InjectedWallet",
            walletName,
            walletIcon,
          },
        ]);
        return;
      }

      setStack((prev) => [
        ...prev,
        {
          type: "wallet-connect",
          nodeId: "InjectedWallet",
          walletName,
          walletIcon,
          autoNav: true,
        },
      ]);
      if (wallet.solanaProvider) {
        walletFlow?.connectWithSolanaProvider(wallet.solanaProvider);
      } else if (wallet.evmProvider) {
        walletFlow?.connectWithProvider(wallet.evmProvider);
      }
    },
    [walletFlow],
  );

  const handleChainSelect = useCallback(
    (chain: "evm" | "solana") => {
      const wallet = pendingWalletRef.current;
      if (!wallet) return;
      const { name: walletName, icon: walletIcon } = wallet.info;

      setStack((prev) => [
        ...prev,
        {
          type: "wallet-connect",
          nodeId: "InjectedWallet",
          walletName,
          walletIcon,
          autoNav: true,
        },
      ]);

      if (chain === "solana" && wallet.solanaProvider) {
        walletFlow?.connectWithSolanaProvider(wallet.solanaProvider);
      } else if (wallet.evmProvider) {
        walletFlow?.connectWithProvider(wallet.evmProvider);
      }
    },
    [walletFlow],
  );

  const fireWalletSend = useCallback(
    (nodeId: string, token: WalletPaymentOption, amountUsd: number) => {
      setStack((prev) => [
        ...prev,
        { type: "wallet-sending", nodeId, token, amountUsd },
      ]);
      doWalletSend(token, amountUsd);
    },
    [doWalletSend],
  );

  const handleWalletSelectToken = useCallback(
    (token: WalletPaymentOption) => {
      if (topEntry?.type !== "wallet-select-token") return;
      const requiredUsd = token.required.usd;
      if (requiredUsd > 0) {
        fireWalletSend(topEntry.nodeId, token, requiredUsd);
      } else {
        setStack((prev) => [
          ...prev,
          { type: "wallet-select-amount", nodeId: topEntry.nodeId, token },
        ]);
      }
    },
    [topEntry, fireWalletSend],
  );

  const handleWalletSending = useCallback(
    (token: WalletPaymentOption, amountUsd: number) => {
      if (
        topEntry?.type !== "wallet-select-amount" &&
        topEntry?.type !== "wallet-select-token"
      )
        return;
      fireWalletSend(topEntry.nodeId, token, amountUsd);
    },
    [topEntry, fireWalletSend],
  );

  // ─── Internal effects ──────────────────────────────────────────────────

  // Auto-navigate through single-option ChooseOption chains
  const autoNavRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;

    if (topEntry && topEntry.type !== "choose-option") {
      return;
    }

    const currentNodeId = topEntry?.nodeId;
    let node: NavNode | null = currentNodeId
      ? findNode(currentNodeId, session.navTree)
      : (session.navTree[0] ?? null);

    let targetId: string | null = null;
    while (node?.type === "ChooseOption") {
      const chooseNode = node as NavNodeChooseOption;
      const enabled = chooseNode.options?.filter((o) => !o.disabledReason);
      if (enabled?.length !== 1) break;
      targetId = enabled[0].id;
      node = findNode(targetId, session.navTree);
    }

    if (!targetId && node && node.type !== "ChooseOption") {
      targetId = node.id;
    }

    if (targetId && autoNavRef.current !== targetId) {
      autoNavRef.current = targetId;
      handleNavigate(targetId, { autoNav: true });
    }
  }, [isOpen, topEntry, session.navTree, handleNavigate]);

  // Auto-advance from wallet-connect to wallet-select-token when connected
  useEffect(() => {
    if (topEntry?.type !== "wallet-connect") return;
    if (walletFlow?.isConnecting || !walletFlow?.wallet) return;
    setStack((prev) => [
      ...prev,
      { type: "wallet-select-token", nodeId: topEntry.nodeId, autoNav: true },
    ]);
  }, [topEntry, walletFlow?.wallet, walletFlow?.isConnecting]);

  // ─── Account flow handler ────────────────────────────────────────────────

  /** Advance account flow to the next screen, preserving nodeId + region. */
  const handleAccountAdvance = useCallback(
    (nextType: NavEntry["type"]) => {
      if (!topEntry || !("region" in topEntry)) return;
      const { nodeId, region } = topEntry as NavEntry & { region: AccountRegion };
      setStack((prev) => [
        ...prev,
        { type: nextType, nodeId, region } as NavEntry,
      ]);
    },
    [topEntry],
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
      handleChainSelect,
      handleWalletSelectToken,
      handleWalletSending,
      handleAccountAdvance,
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
      handleChainSelect,
      handleWalletSelectToken,
      handleWalletSending,
      handleAccountAdvance,
    ],
  );
}
