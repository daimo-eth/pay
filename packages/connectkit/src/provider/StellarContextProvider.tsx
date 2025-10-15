import {
  allowAllModules,
  FREIGHTER_ID,
  type ISupportedWallet,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { Asset, Horizon } from "@stellar/stellar-sdk";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_STELLAR_RPC_URL,
  STELLAR_USDC_ASSET_CODE,
  STELLAR_USDC_ISSUER_PK,
} from "../constants/rozoConfig";
import * as LocalStorage from "../utils/localstorage";
import {
  WalletConnectAllowedMethods,
  WalletConnectModule,
} from "../utils/stellar";

type StellarContextProvider = {
  children: ReactNode;
  rpcUrl?: string;
  kit?: StellarWalletsKit; // Allow users to provide their own kit
};

type StellarContextProviderValue = {
  kit: StellarWalletsKit | undefined;
  server: Horizon.Server | undefined;
  publicKey: string | undefined;
  setPublicKey: (publicKey: string) => void;
  account: Horizon.AccountResponse | undefined;
  isAccountExists: boolean;
  isConnected: boolean;
  connector: ISupportedWallet | undefined;
  setConnector: (connector: ISupportedWallet) => void;
  disconnect: () => void;
  convertXlmToUsdc: (amount: string) => Promise<string>;
};

export type StellarWalletName = ISupportedWallet;

// LocalStorage key for Stellar wallet persistence
const STELLAR_WALLET_STORAGE_KEY = "rozo-stellar-wallet";

const initialContext = {
  kit: undefined,
  server: undefined,
  publicKey: undefined,
  setPublicKey: () => {},
  account: undefined,
  isAccountExists: false,
  isConnected: false,
  connector: undefined,
  setConnector: () => {},
  disconnect: () => {},
  convertXlmToUsdc: () => Promise.resolve(""),
};

export const StellarContext =
  createContext<StellarContextProviderValue>(initialContext);

export const StellarContextProvider = ({
  children,
  rpcUrl,
  kit: stellarKit,
}: StellarContextProvider) => {
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);
  const [accountInfo, setAccountInfo] = useState<
    Horizon.AccountResponse | undefined
  >(undefined);
  const [connector, setConnector] = useState<ISupportedWallet | undefined>(
    undefined
  );
  const [isAccountExists, setIsAccountExists] = useState(false);
  const [kit, setKit] = useState<StellarWalletsKit | undefined>(undefined);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize kit only on client side to avoid SSR issues
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Use user-provided kit if available, otherwise create our own
      if (stellarKit) {
        setKit(stellarKit);
      } else {
        const stellarKit = new StellarWalletsKit({
          network: WalletNetwork.PUBLIC,
          selectedWalletId: FREIGHTER_ID,
          // modules: allowAllModules(),
          modules: [
            ...allowAllModules(),
            new WalletConnectModule({
              url: "https://rozo.ai",
              projectId: "ab8fa47f01e6a72c58bbb76577656051",
              method: WalletConnectAllowedMethods.SIGN_AND_SUBMIT,
              description: `Visa Layer for Stablecoins`,
              name: "Rozo",
              icons: ["https://rozo.ai/rozo-logo.png"],
              network: WalletNetwork.PUBLIC,
            }),
          ],
        });
        setKit(stellarKit);
      }
    }
  }, [stellarKit]);

  // Auto-reconnect to previously connected wallet on app load
  useEffect(() => {
    if (kit && !isInitialized && typeof window !== "undefined") {
      const savedWallet = LocalStorage.get(STELLAR_WALLET_STORAGE_KEY);

      if (savedWallet && savedWallet.length > 0) {
        const lastWallet = savedWallet[0]; // Get the most recent wallet

        if (lastWallet.walletId && lastWallet.publicKey) {
          try {
            // Set the wallet in the kit
            kit.setWallet(lastWallet.walletId);

            // Update context state
            setConnector({
              id: lastWallet.walletId,
              name: lastWallet.walletName || lastWallet.walletId,
              icon: lastWallet.walletIcon || "",
            } as ISupportedWallet);
            setPublicKey(lastWallet.publicKey);
          } catch (error) {
            // If wallet is no longer available, clear the saved data
            console.warn(
              "Previously connected Stellar wallet is no longer available:",
              error
            );
            LocalStorage.clear(STELLAR_WALLET_STORAGE_KEY);
          }
        }
      }

      setIsInitialized(true);
    }
  }, [kit, isInitialized, setConnector, setPublicKey]);

  const server = useMemo(
    () => new Horizon.Server(rpcUrl ?? DEFAULT_STELLAR_RPC_URL),
    [rpcUrl]
  );

  const getAccountInfo = async (publicKey: string) => {
    try {
      const data = await server.loadAccount(publicKey);

      setAccountInfo(data);
      setIsAccountExists(true);
    } catch (error: any) {
      console.error(error);
      setIsAccountExists(false);
    }
  };

  const convertXlmToUsdc = async (amount: string) => {
    try {
      const destAsset = new Asset(
        STELLAR_USDC_ASSET_CODE,
        STELLAR_USDC_ISSUER_PK
      );
      const pathResults = await server
        .strictSendPaths(Asset.native(), amount, [destAsset])
        .call();

      if (!pathResults?.records?.length) {
        throw new Error("No exchange rate found for XLM swap");
      }

      // Apply 5% slippage tolerance
      const bestPath = pathResults.records[0];
      const estimatedDestMinAmount = (
        parseFloat(bestPath.destination_amount) * 0.94
      ).toFixed(2);

      return estimatedDestMinAmount;
    } catch (error: any) {
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      setPublicKey(undefined);
      setConnector(undefined);
      setAccountInfo(undefined);

      // Clear saved wallet from localStorage
      LocalStorage.clear(STELLAR_WALLET_STORAGE_KEY);

      if (kit) {
        await kit.disconnect();
      }
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (publicKey) {
      getAccountInfo(publicKey);
    }
  }, [publicKey]);

  const contextValue = useMemo(
    () => ({
      kit,
      publicKey,
      setPublicKey,
      server,
      account: accountInfo,
      isAccountExists: isAccountExists ?? (!!accountInfo && !!publicKey),
      isConnected: !!publicKey,
      connector,
      setConnector,
      disconnect,
      convertXlmToUsdc,
    }),
    [
      kit,
      publicKey,
      server,
      accountInfo,
      isAccountExists,
      connector,
      convertXlmToUsdc,
    ]
  );

  return (
    <StellarContext.Provider value={contextValue}>
      {children}
    </StellarContext.Provider>
  );
};

export const useStellar = () => {
  const context = useContext(StellarContext);
  if (!context) {
    throw new Error("useStellar must be used within a RozoPayProvider");
  }
  return context;
};

/**
 * Simplified hook for connecting to Stellar wallets with better DX
 * Automatically handles wallet selection and state updates
 * Branded as Rozo for the Intent Pay SDK
 */
export const useRozoConnectStellar = () => {
  const {
    kit,
    publicKey,
    account,
    isConnected,
    connector,
    disconnect,
    setConnector,
    setPublicKey,
  } = useStellar();
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    if (!kit) {
      setError("Stellar kit not initialized");
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      await kit.openModal({
        onWalletSelected: async (option: ISupportedWallet) => {
          try {
            kit.setWallet(option.id);
            const { address } = await kit.getAddress();

            // Update context state automatically
            setConnector(option);
            setPublicKey(address);

            // Save wallet connection to localStorage for persistence
            LocalStorage.add(STELLAR_WALLET_STORAGE_KEY, {
              walletId: option.id,
              walletName: option.name,
              walletIcon: option.icon,
              publicKey: address,
            });
          } catch (err: any) {
            setError(err.message || "Failed to connect wallet");
            throw err;
          }
        },
      });
    } catch (err: any) {
      setError(err.message || "Failed to open wallet modal");
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    // Connection state
    isConnected,
    isConnecting,
    publicKey,
    account,
    connector,
    error,

    // Actions
    connect,
    disconnect: async () => {
      setError(null);
      await disconnect();
    },
  };
};
