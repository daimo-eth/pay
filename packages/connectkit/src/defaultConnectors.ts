import { baseAccount, gemini, safe } from "@wagmi/connectors";
import { porto } from "porto/wagmi";
import { CreateConnectorFn } from "wagmi";

type DefaultConnectorsProps = {
  app: {
    name: string;
    icon?: string;
    description?: string;
    url?: string;
  };
  additionalConnectors?: CreateConnectorFn[];
};

const defaultConnectors = ({
  app,
  additionalConnectors,
}: DefaultConnectorsProps): CreateConnectorFn[] => {
  const shouldUseSafeConnector =
    !(typeof window === "undefined") && window?.parent !== window;

  const connectors: CreateConnectorFn[] = additionalConnectors ?? [];

  // If we're in an iframe, include the SafeConnector
  if (shouldUseSafeConnector) {
    connectors.push(
      safe({
        allowedDomains: [/gnosis-safe.io$/, /app.safe.global$/],
      }),
    );
  }
  // Add the rest of the connectors
  connectors.push(
    baseAccount({
      appName: app.name,
      // Use the default Daimo Pay logo if the app does not provide an icon
      appLogoUrl: app.icon ?? "https://pay.daimo.com/daimo-pay-logo.svg",
    }),
  );
  connectors.push(
    gemini({
      appMetadata: {
        name: app.name,
        url: app.url,
        // Use the default Daimo Pay logo if the app does not provide an icon
        appLogoUrl: app.icon ?? "https://pay.daimo.com/daimo-pay-logo.svg",
      },
    }),
  );
  connectors.push(porto());

  return connectors;
};

export default defaultConnectors;
