import { type CreateConfigParameters } from "@wagmi/core";
import { CreateConnectorFn, http } from "wagmi";
import {
  arbitrum,
  base,
  bsc,
  celo,
  Chain,
  gnosis,
  linea,
  mainnet,
  optimism,
  polygon,
  scroll,
  worldchain,
} from "wagmi/chains";
import { CoinbaseWalletParameters } from "wagmi/connectors";

import defaultConnectors from "./defaultConnectors";

// TODO: Move these to a provider rather than global variable
let globalAppName: string;
let globalAppIcon: string;
export const getAppName = () => globalAppName;
export const getAppIcon = () => globalAppIcon;

type DefaultConfigProps = {
  appName: string;
  appIcon?: string;
  appDescription?: string;
  appUrl?: string;

  // Coinbase Wallet preference
  coinbaseWalletPreference?: CoinbaseWalletParameters<"4">["preference"];

  // Additional connectors to use
  additionalConnectors?: CreateConnectorFn[];
} & Partial<CreateConfigParameters>;

export const REQUIRED_CHAINS: CreateConfigParameters["chains"] = [
  arbitrum,
  base,
  bsc,
  celo,
  linea,
  gnosis,
  mainnet,
  polygon,
  optimism,
  scroll,
  worldchain,
];

/** Daimo Pay recommended config, for use with wagmi's createConfig(). */
const defaultConfig = ({
  appName = "Daimo Pay",
  appIcon,
  appDescription,
  appUrl,
  additionalConnectors,
  chains = REQUIRED_CHAINS,
  client,
  ...props
}: DefaultConfigProps): CreateConfigParameters => {
  globalAppName = appName;
  if (appIcon) globalAppIcon = appIcon;

  const paddedChains: [Chain, ...Chain[]] = [...chains];
  for (const chain of REQUIRED_CHAINS) {
    if (!paddedChains.includes(chain)) {
      paddedChains.push(chain);
    }
  }

  const paddedTransports: CreateConfigParameters["transports"] = {};
  for (const chain of paddedChains) {
    if (!props?.transports?.[chain.id]) {
      // Auto inject http transport if not provided for a chain
      paddedTransports[chain.id] = http();
    } else {
      paddedTransports[chain.id] = props.transports[chain.id];
    }
  }

  const connectors: CreateConfigParameters["connectors"] =
    props?.connectors ??
    defaultConnectors({
      app: {
        name: appName,
        icon: appIcon,
        description: appDescription,
        url: appUrl,
      },
      additionalConnectors,
    });

  const config: CreateConfigParameters<any, any> = {
    ...props,
    chains: paddedChains,
    transports: paddedTransports,
    connectors,
  };

  return config;
};

export default defaultConfig;
