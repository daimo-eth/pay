"use client";

import { DaimoPayProvider, getDefaultConfig } from "@daimo/pay";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { baseAccount } from "@wagmi/connectors";
import { type ReactNode, useEffect } from "react";
import { createConfig } from "wagmi";
import { DAIMOPAY_API_URL } from "../shared";
import { injectDevWallet } from "./dev-wallet";
import { ErudaProvider } from "./eruda-index";

// Inject the dev wallet before config creation if possible,
// ensuring window.ethereum is populated for connectors to find.
if (typeof window !== "undefined") {
  injectDevWallet();
}

export const wagmiConfig = createConfig(
  getDefaultConfig({
    appName: "Daimo Pay Deposit Demo",
    additionalConnectors: [baseAccount()],
  }),
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  // Ensure injection runs on mount too, just in case
  useEffect(() => {
    injectDevWallet();
    if (typeof window !== "undefined") {
      (window as any).ethereum
        ?.request({ method: "eth_accounts" })
        .then((accounts: string[]) => {
          console.log("[DevWallet] Injected accounts:", accounts);
        })
        .catch(console.error);
    }
  }, []);

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
