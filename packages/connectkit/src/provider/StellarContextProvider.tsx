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
  stellarWalletPersistence?: boolean;
};

type StellarContextProviderValue = {
  kit: StellarWalletsKit | undefined;
  stellarWalletPersistence: boolean;
  server: Horizon.Server;
  publicKey: string | undefined;
  setPublicKey: (publicKey: string) => void;
  account: Horizon.AccountResponse | undefined;
  isAccountExists: boolean;
  isConnected: boolean;
  connector: ISupportedWallet | undefined;
  setConnector: (connector: ISupportedWallet) => void;
  setWallet: (option: ISupportedWallet) => Promise<void>;
  disconnect: () => Promise<void>;
  convertXlmToUsdc: (amount: string) => Promise<string>;
};

export type StellarWalletName = ISupportedWallet;

const STELLAR_WALLET_STORAGE_KEY = "rozo-stellar-wallet";

const initialContext: StellarContextProviderValue = {
  kit: undefined,
  stellarWalletPersistence: true,
  server: undefined as any,
  publicKey: undefined,
  setPublicKey: () => {},
  account: undefined,
  isAccountExists: false,
  isConnected: false,
  connector: undefined,
  setConnector: () => {},
  setWallet: () => Promise.resolve(),
  disconnect: () => Promise.resolve(),
  convertXlmToUsdc: () => Promise.resolve(""),
};

export const StellarContext =
  createContext<StellarContextProviderValue>(initialContext);

export const StellarContextProvider = ({
  children,
  rpcUrl,
  kit: externalKit,
  stellarWalletPersistence: _stellarWalletPersistence,
}: StellarContextProvider) => {
  // Set persistence: default true
  const stellarWalletPersistence =
    _stellarWalletPersistence !== undefined ? _stellarWalletPersistence : true;

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

  const isUsingExternalKit = useMemo(() => {
    return !!externalKit;
  }, [externalKit]);

  const server = useMemo(() => {
    const s = new Horizon.Server(rpcUrl ?? DEFAULT_STELLAR_RPC_URL);
    return s;
  }, [rpcUrl]);

  // Debug: on kit (external/internal) assign/change
  useEffect(() => {}, [externalKit, internalKit]);

  const getAccountInfo = async (publicKey: string) => {
    try {
      const data = await server.loadAccount(publicKey);
      setAccountInfo(data);
      setIsAccountExists(true);
    } catch (error: any) {
      console.error("[Rozo] getAccountInfo error", error);
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
      console.error("[Rozo] convertXlmToUsdc error", error);
      throw error;
    }
  };

  const disconnect = async () => {
    try {
      setPublicKey(undefined);
      setConnector(undefined);
      setAccountInfo(undefined);
      if (stellarWalletPersistence) {
        LocalStorage.clear(STELLAR_WALLET_STORAGE_KEY);
      }
      if (kit) {
        if (!isUsingExternalKit) {
          await kit.disconnect();
        }
      }
    } catch (error: any) {
      console.error("[Rozo] disconnect error", error);
    }
  };

  const setWallet = async (option: ISupportedWallet) => {
    if (!kit) {
      throw new Error("Stellar kit not initialized yet. Please wait...");
    }

    if (!option) return;

    try {
      let pk = publicKey;
      if (!isUsingExternalKit) {
        kit.setWallet(option.id);
        const { address } = await kit.getAddress();
        pk = address;
        setPublicKey(address);
      }

      setConnector(option);

      if (stellarWalletPersistence) {
        LocalStorage.add(STELLAR_WALLET_STORAGE_KEY, {
          walletId: option.id,
          walletName: option.name,
          walletIcon: option.icon,
          publicKey: pk,
        });
      }
    } catch (err: any) {
      console.error("[Rozo] setWallet error", err);
      throw new Error(err.message || "Failed to set wallet");
    }
  };

  // Initialize kit using singleton pattern
  useEffect(() => {
    // Skip on server-side
    if (typeof window === "undefined") {
      return;
    }

    // Skip if external kit provided or already initialized
    if (isUsingExternalKit) {
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
        console.error(
          "[Rozo] Failed to initialize Stellar kit (singleton):",
          error
        );
        if (mounted) {
          setKitError(error.message);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

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

  // Auto-reconnect to previously connected wallet - only if persistence is true
  useEffect(() => {
    if (kit && typeof window !== "undefined" && stellarWalletPersistence) {
      const savedWallet = LocalStorage.get(STELLAR_WALLET_STORAGE_KEY);
      if (savedWallet && savedWallet.length > 0) {
        const lastWallet = savedWallet[0];
        if (lastWallet.walletId && lastWallet.publicKey) {
          try {
            setWallet({
              id: lastWallet.walletId,
              name: lastWallet.walletName,
              icon: lastWallet.walletIcon,
              ...lastWallet,
            });
          } catch (error: any) {
            console.error("[Rozo] Auto-reconnect failed:", error);
            disconnect();
          }
        }
      }
    }
  }, [kit, stellarWalletPersistence]);

  useEffect(() => {
    if (publicKey) {
      getAccountInfo(publicKey);
    }
  }, [publicKey]);

  const contextValue = useMemo(() => {
    const context: StellarContextProviderValue = {
      kit,
      stellarWalletPersistence,
      publicKey,
      setPublicKey,
      server,
      account: accountInfo,
      isAccountExists: isAccountExists ?? (!!accountInfo && !!publicKey),
      isConnected: !!publicKey,
      connector,
      setConnector,
      setWallet,
      disconnect,
      convertXlmToUsdc,
    };
    return context;
  }, [
    kit,
    stellarWalletPersistence,
    publicKey,
    server,
    accountInfo,
    isAccountExists,
    connector,
    convertXlmToUsdc,
  ]);

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
    setPublicKey,
    setWallet: setConnector,
  } = useStellar();

  return {
    kit,
    isConnected,
    publicKey,
    account,
    connector,
    setPublicKey,
    setConnector,
    disconnect,
  };
};

export type {
  ISupportedWallet,
  StellarWalletsKit,
} from "@creit.tech/stellar-wallets-kit";
