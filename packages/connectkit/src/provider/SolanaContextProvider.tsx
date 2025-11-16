import { WalletName } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";

export type SolanaWalletName = WalletName<string>;

const DEFAULT_SOLANA_RPC_URL =
  "https://nameless-thrilling-spring.solana-mainnet.quiknode.pro/71d5c9acbf54c7cf00584cf6fab7fc37e844415f/";

export const SolanaContextProvider = ({
  children,
  rpcUrl,
}: {
  children: React.ReactNode;
  rpcUrl?: string;
}) => {
  const endpoint = rpcUrl ?? DEFAULT_SOLANA_RPC_URL;

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
