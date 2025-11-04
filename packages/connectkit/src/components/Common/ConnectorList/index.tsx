import { ROUTES } from "../../../constants/routes";
import { WALLET_ID_OTHER_WALLET } from "../../../constants/wallets";
import { useConnect } from "../../../hooks/useConnect";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import useIsMobile from "../../../hooks/useIsMobile";
import { useLastConnector } from "../../../hooks/useLastConnector";
import { usePayContext } from "../../../hooks/usePayContext";
import {
  detectBrowser,
  isBaseAccountConnector,
  isGeminiConnector,
} from "../../../utils";
import {
  isExternalWallet,
  useWallets,
  WalletProps,
} from "../../../wallets/useWallets";
import { ScrollArea } from "../../Common/ScrollArea";
import Alert from "../Alert";
import {
  ConnectorButton,
  ConnectorIcon,
  ConnectorLabel,
  ConnectorsContainer,
  RecentlyUsedTag,
  SkeletonIcon,
  SkeletonLabel,
} from "./styles";

const ConnectorList = () => {
  const context = usePayContext();
  const { isMobile } = useIsMobile();

  const wallets = useWallets(isMobile);
  const { lastConnectorId } = useLastConnector();
  const { paymentState } = useDaimoPay();
  const prioritizedId = context.paymentState.buttonProps?.prioritizedWalletId;

  const walletsToDisplay = context.options?.hideRecentBadge
    ? wallets
    : [
        // prioritized wallet at very top
        ...wallets.filter((wallet) => wallet.id === prioritizedId),
        // then recent wallet if different from prioritized
        ...wallets.filter(
          (wallet) =>
            lastConnectorId === wallet.connector?.id &&
            wallet.id !== prioritizedId,
        ),
        // remaining wallets
        ...wallets.filter(
          (wallet) =>
            wallet.id !== prioritizedId &&
            lastConnectorId !== wallet.connector?.id,
        ),
      ];

  // For mobile flow, we need to wait for the order to be hydrated before
  // we can deeplink to the in-wallet browser.
  const shouldWaitForHydration =
    isMobile && !context.paymentState.isDepositFlow;
  const ready = !shouldWaitForHydration || paymentState === "payment_unpaid";

  return (
    <ScrollArea mobileDirection={"horizontal"}>
      {walletsToDisplay.length === 0 && (
        <Alert error>No connectors found in ConnectKit config.</Alert>
      )}
      {!ready && walletsToDisplay.length > 0 && (
        <ConnectorsContainer $totalResults={walletsToDisplay.length}>
          {walletsToDisplay.map((_, idx) => (
            <SkeletonConnectorItem key={idx} />
          ))}
        </ConnectorsContainer>
      )}
      {ready && walletsToDisplay.length > 0 && (
        <ConnectorsContainer $totalResults={walletsToDisplay.length}>
          {walletsToDisplay.map((wallet) => (
            <ConnectorItem
              key={wallet.id}
              wallet={wallet}
              isRecent={wallet.id === lastConnectorId}
            />
          ))}
        </ConnectorsContainer>
      )}
    </ScrollArea>
  );
};

export default ConnectorList;

const ConnectorItem = ({
  wallet,
  isRecent,
}: {
  wallet: WalletProps;
  isRecent?: boolean;
}) => {
  const { isMobile } = useIsMobile();
  const context = usePayContext();
  const { connect } = useConnect();

  // The "Other" 2x2 connector, goes to the MobileConnectors page.
  const redirectToMoreWallets =
    isMobile && wallet.id === WALLET_ID_OTHER_WALLET;
  const isExternalWalletFlow = isExternalWallet(wallet);

  // Safari requires opening popup on user gesture, so we connect immediately here
  const shouldConnectImmediately =
    (detectBrowser() === "safari" || detectBrowser() === "ios") &&
    (isBaseAccountConnector(wallet.connector?.id) ||
      isGeminiConnector(wallet.connector?.id));

  const onClick = async () => {
    const meta = { event: "connector-list-click", walletId: wallet.id };

    // Desktop multi-chain wallet flow: prompt for chain selection.
    if (wallet.solanaConnectorName && !isMobile) {
      const supportsEvm = wallet.connector?.name != null;
      if (supportsEvm) {
        context.paymentState.setSelectedWallet(wallet);
        context.setRoute(ROUTES.SELECT_WALLET_CHAIN, meta);
        return;
      } else {
        context.setSolanaConnector(wallet.solanaConnectorName);
        context.setRoute(ROUTES.SOLANA_CONNECTOR, meta);
        return;
      }
    }
    if (redirectToMoreWallets) {
      context.setRoute(ROUTES.MOBILECONNECTORS, meta);
    } else if (isExternalWalletFlow) {
      if (context.paymentState.isDepositFlow) {
        context.paymentState.setSelectedWallet(wallet);
        context.setRoute(ROUTES.SELECT_WALLET_AMOUNT, meta);
      } else if (isMobile) {
        // On mobile, open external wallet directly via deeplink
        await context.paymentState.openInWalletBrowser(wallet);
      } else {
        // On desktop, show QR code for external wallets
        context.setPendingConnectorId(wallet.id);
        context.setRoute(ROUTES.CONNECT, meta);
      }
    } else if (
      context.paymentState.isDepositFlow &&
      isMobile &&
      !wallet.connector
    ) {
      context.paymentState.setSelectedWallet(wallet);
      context.setRoute(ROUTES.SELECT_WALLET_AMOUNT, meta);
    } else if (isMobile && wallet.getDaimoPayDeeplink != null) {
      await context.paymentState.openInWalletBrowser(wallet);
    } else {
      if (shouldConnectImmediately) {
        connect({ connector: wallet.connector! });
      }
      context.setPendingConnectorId(wallet.id);
      context.setRoute(ROUTES.CONNECT, meta);
    }
  };

  return (
    <ConnectorButton type="button" onClick={onClick}>
      <ConnectorIcon
        data-small={wallet.iconShouldShrink}
        data-shape={wallet.iconShape}
      >
        {wallet.iconConnector ?? wallet.icon}
      </ConnectorIcon>
      <ConnectorLabel>
        {isMobile ? (wallet.shortName ?? wallet.name) : wallet.name}
        {!context.options?.hideRecentBadge && isRecent && (
          <RecentlyUsedTag>
            <span>Recent</span>
          </RecentlyUsedTag>
        )}
      </ConnectorLabel>
    </ConnectorButton>
  );
};

const SkeletonConnectorItem = () => {
  return (
    <ConnectorButton type="button" disabled>
      <SkeletonIcon />
      <SkeletonLabel />
    </ConnectorButton>
  );
};
