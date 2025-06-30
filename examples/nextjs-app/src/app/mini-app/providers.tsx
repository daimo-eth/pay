"use client";

import { RozoPayProvider, getDefaultConfig } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { ROZOPAY_API_URL } from "../shared";
import { farcasterConnector } from "./farcaster-connector";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Rozo Pay Farcaster Frame Demo",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
    // Add the Farcaster connector for the Rozo Pay button to detect
    // the Farcaster wallet.
    additionalConnectors: [farcasterConnector()],
  }),
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider payApiUrl={ROZOPAY_API_URL} debugMode>
          {props.children}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
