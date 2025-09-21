"use client";

import { getDefaultConfig, RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { ROZOPAY_API_URL } from "../shared";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Rozo Pay Basic Demo",
  })
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
