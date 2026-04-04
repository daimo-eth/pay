import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { Address } from "viem";
import { tron } from "../../common/chain.js";
import { isSessionTerminal } from "../../common/session.js";
import type {
  NavNode,
  NavNodeCashApp,
  NavNodeChooseOption,
  NavNodeConnectedWallet,
  NavNodeDeeplink,
  NavNodeDepositAddress,
  NavNodeExchange,
  NavNodeTronDeposit,
  SessionWithNav,
} from "../api/navTree.js";
import type { WalletPaymentOption } from "../api/walletTypes.js";

import { useDaimoClient } from "../hooks/DaimoClientContext.js";
import { formatUserError } from "../hooks/formatUserError.js";
import { t } from "../hooks/locale.js";
import { createNavLogger, type NavNodeType } from "../hooks/navEvent.js";
import {
  findNode,
  findNodeByType,
  type DaimoModalEventHandlers,
  type NavEntry,
} from "../hooks/types.js";
import { useDepositAddress } from "../hooks/useDepositAddress.js";
import { useAccountFlow } from "../hooks/useAccountFlow.js";
import { usePaymentCallbacks } from "../hooks/usePaymentCallbacks.js";
import { useSessionNav } from "../hooks/useSessionNav.js";
import { useSessionPolling } from "../hooks/useSessionPolling.js";
import { AccountFlowProvider } from "./account/AccountFlowProvider.js";

import {
  useInjectedWallets,
  type InjectedWallet,
} from "../hooks/useInjectedWallets.js";
import { useWalletFlow } from "../hooks/useWalletFlow.js";
import { PrimaryButton } from "./buttons.js";
import { ChooseChainPage } from "./ChooseChainPage.js";
import { ChooseOptionPage } from "./ChooseOptionPage.js";
import { ChooseWalletPage } from "./ChooseWalletPage.js";
import { ConfirmationPage } from "./ConfirmationPage.js";
import { EmbeddedContainer, ModalContainer } from "./containers.js";
import { DeeplinkPage } from "./DeeplinkPage.js";
import { ExchangePage } from "./ExchangePage.js";
import { ExpiredPage } from "./ExpiredPage.js";
import { AccountBankPickerPage } from "./account/AccountBankPickerPage.js";
import { AccountCreatingWalletPage } from "./account/AccountCreatingWalletPage.js";
import { AccountDeeplinkPage } from "./account/AccountDeeplinkPage.js";
import { AccountEmailPage } from "./account/AccountEmailPage.js";
import { AccountEnrollmentPage } from "./account/AccountEnrollmentPage.js";
import { AccountOtpPage } from "./account/AccountOtpPage.js";
import { AccountPaymentPage } from "./account/AccountPaymentPage.js";
import { AccountStatusPage } from "./account/AccountStatusPage.js";
import { SelectAmountPage } from "./SelectAmountPage.js";
import { SelectTokenPage } from "./SelectTokenPage.js";
import {
  CenteredContent,
  ContactSupportButton,
  PageHeader,
  ErrorMessage as SharedErrorMessage,
} from "./shared.js";
import { WaitingDepositAddressPage } from "./WaitingDepositAddressPage.js";
import { WalletAmountPage } from "./WalletAmountPage.js";

type ExchangeLikeNode = NavNodeExchange | NavNodeCashApp;

export type DaimoModalProps = DaimoModalEventHandlers & {
  /** Unique session ID. Sessions are created server-side. */
  sessionId: string;
  /** Unique client secret, returned at session creation. */
  clientSecret: string;
  /** Whether the modal starts open. Default: true. */
  defaultOpen?: boolean;
  /** Skip payment method picker. Auto-connect to injected wallets. */
  connectToInjectedWallets?: boolean;
  /** Skip payment method picker. Use already-connected wallet specified. */
  connectToAddress?: Address;
  /** Render inline instead of as a floating modal. */
  embedded?: boolean;
  /** Caller's platform. Affects exchange deeplink generation. Auto-detected. */
  platform?: "ios" | "android" | "other";
  /** URL to navigate to after successful payment. */
  returnUrl?: string;
  /** Text shown on successful payment. Button label if returnUrl set, otherwise plain text. */
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
    logNavEvent(sessionId, clientSecret, {
      ...getNodeCtx(),
      action: "nav_open",
    });
  }, [isOpen, sessionId, getNodeCtx]);

  const handleClose = useCallback(() => {
    logNavEvent(sessionId, clientSecret, {
      ...getNodeCtx(),
      action: "nav_close",
    });
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
    defaultOpen = true,
    onClose,
  } = props;
  const client = useDaimoClient();
  const [session, setSession] = useState<SessionWithNav | null>(null);
  const [privyAppId, setPrivyAppId] = useState<string | undefined>();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [pageKey, setPageKey] = useState<string>();
  const [showFooterSpacer, setShowFooterSpacer] = useState(true);
  const [showCloseButton, setShowCloseButton] = useState(true);

  const closeRef = useRef(() => {
    setIsOpen(false);
    onClose?.();
  });

  useEffect(() => {
    client.internal.sessions
      .retrieveWithNav(sessionId, clientSecret)
      .then((resp) => {
        setSession({ ...resp.session, clientSecret });
        if (resp.privyAppId) setPrivyAppId(resp.privyAppId);
      })
      .catch((err) => console.error("failed to fetch session:", err));
  }, [sessionId, clientSecret]);

  // If the API returned a privyAppId and no AccountFlowProvider exists
  // upstream (e.g. customer didn't pass privyAppId to DaimoSDKProvider),
  // lazily wrap modal content so AccountDeposit flow works automatically.
  const existingAccountFlow = useAccountFlow();
  const needsAccountProvider = !!privyAppId && !existingAccountFlow;

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
      setShowCloseButton={setShowCloseButton}
    />
  ) : (
    <SkeletonContent rowCount={3} />
  );

  const wrapped = needsAccountProvider ? (
    <AccountFlowProvider privyAppId={privyAppId!}>
      {content}
    </AccountFlowProvider>
  ) : (
    content
  );

  if (embedded) {
    return (
      <EmbeddedContainer showFooterSpacer={showFooterSpacer}>
        {wrapped}
      </EmbeddedContainer>
    );
  }
  return (
    <ModalContainer
      onClose={showCloseButton ? () => closeRef.current() : undefined}
      pageKey={pageKey}
      showFooterSpacer={showFooterSpacer}
    >
      {wrapped}
    </ModalContainer>
  );
}

const CONNECTED_WALLET_NODE: NavNode = {
  type: "ConnectedWallet",
  id: "ConnectedWallet",
  title: "Connected Wallet",
};
const AUTOCONNECT_NAV: NavNode[] = [
  { ...CONNECTED_WALLET_NODE, autoconnect: true },
];
const CONNECT_TO_ADDRESS_NAV: NavNode[] = [CONNECTED_WALLET_NODE];

type DaimoModalInnerProps = DaimoModalProps & {
  session: SessionWithNav;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  closeRef: { current: () => void };
  setPageKey: (key: string | undefined) => void;
  setShowFooterSpacer: (show: boolean) => void;
  setShowCloseButton: (show: boolean) => void;
};

function DaimoModalInner({
  session: initialSession,
  isOpen,
  setIsOpen,
  closeRef,
  setPageKey,
  setShowFooterSpacer,
  setShowCloseButton,
  connectToInjectedWallets = false,
  connectToAddress,
  platform,
  returnUrl,
  returnLabel,
  onPaymentStarted,
  onPaymentCompleted,
  onOpen,
  onClose,
}: DaimoModalInnerProps) {
  const effectiveInitial = connectToAddress
    ? { ...initialSession, navTree: CONNECT_TO_ADDRESS_NAV }
    : connectToInjectedWallets
      ? { ...initialSession, navTree: AUTOCONNECT_NAV }
      : initialSession;

  const [pendingTxHash, setPendingTxHash] = useState<string | undefined>();
  const { session, setSession } = useSessionPolling(
    effectiveInitial,
    isOpen,
    pendingTxHash,
  );

  const depositAddress = useDepositAddress(session);

  const cwNode = findNodeByType("ConnectedWallet", session.navTree) as NavNodeConnectedWallet | null;
  const connectMode: "auto" | "passive" | "none" = cwNode
    ? cwNode.autoconnect
      ? "auto"
      : "passive"
    : "none";
  const { wallets: injectedWallets, isLoading: isLoadingWallets } = useInjectedWallets();
  const walletFlow = useWalletFlow(
    session.sessionId,
    depositAddress ?? "",
    connectMode,
    session.clientSecret,
    injectedWallets,
    connectToAddress,
  );

  const accountFlow = useAccountFlow();
  const nav = useSessionNav(session, setSession, isOpen, platform, walletFlow, accountFlow);

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
  const isAccountFlow = nav.topEntry?.type?.startsWith("account-") ?? false;
  const navKey = `${nav.topEntry?.type ?? "root"}-${nav.topEntry?.nodeId ?? ""}`;
  // Account flows manage their own terminal states — don't remount on session status change
  const pageKey = isTerminal && !isAccountFlow
    ? session.status
    : navKey;

  let content: React.ReactNode;
  let showFooterSpacer = true;
  let showClose = true;

  if (session.status === "expired") {
    content = (
      <ExpiredPage sessionId={session.sessionId} onClose={handleClose} />
    );
  } else if (
    !isAccountFlow &&
    (session.status === "processing" ||
    session.status === "succeeded" ||
    session.status === "bounced")
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
      onAccountAdvance: nav.handleAccountAdvance,
    });
  }

  const isFirstPage = useRef(true);
  useLayoutEffect(() => setPageKey(pageKey), [pageKey, setPageKey]);
  useLayoutEffect(
    () => setShowFooterSpacer(showFooterSpacer),
    [showFooterSpacer, setShowFooterSpacer],
  );
  useLayoutEffect(
    () => setShowCloseButton(showClose),
    [showClose, setShowCloseButton],
  );

  // Skip page-enter animation on first render — container animation handles it
  const animate = !isFirstPage.current;
  useEffect(() => { isFirstPage.current = false; }, []);

  return (
    <div
      key={pageKey}
      className={`${animate ? "daimo-page-enter " : ""}daimo-flex-1 daimo-min-h-0 daimo-flex daimo-flex-col`}
    >
      {content}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type RenderContext = {
  session: {
    sessionId: string;
    clientSecret: string;
    navTree: NavNode[];
    baseUrl: string;
    destination: { amountUnits?: string };
  };
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
  onAccountAdvance: (nextType: NavEntry["type"]) => void;
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
      const node = findNode(
        entry.nodeId,
        ctx.session.navTree,
      ) as NavNodeChooseOption | null;
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
      const node = findNode(
        entry.nodeId,
        ctx.session.navTree,
      ) as NavNodeDeeplink | null;
      if (!node) return null;
      return (
        <DeeplinkPage
          node={node}
          onBack={ctx.canGoBack ? ctx.onBack : null}
          baseUrl={ctx.session.baseUrl}
        />
      );
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
    case "account-email":
      return (
        <AccountEmailPage
          onBack={ctx.canGoBack ? ctx.onBack : null}
          onOtpSent={() => ctx.onAccountAdvance("account-otp")}
        />
      );
    case "account-otp":
      return (
        <AccountOtpPage
          onBack={ctx.onBack}
          onVerified={() => ctx.onAccountAdvance("account-creating-wallet")}
        />
      );
    case "account-creating-wallet":
      return (
        <AccountCreatingWalletPage
          sessionId={ctx.session.sessionId}
          clientSecret={ctx.session.clientSecret}
          onDone={() => ctx.onAccountAdvance("account-enrollment")}
        />
      );
    case "account-enrollment":
      return (
        <AccountEnrollmentPage
          region={entry.region}
          sessionId={ctx.session.sessionId}
          onBack={ctx.onBack}
          onReady={() => ctx.onAccountAdvance("account-payment")}
        />
      );
    case "account-payment":
      return (
        <AccountPaymentPage
          region={entry.region}
          sessionId={ctx.session.sessionId}
          onBack={ctx.onBack}
          onAdvance={() => ctx.onAccountAdvance("account-bank-picker")}
        />
      );
    case "account-bank-picker":
      return (
        <AccountBankPickerPage
          region={entry.region}
          sessionId={ctx.session.sessionId}
          onBack={ctx.onBack}
          onSelect={() => ctx.onAccountAdvance("account-deeplink")}
        />
      );
    case "account-deeplink": {
      const accountNode = findNode(entry.nodeId, ctx.session.navTree);
      return (
        <AccountDeeplinkPage
          region={entry.region}
          sessionId={ctx.session.sessionId}
          clientSecret={ctx.session.clientSecret}
          baseUrl={ctx.session.baseUrl}
          icon={accountNode?.type === "AccountDeposit" ? accountNode.icon : undefined}
          onBack={ctx.onBack}
          onAdvance={() => ctx.onAccountAdvance("account-status")}
        />
      );
    }
    case "account-status":
      return (
        <AccountStatusPage
          region={entry.region}
          sessionId={ctx.session.sessionId}
          clientSecret={ctx.session.clientSecret}
          baseUrl={ctx.session.baseUrl}
        />
      );
    case "account-error":
      return (
        <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
          <PageHeader title={t.error} onBack={ctx.canGoBack ? ctx.onBack : null} />
          <CenteredContent>
            <SharedErrorMessage message={entry.message} />
          </CenteredContent>
        </div>
      );
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
      <SelectAmountPage
        node={depositNode}
        minimumUsd={depositNode.minimumUsd}
        maximumUsd={depositNode.maximumUsd}
        tokenSuffix={depositNode.tokenSuffix}
        chainId={depositNode.chainId}
        onBack={ctx.canGoBack ? ctx.onBack : undefined}
        onContinue={ctx.onAmountContinue}
        baseUrl={ctx.session.baseUrl}
      />
    );
  }
  if (entry.flowType === "tron") {
    const tronNode = node as NavNodeTronDeposit;
    return (
      <SelectAmountPage
        node={{ icon: tronNode.icon, title: tronNode.title }}
        minimumUsd={tronNode.minimumUsd}
        maximumUsd={tronNode.maximumUsd}
        tokenSuffix="USDT"
        chainId={tron.chainId}
        onBack={ctx.canGoBack ? ctx.onBack : undefined}
        onContinue={ctx.onAmountContinue}
        baseUrl={ctx.session.baseUrl}
      />
    );
  }
  if (entry.flowType === "exchange") {
    const exchangeNode = node as NavNodeExchange;
    return (
      <SelectAmountPage
        node={{ icon: exchangeNode.icon, title: exchangeNode.title }}
        minimumUsd={exchangeNode.minimumUsd}
        maximumUsd={exchangeNode.maximumUsd}
        onBack={ctx.canGoBack ? ctx.onBack : undefined}
        onContinue={ctx.onAmountContinue}
        baseUrl={ctx.session.baseUrl}
      />
    );
  }
  if (entry.flowType === "cashapp") {
    const cashAppNode = node as NavNodeCashApp;
    return (
      <SelectAmountPage
        node={{ icon: cashAppNode.icon, title: cashAppNode.title }}
        minimumUsd={cashAppNode.minimumUsd}
        maximumUsd={cashAppNode.maximumUsd}
        onBack={ctx.canGoBack ? ctx.onBack : undefined}
        onContinue={ctx.onAmountContinue}
        baseUrl={ctx.session.baseUrl}
      />
    );
  }
  return null;
}

function renderWaitingDeposit(
  entry: NavEntry & { type: "waiting-deposit" },
  ctx: RenderContext,
): React.ReactNode {
  const node = findNode(
    entry.nodeId,
    ctx.session.navTree,
  ) as NavNodeDepositAddress | null;
  if (!node) return null;
  const selectedToken =
    node.tokenSuffix === "USDC" || node.tokenSuffix === "USDT"
      ? node.tokenSuffix
      : undefined;
  return (
    <WaitingDepositAddressPage
      node={node}
      amountUsd={entry.amountUsd}
      selectedToken={selectedToken}
      sessionId={ctx.session.sessionId}
      clientSecret={ctx.session.clientSecret}
      onBack={ctx.onBack}
      onRefresh={ctx.onRefresh}
      baseUrl={ctx.session.baseUrl}
    />
  );
}

function renderWaitingTron(
  entry: NavEntry & { type: "waiting-tron" },
  ctx: RenderContext,
): React.ReactNode {
  const node = findNode(
    entry.nodeId,
    ctx.session.navTree,
  ) as NavNodeTronDeposit | null;
  if (!node) return null;
  if (entry.error)
    return (
      <FlowErrorMessage
        error={entry.error}
        sessionId={ctx.session.sessionId}
        onBack={ctx.onBack}
        onRetry={ctx.onRetry}
      />
    );
  return (
    <WaitingDepositAddressPage
      node={{
        type: "DepositAddress",
        id: entry.nodeId,
        title: node.title,
        address: (entry.address as `0x${string}`) ?? ("" as `0x${string}`),
        chainId: tron.chainId,
        icon: node.icon,
        minimumUsd: node.minimumUsd,
        maximumUsd: node.maximumUsd,
        expiresAt: entry.expiresAt ?? 0,
        tokenSuffix: "USDT",
      }}
      amountUsd={entry.amountUsd}
      selectedToken="USDT"
      loading={!entry.address}
      sessionId={ctx.session.sessionId}
      clientSecret={ctx.session.clientSecret}
      onBack={ctx.onBack}
      onRefresh={ctx.onRetry}
      baseUrl={ctx.session.baseUrl}
    />
  );
}

function renderExchangePage(
  entry: NavEntry & { type: "exchange-page" },
  ctx: RenderContext,
): React.ReactNode {
  const node = findNode(
    entry.nodeId,
    ctx.session.navTree,
  ) as ExchangeLikeNode | null;
  if (!node) return null;
  if (entry.error)
    return (
      <FlowErrorMessage
        error={entry.error}
        sessionId={ctx.session.sessionId}
        onBack={ctx.onBack}
        onRetry={ctx.onRetry}
      />
    );
  return (
    <ExchangePage
      node={node}
      exchangeUrl={entry.exchangeUrl}
      waitingMessage={entry.waitingMessage}
      expiresAt={entry.expiresAt}
      isLoading={!entry.exchangeUrl}
      onBack={ctx.onBack}
      onRetry={ctx.onRetry}
      baseUrl={ctx.session.baseUrl}
    />
  );
}

function renderWalletConnect(
  entry: NavEntry & { type: "wallet-connect" },
  ctx: RenderContext,
): React.ReactNode {
  const { walletFlow } = ctx;
  const title = entry.walletName
    ? `${t.connect} ${entry.walletName}`
    : t.connectWallet;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader
        title={title}
        onBack={ctx.canGoBack ? ctx.onBack : undefined}
      />

      <CenteredContent>
        {entry.walletIcon && (
          <img
            src={entry.walletIcon}
            alt={entry.walletName ?? ""}
            className="daimo-w-20 daimo-h-20 daimo-object-contain daimo-rounded-[25%]"
          />
        )}
        {walletFlow.isConnecting && (
          <span className="daimo-text-[var(--daimo-text-muted)]">
            {t.loading}
          </span>
        )}
      </CenteredContent>

      {/* Fixed bottom: error + retry, contact support */}
      <div className="daimo-px-6 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center daimo-gap-3 daimo-min-h-[100px]">
        {walletFlow.connectError && (
          <>
            <SharedErrorMessage message={walletFlow.connectError} />
            <PrimaryButton onClick={walletFlow.retryConnect}>
              {t.tryAgain}
            </PrimaryButton>
          </>
        )}
        {!entry.walletName &&
          !walletFlow.isConnecting &&
          !walletFlow.connectError && (
            <PrimaryButton onClick={walletFlow.connect}>
              {t.connectWallet}
            </PrimaryButton>
          )}
        <ContactSupportButton
          subject="Wallet connection"
          info={{
            sessionId: ctx.session.sessionId,
            error: walletFlow.connectError ?? t.walletUnavailable,
          }}
        />
      </div>
    </div>
  );
}

function renderWalletSelectToken(ctx: RenderContext): React.ReactNode {
  const { walletFlow } = ctx;
  // Show error if wallet connection failed (e.g. ConnectedWallet skips wallet-connect page)
  if (
    !walletFlow.isLoadingBalances &&
    walletFlow.balances === null &&
    walletFlow.connectError
  ) {
    return (
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader
          title={t.selectToken}
          onBack={ctx.canGoBack ? ctx.onBack : null}
          borderVisible={false}
        />
        <CenteredContent>
          <SharedErrorMessage message={walletFlow.connectError} />
          <PrimaryButton onClick={walletFlow.retryConnect}>
            {t.tryAgain}
          </PrimaryButton>
        </CenteredContent>
      </div>
    );
  }
  const isLoading =
    ctx.isLoadingWallets ||
    walletFlow.isConnecting ||
    walletFlow.isLoadingBalances;
  // Is the amount pre-set in the session? If so, show the required amount the
  // user should pay in the token selection page.
  const showRequired = !!ctx.session.destination.amountUnits;
  return (
    <SelectTokenPage
      options={walletFlow.balances}
      isLoading={isLoading}
      showRequired={showRequired}
      onSelect={ctx.onWalletSelectToken}
      onBack={ctx.canGoBack ? ctx.onBack : null}
      baseUrl={ctx.session.baseUrl}
      sessionId={ctx.session.sessionId}
    />
  );
}

function renderWalletSelectAmount(
  entry: NavEntry & { type: "wallet-select-amount" },
  ctx: RenderContext,
): React.ReactNode {
  return (
    <WalletAmountPage
      token={entry.token}
      onBack={ctx.onBack}
      onContinue={(amountUsd) => ctx.onWalletSending(entry.token, amountUsd)}
      baseUrl={ctx.session.baseUrl}
    />
  );
}

function renderWalletSending(
  entry: NavEntry & { type: "wallet-sending" },
  ctx: RenderContext,
): React.ReactNode {
  if (entry.error)
    return (
      <FlowErrorMessage
        error={entry.error}
        sessionId={ctx.session.sessionId}
        onBack={ctx.onBack}
        onRetry={ctx.onBack}
      />
    );
  return (
    <ConfirmationPage
      sessionId={ctx.session.sessionId}
      sourceChainId={entry.token.balance.token.chainId}
      sourceTokenSymbol={entry.token.balance.token.symbol}
      sourceTokenLogoURI={entry.token.balance.token.logoURI}
      sourceAmountUsd={entry.amountUsd}
      pendingTxHash={entry.txHash}
      rejected={entry.rejected}
      onRetry={ctx.onRetry}
      onBack={!entry.txHash ? ctx.onBack : undefined}
      baseUrl={ctx.session.baseUrl}
    />
  );
}

function LoadingMessage() {
  return (
    <div className="daimo-flex daimo-items-center daimo-justify-center daimo-h-full daimo-text-[var(--daimo-text-muted)]">
      {t.loading}
    </div>
  );
}

function FlowErrorMessage({
  error,
  sessionId,
  onBack,
  onRetry,
}: {
  error: string;
  sessionId?: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={t.error} onBack={onBack} />
      <div className="daimo-flex daimo-flex-col daimo-items-center daimo-justify-center daimo-flex-1 daimo-gap-8 daimo-text-[var(--daimo-text-muted)]">
        <p>{formatUserError(error)}</p>
        <PrimaryButton onClick={onRetry}>{t.tryAgain}</PrimaryButton>
        <ContactSupportButton
          subject={t.error}
          info={{
            ...(sessionId ? { sessionId } : {}),
            error,
          }}
        />
      </div>
    </div>
  );
}

function SkeletonContent({ rowCount = 4 }: { rowCount?: number }) {
  const skeletonBg = "var(--daimo-skeleton, #e5e7eb)";
  const radiusLg = "var(--daimo-radius-lg, 16px)";
  return (
    <div className="daimo-flex daimo-flex-col">
      <div className="daimo-flex daimo-items-center daimo-justify-center daimo-p-6">
        <div
          className="daimo-h-5 daimo-w-32 daimo-rounded daimo-animate-daimo-pulse"
          style={{ backgroundColor: skeletonBg }}
        />
      </div>
      <div className="daimo-px-6 daimo-pb-4 daimo-flex daimo-flex-col daimo-gap-3">
        {[...Array(rowCount)].map((_, i) => (
          <div
            key={i}
            className="daimo-h-16 daimo-animate-daimo-pulse"
            style={{
              backgroundColor: skeletonBg,
              borderRadius: radiusLg,
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
      <div className="daimo-py-4 daimo-text-center">
        <span
          className="daimo-inline-block daimo-h-4 daimo-w-28 daimo-rounded daimo-animate-daimo-pulse"
          style={{ backgroundColor: skeletonBg }}
        />
      </div>
    </div>
  );
}
