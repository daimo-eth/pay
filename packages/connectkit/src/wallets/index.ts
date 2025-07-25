import { injected } from "@wagmi/connectors";
import { CreateConnectorFn } from "wagmi";

import { walletConfigs } from "./walletConfigs";

/** Ethereum wallets, by name. */
export const wallets: {
  [key: string]: CreateConnectorFn;
} = Object.keys(walletConfigs).reduce((acc, key) => {
  const config = walletConfigs[key];
  const target = key.split(",")[0].trim();
  const flag =
    config.name?.replace("Wallet", "").replace(" ", "") ??
    target[0].toUpperCase() + target.slice(1);

  const connector = injected({
    target: {
      id: target,
      name: config.name ?? config.shortName ?? key,
      provider: (w) => w?.ethereum?.[`is${flag}`],
    },
  });
  const name = (config.name ?? config.shortName ?? key)
    .toLowerCase()
    // capitalize first letter
    .replace(/(?:^|\s)\S/g, (a) => a.toUpperCase())
    // remove spaces
    .replace(/\s/g, "")
    // lowercase first letter
    .replace(/(?:^|\s)\S/g, (a) => a.toLowerCase());

  acc[name] = connector;
  return acc;
}, {});
