import { assertNotNull } from "@daimo/pay-common";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, fallback, http } from "@wagmi/core";
import { createRoot } from "react-dom/client";
import { WagmiProvider } from "wagmi";
import {
  arbitrum,
  base,
  celo,
  optimism,
  polygon,
  worldchain,
} from "wagmi/chains";
import { App } from "./App";
import { viemChains } from "./constants";

function getTransport(alchemyNetwork: string) {
  const alchemyKey = "kK-9qBIYLR3WvhAzWvUhZ";
  if (!alchemyKey) return http();
  const alchemyRpcUrl = `https://${alchemyNetwork}.g.alchemy.com/v2/${alchemyKey}`;
  return fallback([http(alchemyRpcUrl), http()]);
}

export const config = createConfig({
  chains: viemChains,
  transports: {
    [arbitrum.id]: getTransport("arb-mainnet"),
    [base.id]: getTransport("base-mainnet"),
    [celo.id]: getTransport("celo-mainnet"),
    [optimism.id]: getTransport("opt-mainnet"),
    [polygon.id]: getTransport("polygon-mainnet"),
    [worldchain.id]: getTransport("worldchain-mainnet"),
  },
});

const queryClient = new QueryClient();

function Root() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

const container = assertNotNull(document.querySelector("#app"));
const root = createRoot(container);
root.render(<Root />);
