import { ROUTES } from "../../../constants/routes";
import { useConnect } from "../../../hooks/useConnect";
import useIsMobile from "../../../hooks/useIsMobile";
import { useLastConnector } from "../../../hooks/useLastConnector";
import { usePayContext } from "../../../hooks/usePayContext";
import {
  detectBrowser,
  isCoinbaseWalletConnector,
  isWalletConnectConnector,
} from "../../../utils";
import { WalletProps, useWallets } from "../../../wallets/useWallets";
import { ScrollArea } from "../../Common/ScrollArea";
import { useWeb3 } from "../../contexts/web3";
import Alert from "../Alert";
import {
  ConnectorButton,
  ConnectorIcon,
  ConnectorLabel,
  ConnectorsContainer,
  RecentlyUsedTag,
} from "./styles";

const ConnectorList = () => {
  const context = usePayContext();
  const { isMobile } = useIsMobile();

  const wallets = useWallets();
  const { lastConnectorId } = useLastConnector();

  const walletsToDisplay =
    context.options?.hideRecentBadge || lastConnectorId === "walletConnect" // do not hoist walletconnect to top of list
      ? wallets
      : [
          // move last used wallet to top of list
          // using .filter and spread to avoid mutating original array order with .sort
          ...wallets.filter(
            (wallet) => lastConnectorId === wallet.connector.id,
          ),
          ...wallets.filter(
            (wallet) => lastConnectorId !== wallet.connector.id,
          ),
        ];

  return (
    <ScrollArea mobileDirection={"horizontal"}>
      {walletsToDisplay.length === 0 && (
        <Alert error>No connectors found in ConnectKit config.</Alert>
      )}
      {walletsToDisplay.length > 0 && (
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
  const {
    connect: { getUri },
  } = useWeb3();
  const uri = getUri();
  const { isMobile } = useIsMobile();
  const context = usePayContext();

  const { connect } = useConnect();

  let deeplink =
    (!wallet.isInstalled && isMobile) ||
    (wallet.shouldDeeplinkDesktop && !isMobile)
      ? wallet.getWalletConnectDeeplink?.(uri ?? "")
      : undefined;

  const redirectToMoreWallets = isMobile && isWalletConnectConnector(wallet.id);
  // Safari requires opening popup on user gesture, so we connect immediately here
  const shouldConnectImmediately =
    (detectBrowser() === "safari" || detectBrowser() === "ios") &&
    isCoinbaseWalletConnector(wallet.connector.id);

  if (redirectToMoreWallets || shouldConnectImmediately) deeplink = undefined; // mobile redirects to more wallets page

  return (
    <ConnectorButton
      type="button"
      as={deeplink ? "a" : undefined}
      href={deeplink ? deeplink : undefined}
      disabled={context.route !== ROUTES.CONNECTORS}
      onClick={
        deeplink
          ? undefined
          : () => {
              if (redirectToMoreWallets) {
                context.setRoute(ROUTES.MOBILECONNECTORS);
              } else {
                if (shouldConnectImmediately) {
                  connect({ connector: wallet.connector });
                }
                context.setRoute(ROUTES.CONNECT);
                context.setPendingConnectorId(wallet.id);
              }
            }
      }
    >
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
