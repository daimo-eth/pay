import type {
  NavNode,
  NavNodeChooseOption,
  NavNodeDeeplink,
  NavNodeDepositAddress,
  NavNodeExchange,
  NavNodeTronDeposit,
  SessionWithNav,
} from "../api/navTree.js";
import type { WalletPaymentOption } from "../api/walletTypes.js";
import { tron } from "../../common/chain.js";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatUserError } from "../hooks/formatUserError.js";
import { t } from "../hooks/locale.js";
import { createNavLogger, type NavNodeType } from "../hooks/navEvent.js";
import { usePaymentCallbacks } from "../hooks/usePaymentCallbacks.js";
import { useSessionNav } from "../hooks/useSessionNav.js";
import { useSessionPolling } from "../hooks/useSessionPolling.js";
import { useDaimoClient } from "../hooks/DaimoClientContext.js";
import {
  type DaimoModalEventHandlers,
  findNode,
  type NavEntry,
} from "../hooks/types.js";

import { PrimaryButton } from "./buttons.js";
import { ChooseOptionPage } from "./ChooseOptionPage.js";
import { ChooseWalletPage } from "./ChooseWalletPage.js";
import { ConfirmationPage } from "./ConfirmationPage.js";
import { EmbeddedContainer, ModalContainer } from "./containers.js";
import { DeeplinkPage } from "./DeeplinkPage.js";
import { ExchangePage } from "./ExchangePage.js";
import { ExpiredPage } from "./ExpiredPage.js";
import { SelectAmountPage } from "./SelectAmountPage.js";
import { SelectTokenPage } from "./SelectTokenPage.js";
import {
  CenteredContent,
  ContactSupportButton,
  ErrorMessage as SharedErrorMessage,
  PageHeader,
} from "./shared.js";
import {
  useInjectedWallets,
  type InjectedWallet,
} from "../hooks/useInjectedWallets.js";
import { useWalletFlow, isUserRejection } from "../hooks/useWalletFlow.js";
import type { EthereumProvider } from "../hooks/walletProvider.js";
import { WaitingDepositAddressPage } from "./WaitingDepositAddressPage.js";
import { WalletAmountPage } from "./WalletAmountPage.js";

export type DaimoModalProps = DaimoModalEventHandlers & {
  sessionId: string;
  clientSecret: string;
  defaultOpen?: boolean;
  connectedWalletOnly?: boolean;
  embedded?: boolean;
  animate?: boolean;
  maxHeight?: number;
  platform?: "ios" | "android" | "other";
  returnUrl?: string;
  returnLabel?: string;
};

type NodeContext = { nodeId: string | null; nodeType: NavNodeType | null };

function useModalCloseHandler(
  sessionId: string,
  clientSecret: string,
  getNodeCtx: () => NodeContext,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void,
  onClose?: () => void,
) {
  const client = useDaimoClient();
  const logNavEvent = createNavLogger(client);

  useEffect(() => {
    if (!isOpen) return;
    logNavEvent(sessionId, clientSecret, { ...getNodeCtx(), action: "nav_open" });
  }, [isOpen, sessionId, getNodeCtx]);

  const handleClose = useCallback(() => {
    logNavEvent(sessionId, clientSecret, { ...getNodeCtx(), action: "nav_close" });
    setIsOpen(false);
    onClose?.();
  }, [sessionId, clientSecret, getNodeCtx, setIsOpen, onClose]);

  return { handleClose };
}

export function DaimoModal(props: DaimoModalProps) {
  const {
    sessionId,
    clientSecret,
    embedded = false,
    animate = true,
    defaultOpen = true,
    maxHeight,
  } = props;
  const client = useDaimoClient();
  const [session, setSession] = useState<SessionWithNav | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    client.internal.sessions
      .retrieveWithNav(sessionId)
      .then(({ session: s }) => setSession({ ...s, clientSecret }))
      .catch((err) => console.error("failed to fetch session:", err));
  }, [sessionId, clientSecret]);

  if (!session) {
    if (!isOpen) return null;
    const skeleton = <SkeletonContent />;
    if (embedded) return <EmbeddedContainer>{skeleton}</EmbeddedContainer>;
    return (
      <ModalContainer animate={animate} maxHeight={maxHeight}>
        {skeleton}
      </ModalContainer>
    );
  }

  return (
    <DaimoModalInner
      {...props}
      session={session}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
    />
  );
}

const CONNECTED_WALLET_NAV: NavNode[] = [
  { type: "ConnectedWallet", id: "ConnectedWallet", title: "Connected Wallet" },
];

type DaimoModalInnerProps = DaimoModalProps & {
  session: SessionWithNav;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
};

function DaimoModalInner({
  session: initialSession,
  isOpen,
  setIsOpen,
  connectedWalletOnly = false,
  embedded = false,
  animate = true,
  maxHeight,
  platform,
  returnUrl,
  returnLabel,
  onPaymentStarted,
  onPaymentCompleted,
  onOpen,
  onClose,
}: DaimoModalInnerProps) {
  const client = useDaimoClient();

  const effectiveInitial = connectedWalletOnly
    ? { ...initialSession, navTree: CONNECTED_WALLET_NAV }
    : initialSession;

  const { session, setSession } = useSessionPolling(effectiveInitial, isOpen);

  // Create EVM payment method on load to get the deposit address
  const [depositAddress, setDepositAddress] = useState<string | null>(
    session.paymentMethod?.type === "evm"
      ? (session.paymentMethod as { receiverAddress?: string }).receiverAddress ?? null
      : null,
  );
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || depositAddress) return;
    initRef.current = true;
    client.sessions.paymentMethods
      .create(session.sessionId, {
        clientSecret: session.clientSecret,
        paymentMethod: { type: "evm" },
      })
      .then((result) => {
        const pm = result.session.paymentMethod;
        if (pm?.type === "evm") {
          setDepositAddress((pm as { receiverAddress: string }).receiverAddress);
        }
      })
      .catch((err) => console.error("failed to init evm payment method:", err));
  }, [session.sessionId, session.clientSecret, depositAddress, client]);

  const hasConnectedWallet = session.navTree.some(
    (n) => n.type === "ConnectedWallet",
  );
  const walletFlow = useWalletFlow(
    session.sessionId,
    depositAddress ?? "",
    hasConnectedWallet,
    session.clientSecret,
  );

  const nav = useSessionNav(session, setSession, platform, walletFlow);

  const injectedWallets = useInjectedWallets();

  const autoNavRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isOpen) return;

    if (
      nav.topEntry &&
      nav.topEntry.type !== "choose-option" &&
      nav.topEntry.type !== "deeplink"
    ) {
      return;
    }

    const currentNodeId = nav.topEntry?.nodeId;
    let node: NavNode | null = currentNodeId
      ? findNode(currentNodeId, session.navTree)
      : (session.navTree[0] ?? null);

    let targetId: string | null = null;
    while (node?.type === "ChooseOption") {
      const chooseNode = node as NavNodeChooseOption;
      if (chooseNode.options?.length !== 1) break;
      targetId = chooseNode.options[0].id;
      node = findNode(targetId, session.navTree);
    }

    if (!targetId && node && node.type !== "ChooseOption") {
      targetId = node.id;
    }

    if (targetId && autoNavRef.current !== targetId) {
      autoNavRef.current = targetId;
      nav.handleNavigate(targetId, { autoNav: true });
    }
  }, [isOpen, nav, session.navTree]);

  useEffect(() => {
    if (nav.topEntry?.type !== "wallet-connect") return;
    if (walletFlow.isConnecting || !walletFlow.wallet) return;
    nav.handleWalletConnected();
  }, [nav.topEntry, walletFlow.wallet, walletFlow.isConnecting, nav]);

  const sendingRef = useRef<string | null>(null);
  useEffect(() => {
    if (nav.topEntry?.type !== "wallet-sending") return;
    if (nav.topEntry.txHash || nav.topEntry.error) return;

    const sendKey = `${nav.topEntry.nodeId}-${nav.topEntry.amountUsd}`;
    if (sendingRef.current === sendKey) return;
    sendingRef.current = sendKey;

    const { token, amountUsd } = nav.topEntry;
    walletFlow
      .sendTransaction(token, amountUsd)
      .then(({ txHash }) => {
        nav.handleWalletTxResult(txHash);
        sendingRef.current = null;
      })
      .catch((err) => {
        sendingRef.current = null;
        if (isUserRejection(err)) {
          nav.handleBack();
          return;
        }
        nav.handleWalletTxResult(
          undefined,
          formatUserError(err, t.transactionFailed),
        );
      });
  }, [nav, walletFlow]);

  const { handleClose } = useModalCloseHandler(
    session.sessionId,
    session.clientSecret,
    nav.getNodeCtx,
    isOpen,
    setIsOpen,
    onClose,
  );

  usePaymentCallbacks(session, isOpen, {
    onOpen,
    onPaymentStarted,
    onPaymentCompleted,
  });

  if (!isOpen) return null;

  const isTerminal =
    session.status === "expired" ||
    session.status === "succeeded" ||
    session.status === "bounced";
  const pageKey = isTerminal
    ? session.status
    : `${nav.topEntry?.type ?? "root"}-${nav.topEntry?.nodeId ?? ""}`;

  const renderInContainer = (
    content: React.ReactNode,
    showFooterSpacer = true,
  ) => {
    const page = (
      <div
        key={pageKey}
        className="daimo-page-enter flex-1 min-h-0 flex flex-col"
      >
        {content}
      </div>
    );
    if (embedded) {
      return (
        <EmbeddedContainer showFooterSpacer={showFooterSpacer}>
          {page}
        </EmbeddedContainer>
      );
    }
    return (
      <ModalContainer
        showFooterSpacer={showFooterSpacer}
        onClose={handleClose}
        animate={animate}
        pageKey={pageKey}
        maxHeight={maxHeight}
      >
        {page}
      </ModalContainer>
    );
  };

  if (session.status === "expired") {
    return renderInContainer(<ExpiredPage onClose={handleClose} />);
  }
  if (
    session.status === "processing" ||
    session.status === "succeeded" ||
    session.status === "bounced"
  ) {
    return renderInContainer(
      <ConfirmationPage
        sessionId={session.sessionId}
        sessionState={session.status}
        returnUrl={returnUrl}
        returnLabel={returnLabel}
      />,
    );
  }

  const content = renderEntry(nav.topEntry, {
    session,
    canGoBack: nav.canGoBack,
    onNavigate: nav.handleNavigate,
    onBack: nav.handleBack,
    onAmountContinue: nav.handleAmountContinue,
    onRetry: nav.handleRetry,
    onRefresh: nav.handleRefresh,
    injectedWallets,
    onInjectedWalletSelect: nav.handleInjectedWalletSelect,
    walletFlow,
    onWalletSelectToken: nav.handleWalletSelectToken,
    onWalletSending: nav.handleWalletSending,
  });

  const showFooterSpacer = !(
    !nav.topEntry ||
    (nav.topEntry.type === "choose-option" && !nav.canGoBack)
  );

  return renderInContainer(content, showFooterSpacer);
}

// ─────────────────────────────────────────────────────────────────────────────

type RenderContext = {
  session: { sessionId: string; clientSecret: string; navTree: NavNode[] };
  canGoBack: boolean;
  onNavigate: (nodeId: string) => void;
  onBack: () => void;
  onAmountContinue: (amountUsd: number) => void;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
  injectedWallets: InjectedWallet[];
  onInjectedWalletSelect: (provider: EthereumProvider, walletName: string, walletIcon: string) => void;
  walletFlow: {
    wallet: { evmAddress: string | null; solAddress: string | null } | null;
    balances: WalletPaymentOption[] | null;
    isConnecting: boolean;
    isLoadingBalances: boolean;
    connectError: string | null;
    connect: () => Promise<void>;
    retryConnect: () => Promise<void>;
  };
  onWalletSelectToken: (token: WalletPaymentOption) => void;
  onWalletSending: (token: WalletPaymentOption, amountUsd: number) => void;
};

function renderEntry(
  entry: NavEntry | null,
  ctx: RenderContext,
): React.ReactNode {
  if (!entry) {
    const rootNode = ctx.session.navTree[0];
    if (!rootNode) return <LoadingMessage />;
    if (rootNode.type === "ChooseOption") {
      return (
        <ChooseOptionPage
          node={rootNode as NavNodeChooseOption}
          onNavigate={ctx.onNavigate}
          onBack={null}
        />
      );
    }
    return null;
  }

  switch (entry.type) {
    case "choose-option": {
      const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeChooseOption | null;
      if (!node) return null;
      if (node.id === "SelectWallet") {
        return (
          <ChooseWalletPage
            node={node}
            injectedWallets={ctx.injectedWallets}
            onInjectedWalletSelect={ctx.onInjectedWalletSelect}
            onNavigate={ctx.onNavigate}
            onBack={ctx.canGoBack ? ctx.onBack : null}
          />
        );
      }
      return (
        <ChooseOptionPage
          node={node}
          onNavigate={ctx.onNavigate}
          onBack={ctx.canGoBack ? ctx.onBack : null}
        />
      );
    }
    case "deeplink": {
      const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeDeeplink | null;
      if (!node) return null;
      return <DeeplinkPage node={node} onBack={ctx.canGoBack ? ctx.onBack : null} />;
    }
    case "select-amount":
      return renderSelectAmount(entry, ctx);
    case "waiting-deposit":
      return renderWaitingDeposit(entry, ctx);
    case "waiting-tron":
      return renderWaitingTron(entry, ctx);
    case "exchange-page":
      return renderExchangePage(entry, ctx);
    case "wallet-connect":
      return renderWalletConnect(entry, ctx);
    case "wallet-select-token":
      return renderWalletSelectToken(ctx);
    case "wallet-select-amount":
      return renderWalletSelectAmount(entry, ctx);
    case "wallet-sending":
      return renderWalletSending(entry, ctx);
    default:
      return null;
  }
}

function renderSelectAmount(
  entry: NavEntry & { type: "select-amount" },
  ctx: RenderContext,
): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree);
  if (!node) return null;

  if (entry.flowType === "deposit") {
    const depositNode = node as NavNodeDepositAddress;
    return (
      <SelectAmountPage node={depositNode} minimumUsd={depositNode.minimumUsd} maximumUsd={depositNode.maximumUsd} tokenSuffix={depositNode.tokenSuffix} chainId={depositNode.chainId} onBack={ctx.canGoBack ? ctx.onBack : undefined} onContinue={ctx.onAmountContinue} />
    );
  }
  if (entry.flowType === "tron") {
    const tronNode = node as NavNodeTronDeposit;
    return (
      <SelectAmountPage node={{ icon: tronNode.icon, title: tronNode.title }} minimumUsd={tronNode.minimumUsd} maximumUsd={tronNode.maximumUsd} tokenSuffix="USDT" chainId={tron.chainId} onBack={ctx.canGoBack ? ctx.onBack : undefined} onContinue={ctx.onAmountContinue} />
    );
  }
  if (entry.flowType === "exchange") {
    const exchangeNode = node as NavNodeExchange;
    return (
      <SelectAmountPage node={{ icon: exchangeNode.icon, title: exchangeNode.title }} minimumUsd={exchangeNode.minimumUsd} maximumUsd={exchangeNode.maximumUsd} onBack={ctx.canGoBack ? ctx.onBack : undefined} onContinue={ctx.onAmountContinue} />
    );
  }
  return null;
}

function renderWaitingDeposit(entry: NavEntry & { type: "waiting-deposit" }, ctx: RenderContext): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeDepositAddress | null;
  if (!node) return null;
  const selectedToken = node.tokenSuffix === "USDC" || node.tokenSuffix === "USDT" ? node.tokenSuffix : undefined;
  return <WaitingDepositAddressPage node={node} amountUsd={entry.amountUsd} selectedToken={selectedToken} sessionId={ctx.session.sessionId} clientSecret={ctx.session.clientSecret} onBack={ctx.onBack} onRefresh={ctx.onRefresh} />;
}

function renderWaitingTron(entry: NavEntry & { type: "waiting-tron" }, ctx: RenderContext): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeTronDeposit | null;
  if (!node) return null;
  if (entry.error) return <FlowErrorMessage error={entry.error} onBack={ctx.onBack} onRetry={ctx.onRetry} />;
  return (
    <WaitingDepositAddressPage
      node={{ type: "DepositAddress", id: entry.nodeId, title: node.title, address: (entry.address as `0x${string}`) ?? ("" as `0x${string}`), chainId: tron.chainId, icon: node.icon, minimumUsd: node.minimumUsd, maximumUsd: node.maximumUsd, expiresAt: entry.expiresAt ?? 0, tokenSuffix: "USDT" }}
      amountUsd={entry.amountUsd} selectedToken="USDT" loading={!entry.address} sessionId={ctx.session.sessionId} clientSecret={ctx.session.clientSecret} onBack={ctx.onBack} onRefresh={ctx.onRetry}
    />
  );
}

function renderExchangePage(entry: NavEntry & { type: "exchange-page" }, ctx: RenderContext): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeExchange | null;
  if (!node) return null;
  if (entry.error) return <FlowErrorMessage error={entry.error} onBack={ctx.onBack} onRetry={ctx.onRetry} />;
  return <ExchangePage node={node} exchangeUrl={entry.exchangeUrl} waitingMessage={entry.waitingMessage} isLoading={!entry.exchangeUrl} onBack={ctx.onBack} />;
}

function renderWalletConnect(entry: NavEntry & { type: "wallet-connect" }, ctx: RenderContext): React.ReactNode {
  const { walletFlow } = ctx;
  const title = entry.walletName ? `${t.connect} ${entry.walletName}` : t.connectWallet;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={title} onBack={ctx.canGoBack ? ctx.onBack : undefined} />

      <CenteredContent>
        {entry.walletIcon && (
          <img src={entry.walletIcon} alt={entry.walletName ?? ""} className="w-20 h-20 object-contain rounded-[25%]" />
        )}
        {walletFlow.isConnecting && (
          <span className="text-[var(--daimo-text-muted)]">{t.loading}</span>
        )}
      </CenteredContent>

      {/* Fixed bottom: error + retry, contact support */}
      <div className="px-6 pb-6 flex flex-col items-center gap-3 min-h-[100px]">
        {walletFlow.connectError && (
          <>
            <SharedErrorMessage message={walletFlow.connectError} />
            <PrimaryButton onClick={walletFlow.retryConnect}>{t.tryAgain}</PrimaryButton>
          </>
        )}
        {!entry.walletName && !walletFlow.isConnecting && !walletFlow.connectError && (
          <PrimaryButton onClick={walletFlow.connect}>{t.connectWallet}</PrimaryButton>
        )}
        <ContactSupportButton subject="Wallet connection" info={{ sessionId: ctx.session.sessionId, error: walletFlow.connectError ?? t.walletUnavailable }} />
      </div>
    </div>
  );
}

function renderWalletSelectToken(ctx: RenderContext): React.ReactNode {
  return <SelectTokenPage options={ctx.walletFlow.balances} isLoading={ctx.walletFlow.isLoadingBalances} onSelect={ctx.onWalletSelectToken} />;
}

function renderWalletSelectAmount(entry: NavEntry & { type: "wallet-select-amount" }, ctx: RenderContext): React.ReactNode {
  return <WalletAmountPage token={entry.token} onBack={ctx.onBack} onContinue={(amountUsd) => ctx.onWalletSending(entry.token, amountUsd)} />;
}

function renderWalletSending(entry: NavEntry & { type: "wallet-sending" }, ctx: RenderContext): React.ReactNode {
  if (entry.error) return <FlowErrorMessage error={entry.error} onBack={ctx.onBack} onRetry={ctx.onBack} />;
  return (
    <ConfirmationPage sessionId={ctx.session.sessionId} sourceChainId={entry.token.balance.token.chainId} sourceTokenSymbol={entry.token.balance.token.symbol} sourceTokenLogoURI={entry.token.balance.token.logoURI} sourceAmountUsd={entry.amountUsd} pendingTxHash={entry.txHash} onBack={!entry.txHash ? ctx.onBack : undefined} />
  );
}

function LoadingMessage() {
  return (
    <div className="flex items-center justify-center h-full text-[var(--daimo-text-muted)]">
      {t.loading}
    </div>
  );
}

function FlowErrorMessage({ error, onBack, onRetry }: { error: string; onBack: () => void; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-[var(--daimo-text-muted)]">
      <p>{error}</p>
      <div className="flex gap-2">
        <button className="px-4 py-2 rounded-lg bg-[var(--daimo-surface)] hover:bg-[var(--daimo-surface-hover)] transition-colors" onClick={onBack}>{t.back}</button>
        <button className="px-4 py-2 rounded-lg bg-[var(--daimo-primary)] text-white hover:opacity-90 transition-opacity" onClick={onRetry}>{t.tryAgain}</button>
      </div>
    </div>
  );
}

function SkeletonContent({ rowCount = 4 }: { rowCount?: number }) {
  const skeletonBg = "var(--daimo-skeleton, #e5e7eb)";
  const radiusLg = "var(--daimo-radius-lg, 16px)";
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-center p-6">
        <div className="h-5 w-32 rounded animate-pulse" style={{ backgroundColor: skeletonBg }} />
      </div>
      <div className="px-6 pb-4 flex flex-col gap-3">
        {[...Array(rowCount)].map((_, i) => (
          <div key={i} className="h-16 animate-pulse" style={{ backgroundColor: skeletonBg, borderRadius: radiusLg, animationDelay: `${i * 100}ms` }} />
        ))}
      </div>
      <div className="py-4 text-center">
        <span className="inline-block h-4 w-28 rounded animate-pulse" style={{ backgroundColor: skeletonBg }} />
      </div>
    </div>
  );
}
