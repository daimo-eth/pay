"use client";

import {
  allowAllModules,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import {
  getDefaultConfig as getDefaultConfigRozo,
  RozoPayProvider,
} from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { ROZOPAY_API_URL } from "../shared";

export const rozoPayConfig = createConfig(
  getDefaultConfigRozo({
    appName: "Rozo Pay Basic Demo",
  })
);

const queryClient = new QueryClient();

export const stellarKit = new StellarWalletsKit({
  network: WalletNetwork.PUBLIC,
  selectedWalletId: "freighter",
  modules: allowAllModules(),
});

export function Providers(props: { children: ReactNode }) {
  return (
    <WagmiProvider config={rozoPayConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider
          payApiUrl={ROZOPAY_API_URL}
          debugMode={true}
          stellarKit={stellarKit}
          mode="auto"
        >
          {props.children}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
