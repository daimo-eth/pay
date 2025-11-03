import { CreateConnectorFn } from "wagmi";
import {
  coinbaseWallet,
  CoinbaseWalletParameters,
  safe,
  walletConnect,
} from "wagmi/connectors";

type DefaultConnectorsProps = {
  app: {
    name: string;
    icon?: string;
    description?: string;
    url?: string;
  };
  coinbaseWalletPreference?: CoinbaseWalletParameters<"4">["preference"];
  additionalConnectors?: CreateConnectorFn[];
  walletConnectProjectId?: string;
};

const defaultConnectors = ({
  app,
  coinbaseWalletPreference,
  additionalConnectors,
  walletConnectProjectId,
}: DefaultConnectorsProps): CreateConnectorFn[] => {
  const hasAllAppData = app.name && app.icon && app.description && app.url;
  const shouldUseSafeConnector =
    !(typeof window === "undefined") && window?.parent !== window;

  const connectors: CreateConnectorFn[] = additionalConnectors ?? [];

  // If we're in an iframe, include the SafeConnector
  if (shouldUseSafeConnector) {
    connectors.push(
      safe({
        allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      })
    );
  }

  // Add the rest of the connectors
  connectors.push(
    coinbaseWallet({
      appName: app.name,
      appLogoUrl: app.icon,
      overrideIsMetaMask: false,
      preference: coinbaseWalletPreference,
    })
  );

  if (walletConnectProjectId) {
    connectors.push(
      walletConnect({
        projectId: walletConnectProjectId,
      })
    );
  }

  return connectors;
};

export default defaultConnectors;
