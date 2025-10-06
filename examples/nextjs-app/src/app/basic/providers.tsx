"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { ROZOPAY_API_URL } from "../shared";

import { getDefaultConfig as getDefaultConfigRozo } from "@rozoai/intent-pay";

export const rozoPayConfig = createConfig(
  getDefaultConfigRozo({
    appName: "Rozo Pay Basic Demo",
  })
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={rozoPayConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider payApiUrl={ROZOPAY_API_URL} debugMode={true}>
          {/* <RainbowKitProvider
            showRecentTransactions={false}
            modalSize="compact"
          > */}
          {props.children}
          {/* </RainbowKitProvider> */}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
