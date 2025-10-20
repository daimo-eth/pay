import type {
  ISupportedWallet,
  StellarWalletsKit,
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
import { getStellarKitInstance } from "../utils/stellar/singleton-import";

type StellarContextProvider = {
  children: ReactNode;
  rpcUrl?: string;
  kit?: StellarWalletsKit; // OPTIONAL - if provided, uses this; otherwise creates singleton
};

type StellarContextProviderValue = {
  kit: StellarWalletsKit | undefined;
  server: Horizon.Server;
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

const STELLAR_WALLET_STORAGE_KEY = "rozo-stellar-wallet";

const initialContext = {
  kit: undefined,
  server: undefined as any,
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
  kit: externalKit,
}: StellarContextProvider) => {
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);
  const [accountInfo, setAccountInfo] = useState<
    Horizon.AccountResponse | undefined
  >(undefined);
  const [connector, setConnector] = useState<ISupportedWallet | undefined>(
    undefined
  );
  const [isAccountExists, setIsAccountExists] = useState(false);
  const [internalKit, setInternalKit] = useState<StellarWalletsKit | undefined>(
    undefined
  );
  const [kitError, setKitError] = useState<string | undefined>(undefined);

  const kit = externalKit || internalKit;

  // Initialize kit using singleton pattern
  useEffect(() => {
    // Skip if external kit provided or already initialized
    if (externalKit || internalKit) {
      return;
    }

    // Skip on server-side
    if (typeof window === "undefined") {
      return;
    }

    let mounted = true;

    getStellarKitInstance()
      .then((kitInstance) => {
        if (mounted) {
          setInternalKit(kitInstance);
        }
      })
      .catch((error) => {
        console.error("[Rozo] Failed to initialize Stellar kit:", error);
        if (mounted) {
          setKitError(error.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, [externalKit, internalKit]);

  // Show error if kit initialization failed
  useEffect(() => {
    if (kitError) {
      console.error(
        "❌ Stellar kit initialization failed:\n" +
          kitError +
          "\n\n" +
          "To fix this, provide your own kit instance:\n\n" +
          'import { StellarWalletsKit, WalletNetwork, allowAllModules } from "@creit.tech/stellar-wallets-kit";\n\n' +
          "const kit = new StellarWalletsKit({\n" +
          "  network: WalletNetwork.PUBLIC,\n" +
          "  modules: allowAllModules(),\n" +
          "});\n\n" +
          "<RozoPayProvider stellarKit={kit}>{children}</RozoPayProvider>"
      );
    }
  }, [kitError]);

  // Auto-reconnect to previously connected wallet
  useEffect(() => {
    if (kit && typeof window !== "undefined") {
      const savedWallet = LocalStorage.get(STELLAR_WALLET_STORAGE_KEY);

      if (savedWallet && savedWallet.length > 0) {
        const lastWallet = savedWallet[0];

        if (lastWallet.walletId && lastWallet.publicKey) {
          try {
            kit.setWallet(lastWallet.walletId);

            setConnector({
              id: lastWallet.walletId,
              name: lastWallet.walletName || lastWallet.walletId,
              icon: lastWallet.walletIcon || "",
            } as ISupportedWallet);
            setPublicKey(lastWallet.publicKey);
          } catch (error) {
            console.warn(
              "Previously connected Stellar wallet is no longer available:",
              error
            );
            LocalStorage.clear(STELLAR_WALLET_STORAGE_KEY);
          }
        }
      }
    }
  }, [kit]);

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
    throw new Error("useStellar must be used within a StellarContextProvider");
  }
  return context;
};

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
      setError("Stellar kit not initialized yet. Please wait...");
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

            setConnector(option);
            setPublicKey(address);

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
    isConnected,
    isConnecting,
    publicKey,
    account,
    connector,
    error,
    connect,
    disconnect: async () => {
      setError(null);
      await disconnect();
    },
  };
};

export type {
  ISupportedWallet,
  StellarWalletsKit,
} from "@creit.tech/stellar-wallets-kit";
