"use client";

import { DaimoPayProvider, getDefaultConfig } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { DAIMOPAY_API_URL } from "../shared";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Daimo Pay Contract Demo",
    walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  }),
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <DaimoPayProvider payApiUrl={DAIMOPAY_API_URL} debugMode>
          {props.children}
        </DaimoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
