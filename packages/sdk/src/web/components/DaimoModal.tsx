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
import { isSessionTerminal } from "../../common/session.js";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { t } from "../hooks/locale.js";
import { createNavLogger, type NavNodeType } from "../hooks/navEvent.js";
import { useDepositAddress } from "../hooks/useDepositAddress.js";
import { usePaymentCallbacks } from "../hooks/usePaymentCallbacks.js";
import { useSessionNav } from "../hooks/useSessionNav.js";
import { useSessionPolling } from "../hooks/useSessionPolling.js";
import { useDaimoClient } from "../hooks/DaimoClientContext.js";
import {
  type DaimoModalEventHandlers,
  findNode,
  findNodeByType,
  type NavEntry,
} from "../hooks/types.js";

import { PrimaryButton } from "./buttons.js";
import { ChooseOptionPage } from "./ChooseOptionPage.js";
import { ChooseChainPage } from "./ChooseChainPage.js";
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
import { useWalletFlow } from "../hooks/useWalletFlow.js";
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
    onClose,
  } = props;
  const client = useDaimoClient();
  const [session, setSession] = useState<SessionWithNav | null>(null);
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [pageKey, setPageKey] = useState<string>();
  const [showFooterSpacer, setShowFooterSpacer] = useState(true);

  const closeRef = useRef(() => {
    setIsOpen(false);
    onClose?.();
  });

  useEffect(() => {
    client.internal.sessions
      .retrieveWithNav(sessionId, clientSecret)
      .then(({ session: s }) => setSession({ ...s, clientSecret }))
      .catch((err) => console.error("failed to fetch session:", err));
  }, [sessionId, clientSecret]);

  if (!isOpen) return null;

  const content = session ? (
    <DaimoModalInner
      {...props}
      session={session}
      isOpen={isOpen}
      setIsOpen={setIsOpen}
      closeRef={closeRef}
      setPageKey={setPageKey}
      setShowFooterSpacer={setShowFooterSpacer}
    />
  ) : (
    <SkeletonContent />
  );

  if (embedded) {
    return (
      <EmbeddedContainer showFooterSpacer={showFooterSpacer}>
        {content}
      </EmbeddedContainer>
    );
  }
  return (
    <ModalContainer
      animate={animate}
      maxHeight={maxHeight}
      onClose={() => closeRef.current()}
      pageKey={pageKey}
      showFooterSpacer={showFooterSpacer}
    >
      {content}
    </ModalContainer>
  );
}

const CONNECTED_WALLET_NAV: NavNode[] = [
  { type: "ConnectedWallet", id: "ConnectedWallet", title: "Connected Wallet" },
];

type DaimoModalInnerProps = DaimoModalProps & {
  session: SessionWithNav;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  closeRef: { current: () => void };
  setPageKey: (key: string | undefined) => void;
  setShowFooterSpacer: (show: boolean) => void;
};

function DaimoModalInner({
  session: initialSession,
  isOpen,
  setIsOpen,
  closeRef,
  setPageKey,
  setShowFooterSpacer,
  connectedWalletOnly = false,
  platform,
  returnUrl,
  returnLabel,
  onPaymentStarted,
  onPaymentCompleted,
  onOpen,
  onClose,
}: DaimoModalInnerProps) {
  const effectiveInitial = connectedWalletOnly
    ? { ...initialSession, navTree: CONNECTED_WALLET_NAV }
    : initialSession;

  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>();
  const { session, setSession } = useSessionPolling(effectiveInitial, isOpen, pendingTxHash);

  const depositAddress = useDepositAddress(session);

  const hasConnectedWallet =
    findNodeByType("ConnectedWallet", session.navTree) != null;
  const { wallets: injectedWallets, isLoading: isLoadingWallets } = useInjectedWallets();
  const walletFlow = useWalletFlow(
    session.sessionId,
    depositAddress ?? "",
    hasConnectedWallet,
    session.clientSecret,
    injectedWallets,
  );

  const nav = useSessionNav(session, setSession, isOpen, platform, walletFlow);

  useEffect(() => {
    const top = nav.topEntry;
    if (top?.type === "wallet-sending" && top.txHash) {
      setPendingTxHash(top.txHash);
    }
  }, [nav.topEntry]);

  const { handleClose } = useModalCloseHandler(
    session.sessionId,
    session.clientSecret,
    nav.getNodeCtx,
    isOpen,
    setIsOpen,
    onClose,
  );

  closeRef.current = handleClose;

  usePaymentCallbacks(session, isOpen, {
    onOpen,
    onPaymentStarted,
    onPaymentCompleted,
  });

  const isTerminal = isSessionTerminal(session.status);
  const pageKey = isTerminal
    ? session.status
    : `${nav.topEntry?.type ?? "root"}-${nav.topEntry?.nodeId ?? ""}`;

  let content: React.ReactNode;
  let showFooterSpacer = true;

  if (session.status === "expired") {
    content = <ExpiredPage sessionId={session.sessionId} onClose={handleClose} />;
  } else if (
    session.status === "processing" ||
    session.status === "succeeded" ||
    session.status === "bounced"
  ) {
    content = (
      <ConfirmationPage
        sessionId={session.sessionId}
        sessionState={session.status}
        returnUrl={returnUrl}
        returnLabel={returnLabel}
        baseUrl={session.baseUrl}
      />
    );
  } else {
    showFooterSpacer = !(
      !nav.topEntry ||
      (nav.topEntry.type === "choose-option" && !nav.canGoBack)
    );
    content = renderEntry(nav.topEntry, {
      session,
      canGoBack: nav.canGoBack,
      onNavigate: nav.handleNavigate,
      onBack: nav.handleBack,
      onAmountContinue: nav.handleAmountContinue,
      onRetry: nav.handleRetry,
      onRefresh: nav.handleRefresh,
      injectedWallets,
      isLoadingWallets,
      onInjectedWalletSelect: nav.handleInjectedWalletSelect,
      onChainSelect: nav.handleChainSelect,
      walletFlow,
      onWalletSelectToken: nav.handleWalletSelectToken,
      onWalletSending: nav.handleWalletSending,
    });
  }

  useLayoutEffect(() => setPageKey(pageKey), [pageKey, setPageKey]);
  useLayoutEffect(() => setShowFooterSpacer(showFooterSpacer), [showFooterSpacer, setShowFooterSpacer]);

  return (
    <div
      key={pageKey}
      className="daimo-page-enter flex-1 min-h-0 flex flex-col"
    >
      {content}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type RenderContext = {
  session: { sessionId: string; clientSecret: string; navTree: NavNode[]; baseUrl: string; destination: { amountUnits?: string } };
  canGoBack: boolean;
  onNavigate: (nodeId: string) => void;
  onBack: () => void;
  onAmountContinue: (amountUsd: number) => void;
  onRetry: () => void;
  onRefresh: () => Promise<void>;
  injectedWallets: InjectedWallet[];
  isLoadingWallets: boolean;
  onInjectedWalletSelect: (wallet: InjectedWallet) => void;
  onChainSelect: (chain: "evm" | "solana") => void;
  walletFlow: {
    wallet: { evmAddress: string | null; solAddress: string | null } | null;
    connectedAddress: string | null;
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
          injectedWallets={ctx.injectedWallets}
          connectedAddress={ctx.walletFlow.connectedAddress}
          onNavigate={ctx.onNavigate}
          onBack={null}
          baseUrl={ctx.session.baseUrl}
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
            baseUrl={ctx.session.baseUrl}
          />
        );
      }
      return (
        <ChooseOptionPage
          node={node}
          injectedWallets={ctx.injectedWallets}
          connectedAddress={ctx.walletFlow.connectedAddress}
          onNavigate={ctx.onNavigate}
          onBack={ctx.canGoBack ? ctx.onBack : null}
          baseUrl={ctx.session.baseUrl}
        />
      );
    }
    case "deeplink": {
      const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeDeeplink | null;
      if (!node) return null;
      return <DeeplinkPage node={node} onBack={ctx.canGoBack ? ctx.onBack : null} baseUrl={ctx.session.baseUrl} />;
    }
    case "select-amount":
      return renderSelectAmount(entry, ctx);
    case "waiting-deposit":
      return renderWaitingDeposit(entry, ctx);
    case "waiting-tron":
      return renderWaitingTron(entry, ctx);
    case "exchange-page":
      return renderExchangePage(entry, ctx);
    case "wallet-choose-chain":
      return (
        <ChooseChainPage
          walletName={entry.walletName}
          walletIcon={entry.walletIcon}
          onSelectChain={ctx.onChainSelect}
          onBack={ctx.canGoBack ? ctx.onBack : null}
          baseUrl={ctx.session.baseUrl}
        />
      );
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
      <SelectAmountPage node={depositNode} minimumUsd={depositNode.minimumUsd} maximumUsd={depositNode.maximumUsd} tokenSuffix={depositNode.tokenSuffix} chainId={depositNode.chainId} onBack={ctx.canGoBack ? ctx.onBack : undefined} onContinue={ctx.onAmountContinue} baseUrl={ctx.session.baseUrl} />
    );
  }
  if (entry.flowType === "tron") {
    const tronNode = node as NavNodeTronDeposit;
    return (
      <SelectAmountPage node={{ icon: tronNode.icon, title: tronNode.title }} minimumUsd={tronNode.minimumUsd} maximumUsd={tronNode.maximumUsd} tokenSuffix="USDT" chainId={tron.chainId} onBack={ctx.canGoBack ? ctx.onBack : undefined} onContinue={ctx.onAmountContinue} baseUrl={ctx.session.baseUrl} />
    );
  }
  if (entry.flowType === "exchange") {
    const exchangeNode = node as NavNodeExchange;
    return (
      <SelectAmountPage node={{ icon: exchangeNode.icon, title: exchangeNode.title }} minimumUsd={exchangeNode.minimumUsd} maximumUsd={exchangeNode.maximumUsd} onBack={ctx.canGoBack ? ctx.onBack : undefined} onContinue={ctx.onAmountContinue} baseUrl={ctx.session.baseUrl} />
    );
  }
  return null;
}

function renderWaitingDeposit(entry: NavEntry & { type: "waiting-deposit" }, ctx: RenderContext): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeDepositAddress | null;
  if (!node) return null;
  const selectedToken = node.tokenSuffix === "USDC" || node.tokenSuffix === "USDT" ? node.tokenSuffix : undefined;
  return <WaitingDepositAddressPage node={node} amountUsd={entry.amountUsd} selectedToken={selectedToken} sessionId={ctx.session.sessionId} clientSecret={ctx.session.clientSecret} onBack={ctx.onBack} onRefresh={ctx.onRefresh} baseUrl={ctx.session.baseUrl} />;
}

function renderWaitingTron(entry: NavEntry & { type: "waiting-tron" }, ctx: RenderContext): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeTronDeposit | null;
  if (!node) return null;
  if (entry.error) return <FlowErrorMessage error={entry.error} onBack={ctx.onBack} onRetry={ctx.onRetry} />;
  return (
    <WaitingDepositAddressPage
      node={{ type: "DepositAddress", id: entry.nodeId, title: node.title, address: (entry.address as `0x${string}`) ?? ("" as `0x${string}`), chainId: tron.chainId, icon: node.icon, minimumUsd: node.minimumUsd, maximumUsd: node.maximumUsd, expiresAt: entry.expiresAt ?? 0, tokenSuffix: "USDT" }}
      amountUsd={entry.amountUsd} selectedToken="USDT" loading={!entry.address} sessionId={ctx.session.sessionId} clientSecret={ctx.session.clientSecret} onBack={ctx.onBack} onRefresh={ctx.onRetry} baseUrl={ctx.session.baseUrl}
    />
  );
}

function renderExchangePage(entry: NavEntry & { type: "exchange-page" }, ctx: RenderContext): React.ReactNode {
  const node = findNode(entry.nodeId, ctx.session.navTree) as NavNodeExchange | null;
  if (!node) return null;
  if (entry.error) return <FlowErrorMessage error={entry.error} onBack={ctx.onBack} onRetry={ctx.onRetry} />;
  return <ExchangePage node={node} exchangeUrl={entry.exchangeUrl} waitingMessage={entry.waitingMessage} isLoading={!entry.exchangeUrl} onBack={ctx.onBack} baseUrl={ctx.session.baseUrl} />;
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
  const { walletFlow } = ctx;
  // Show error if wallet connection failed (e.g. ConnectedWallet skips wallet-connect page)
  if (!walletFlow.isLoadingBalances && walletFlow.balances === null && walletFlow.connectError) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PageHeader title={t.selectToken} onBack={ctx.canGoBack ? ctx.onBack : null} borderVisible={false} />
        <CenteredContent>
          <SharedErrorMessage message={walletFlow.connectError} />
          <PrimaryButton onClick={walletFlow.retryConnect}>{t.tryAgain}</PrimaryButton>
        </CenteredContent>
      </div>
    );
  }
  const isLoading = ctx.isLoadingWallets || walletFlow.isConnecting || walletFlow.isLoadingBalances;
  const showRequired = !!ctx.session.destination?.amountUnits;
  return <SelectTokenPage options={walletFlow.balances} isLoading={isLoading} showRequired={showRequired} onSelect={ctx.onWalletSelectToken} onBack={ctx.canGoBack ? ctx.onBack : null} baseUrl={ctx.session.baseUrl} />;
}

function renderWalletSelectAmount(entry: NavEntry & { type: "wallet-select-amount" }, ctx: RenderContext): React.ReactNode {
  return <WalletAmountPage token={entry.token} onBack={ctx.onBack} onContinue={(amountUsd) => ctx.onWalletSending(entry.token, amountUsd)} baseUrl={ctx.session.baseUrl} />;
}

function renderWalletSending(entry: NavEntry & { type: "wallet-sending" }, ctx: RenderContext): React.ReactNode {
  if (entry.error) return <FlowErrorMessage error={entry.error} onBack={ctx.onBack} onRetry={ctx.onBack} />;
  return (
    <ConfirmationPage sessionId={ctx.session.sessionId} sourceChainId={entry.token.balance.token.chainId} sourceTokenSymbol={entry.token.balance.token.symbol} sourceTokenLogoURI={entry.token.balance.token.logoURI} sourceAmountUsd={entry.amountUsd} pendingTxHash={entry.txHash} rejected={entry.rejected} onRetry={ctx.onRetry} onBack={!entry.txHash ? ctx.onBack : undefined} baseUrl={ctx.session.baseUrl} />
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
