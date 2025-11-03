"use client";

import {
  getDefaultConfig as getDefaultConfigRozo,
  RozoPayProvider,
} from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { farcasterConnector } from "./farcaster-connector";

export const rozoPayConfig = createConfig(
  getDefaultConfigRozo({
    appName: "Rozo Pay Farcaster Frame Demo",
    additionalConnectors: [farcasterConnector()],
  })
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={rozoPayConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider>{props.children}</RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
