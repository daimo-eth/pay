import { ROUTES } from "../../../constants/routes";
import { useConnect } from "../../../hooks/useConnect";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import useIsMobile from "../../../hooks/useIsMobile";
import { useLastConnector } from "../../../hooks/useLastConnector";
import { usePayContext } from "../../../hooks/usePayContext";
import { detectBrowser, isCoinbaseWalletConnector } from "../../../utils";
import {
  WALLET_ID_MOBILE_WALLETS,
  WALLET_ID_OTHER_WALLET,
  WalletProps,
  useWallets,
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

  const walletsToDisplay = context.options?.hideRecentBadge
    ? wallets
    : [
        // move last used wallet to top of list
        // using .filter and spread to avoid mutating original array order with .sort
        ...wallets.filter((wallet) => lastConnectorId === wallet.connector?.id),
        ...wallets.filter((wallet) => lastConnectorId !== wallet.connector?.id),
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
        <ConnectorsContainer
          $mobile={isMobile}
          $totalResults={walletsToDisplay.length}
        >
          {walletsToDisplay.map((_, idx) => (
            <SkeletonConnectorItem key={idx} />
          ))}
        </ConnectorsContainer>
      )}
      {ready && walletsToDisplay.length > 0 && (
        <ConnectorsContainer
          $mobile={isMobile}
          $totalResults={walletsToDisplay.length}
        >
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
  const redirectToMobileWallets = wallet.id === WALLET_ID_MOBILE_WALLETS;

  // Safari requires opening popup on user gesture, so we connect immediately here
  const shouldConnectImmediately =
    (detectBrowser() === "safari" || detectBrowser() === "ios") &&
    isCoinbaseWalletConnector(wallet.connector?.id);

  const onClick = () => {
    // Desktop multi-chain wallet flow: prompt for chain selection.
    if (wallet.solanaConnectorName && !isMobile) {
      const supportsEvm = wallet.connector?.name != null;
      if (supportsEvm) {
        context.paymentState.setSelectedWallet(wallet);
        context.setRoute(ROUTES.SELECT_WALLET_CHAIN);
        return;
      } else {
        context.setSolanaConnector(wallet.solanaConnectorName);
        context.setRoute(ROUTES.SOLANA_CONNECTOR);
        return;
      }
    }

    if (redirectToMoreWallets) {
      context.setRoute(ROUTES.MOBILECONNECTORS);
    } else if (redirectToMobileWallets) {
      if (context.paymentState.isDepositFlow) {
        context.paymentState.setSelectedWallet(wallet);
        context.setRoute(ROUTES.SELECT_WALLET_AMOUNT);
      } else {
        context.setPendingConnectorId(WALLET_ID_MOBILE_WALLETS);
        context.setRoute(ROUTES.CONNECT);
      }
    } else if (
      context.paymentState.isDepositFlow &&
      isMobile &&
      !wallet.connector
    ) {
      context.paymentState.setSelectedWallet(wallet);
      context.setRoute(ROUTES.SELECT_WALLET_AMOUNT);
    } else if (
      isMobile &&
      wallet.getDaimoPayDeeplink != null &&
      !wallet.connector
    ) {
      context.paymentState.openInWalletBrowser(wallet);
    } else {
      if (shouldConnectImmediately) {
        connect({ connector: wallet.connector! });
      }
      context.setPendingConnectorId(wallet.id);
      context.setRoute(ROUTES.CONNECT);
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
  const { isMobile } = useIsMobile();

  return (
    <ConnectorButton type="button" disabled>
      <SkeletonIcon $mobile={isMobile} />
      <SkeletonLabel $mobile={isMobile} />
    </ConnectorButton>
  );
};
