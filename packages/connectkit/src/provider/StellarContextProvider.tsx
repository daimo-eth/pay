import {
  ALBEDO_ID,
  AlbedoModule,
  FreighterModule,
  type ISupportedWallet,
  LobstrModule,
  StellarWalletsKit,
  WalletNetwork,
} from "@creit.tech/stellar-wallets-kit";
import { Asset, Horizon } from "@stellar/stellar-sdk";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import {
  DEFAULT_STELLAR_RPC_URL,
  STELLAR_USDC_ASSET_CODE,
  STELLAR_USDC_ISSUER_PK,
} from "../constants/rozoConfig";

type StellarContextProvider = { children: ReactNode; stellarRpcUrl?: string };

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
  stellarRpcUrl,
}: StellarContextProvider) => {
  const [publicKey, setPublicKey] = useState<string | undefined>(undefined);
  const [accountInfo, setAccountInfo] = useState<
    Horizon.AccountResponse | undefined
  >(undefined);
  const [connector, setConnector] = useState<ISupportedWallet | undefined>(
    undefined
  );
  const [isAccountExists, setIsAccountExists] = useState(false);

  const kit = new StellarWalletsKit({
    network: WalletNetwork.PUBLIC,
    selectedWalletId: ALBEDO_ID,
    // modules: allowAllModules(),
    modules: [new AlbedoModule(), new LobstrModule(), new FreighterModule()],
  });

  const server = new Horizon.Server(stellarRpcUrl ?? DEFAULT_STELLAR_RPC_URL);

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
      await kit.disconnect();
    } catch (error: any) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (publicKey) {
      getAccountInfo(publicKey);
    }
  }, [publicKey]);

  return (
    <StellarContext.Provider
      value={{
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
      }}
    >
      {children}
    </StellarContext.Provider>
  );
};

export const useStellar = () => useContext(StellarContext);
