"use client";

import { connectorsForWallets } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import {
  coinbaseWallet,
  metaMaskWallet,
  phantomWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { RozoPayProvider } from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { ROZOPAY_API_URL } from "../shared";

import { getDefaultConfig as getDefaultConfigRozo } from "@rozoai/intent-pay";

const connectors = connectorsForWallets(
  [
    {
      groupName: "Recommended",
      wallets: [phantomWallet, coinbaseWallet, metaMaskWallet],
    },
  ],
  {
    appName: "Banana DApp",
    projectId: "ab8fa47f01e6a72c58bbb76577656051",
  }
);

export const rozoPayConfig = createConfig(
  getDefaultConfigRozo({
    appName: "Banana DApp",
    appIcon: "https://avatars.githubusercontent.com/u/37784886",
    appUrl:
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    // connectors: [...connectors, injected()],
  })
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={rozoPayConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider payApiUrl={ROZOPAY_API_URL} debugMode>
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
