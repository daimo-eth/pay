"use client";

import { StellarWalletsKit } from "@creit.tech/stellar-wallets-kit";
import {
  getDefaultConfig as getDefaultConfigRozo,
  RozoPayProvider,
} from "@rozoai/intent-pay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { createConfig, WagmiProvider } from "wagmi";
import { ROZOPAY_API_URL } from "../shared";

export const rozoPayConfig = createConfig(
  getDefaultConfigRozo({
    appName: "Rozo Pay Basic Demo",
  })
);

const queryClient = new QueryClient();

export function Providers(props: { children: ReactNode }) {
  const [kit, setKit] = useState<StellarWalletsKit | undefined>(undefined);

  // useEffect(() => {
  //   if (typeof window !== "undefined") {
  //     setKit(
  //       new StellarWalletsKit({
  //         network: WalletNetwork.PUBLIC,
  //         selectedWalletId: FREIGHTER_ID,
  //         modules: allowAllModules(),
  //       })
  //     );
  //   }
  // }, []);

  // if (!kit) {
  //   return <div>Loading...</div>;
  // }

  return (
    <WagmiProvider config={rozoPayConfig}>
      <QueryClientProvider client={queryClient}>
        <RozoPayProvider
          payApiUrl={ROZOPAY_API_URL}
          debugMode={true}
          // stellarKit={kit}
        >
          {props.children}
        </RozoPayProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
