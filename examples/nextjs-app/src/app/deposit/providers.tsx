"use client";

import { DaimoPayProvider, getDefaultConfig } from "@daimo/pay";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseAccount } from "@wagmi/connectors";
import { type ReactNode } from "react";
import { createConfig } from "wagmi";
import { DAIMOPAY_API_URL } from "../shared";
import { usePrivyWalletInjection } from "./dev-wallet";
import { ErudaProvider } from "./eruda-index";

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Daimo Pay Deposit Demo",
    additionalConnectors: [baseAccount()],
  }),
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  usePrivyWalletInjection();

  return (
    <ErudaProvider>
      <PrivyProvider
        appId={
          process.env.NEXT_PUBLIC_PRIVY_APP_ID || "cmihennbc0mevla0dw3dqnms6"
        }
      >
        <QueryClientProvider client={queryClient}>
          <WagmiProvider config={wagmiConfig}>
            <DaimoPayProvider payApiUrl={DAIMOPAY_API_URL} debugMode>
              {props.children}
            </DaimoPayProvider>
          </WagmiProvider>
        </QueryClientProvider>
      </PrivyProvider>
    </ErudaProvider>
  );
}
