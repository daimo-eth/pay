"use client";

import { DaimoPayProvider, getDefaultConfig } from "@daimo/pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { DAIMOPAY_API_URL } from "../shared";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Daimo Pay Basic Demo",
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
