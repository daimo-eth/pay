import { type CreateConfigParameters } from "@wagmi/core";
import { CreateConnectorFn, http } from "wagmi";
import {
  arbitrum,
  base,
  baseSepolia,
  bsc,
  celo,
  Chain,
  linea,
  mainnet,
  mantle,
  optimism,
  polygon,
  sepolia,
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

  /**
   * WC 2.0 Project ID (get one here: https://cloud.walletconnect.com/sign-in),
   * it doesn't do much besides tracking. If not provided, use Daimo's
   * WalletConnect project ID by default. */
  walletConnectProjectId?: string;

  // Coinbase Wallet preference
  coinbaseWalletPreference?: CoinbaseWalletParameters<"4">["preference"];

  // Additional connectors to use
  additionalConnectors?: CreateConnectorFn[];
} & Partial<CreateConfigParameters>;

export const REQUIRED_CHAINS: CreateConfigParameters["chains"] = [
  mainnet,
  base,
  polygon,
  optimism,
  arbitrum,
  linea,
  bsc,
  sepolia,
  baseSepolia,
  worldchain,
  mantle,
  celo,
];

/** Daimo Pay recommended config, for use with wagmi's createConfig(). */
const defaultConfig = ({
  appName = "Daimo Pay",
  appIcon,
  appDescription,
  appUrl,
  walletConnectProjectId,
  coinbaseWalletPreference,
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
      walletConnectProjectId:
        walletConnectProjectId ?? "5001414df825adbd5778f52cacea9e49",
      coinbaseWalletPreference,
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
