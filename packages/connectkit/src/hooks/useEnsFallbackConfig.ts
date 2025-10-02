import { type Config, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";
import { useChainIsSupported } from "../hooks/useChainIsSupported";

const ensFallbackConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http(),
  },
});

export function useEnsFallbackConfig(): Config | undefined {
  return !useChainIsSupported(1) ? ensFallbackConfig : undefined;
}
