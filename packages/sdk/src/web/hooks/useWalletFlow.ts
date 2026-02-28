import { getChainName, solana } from "../../common/chain.js";
import type { WalletPaymentOption } from "../api/walletTypes.js";
import { isNativeToken } from "../../common/token.js";
import { VersionedTransaction } from "@solana/web3.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Address, encodeFunctionData, getAddress, hexToBytes } from "viem";

import type { DaimoClient } from "../../client/createDaimoClient.js";
import { useDaimoClient } from "./DaimoClientContext.js";
import { t } from "./locale.js";
import {
  EthereumProvider,
  getEthereumProvider,
  getSolanaProvider,
} from "./walletProvider.js";

const erc20TransferAbi = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export type WalletData = {
  evmAddress: Address | null;
  solAddress: string | null;
};

type BalanceCache = {
  key: string;
  balances: WalletPaymentOption[];
  fetchedAt: number;
};

let balanceCache: BalanceCache | null = null;

function makeCacheKey(sessionId: string, wallet: WalletData): string {
  const parts: string[] = [sessionId];
  if (wallet.evmAddress) parts.push(`evm:${wallet.evmAddress}`);
  if (wallet.solAddress) parts.push(`sol:${wallet.solAddress}`);
  return parts.join("|");
}

export type WalletFlowResult = {
  hasInjectedWallet: boolean;
  wallet: WalletData | null;
  balances: WalletPaymentOption[] | null;
  isConnecting: boolean;
  isLoadingBalances: boolean;
  connectError: string | null;
  connect: () => Promise<void>;
  sendTransaction: (
    token: WalletPaymentOption,
    amountUsd: number,
  ) => Promise<{ txHash: string }>;
};

export function useWalletFlow(
  sessionId: string,
  destAddr: string,
  autoConnect: boolean,
  clientSecret?: string,
): WalletFlowResult {
  const client = useDaimoClient();

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [balances, setBalances] = useState<WalletPaymentOption[] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const currentFetchRef = useRef<string | null>(null);

  const hasInjectedWallet =
    typeof window !== "undefined" &&
    (getEthereumProvider() !== null || getSolanaProvider() !== null);

  const fetchBalances = useCallback(
    async (walletData: WalletData, showLoading: boolean) => {
      if (!walletData.evmAddress && !walletData.solAddress) return;
      if (!clientSecret) return;

      const cacheKey = makeCacheKey(sessionId, walletData);

      if (balanceCache?.key === cacheKey) {
        setBalances(balanceCache.balances);
        if (Date.now() - balanceCache.fetchedAt > 30000) {
          client.internal.sessions
            .walletOptions(sessionId, {
              clientSecret,
              evmAddress: walletData.evmAddress ?? undefined,
              solanaAddress: walletData.solAddress ?? undefined,
            })
            .then((result) => {
              if (balanceCache == null || balanceCache.key === cacheKey) {
                balanceCache = {
                  key: cacheKey,
                  balances: result,
                  fetchedAt: Date.now(),
                };
              }
              setBalances(result);
            })
            .catch((err) =>
              console.error(`balance refresh for ${cacheKey} failed:`, err),
            );
        }
        return;
      }

      if (showLoading) setIsLoadingBalances(true);

      try {
        currentFetchRef.current = cacheKey;
        const result = await client.internal.sessions.walletOptions(sessionId, {
          clientSecret,
          evmAddress: walletData.evmAddress ?? undefined,
          solanaAddress: walletData.solAddress ?? undefined,
        });
        if (balanceCache == null || balanceCache.key === cacheKey) {
          balanceCache = {
            key: cacheKey,
            balances: result,
            fetchedAt: Date.now(),
          };
        }
        if (currentFetchRef.current === cacheKey) setBalances(result);
      } catch (err) {
        console.error("failed to fetch balances:", err);
      } finally {
        if (currentFetchRef.current === cacheKey) setIsLoadingBalances(false);
      }
    },
    [sessionId, clientSecret, client],
  );

  const connect = useCallback(async () => {
    setConnectError(null);
    setIsConnecting(true);

    try {
      const evmAddress = await connectEvm();
      const solAddress = await connectSolana();

      if (!evmAddress && !solAddress) {
        setConnectError(t.walletUnavailable);
        setIsConnecting(false);
        return;
      }

      const walletData = { evmAddress, solAddress };
      setWallet(walletData);
      setIsConnecting(false);
      fetchBalances(walletData, true);
    } catch (err) {
      console.error("failed to connect wallet:", err);
      setConnectError(err instanceof Error ? err.message : t.walletUnavailable);
      setIsConnecting(false);
    }
  }, [fetchBalances]);

  const hasInitialized = useRef(false);
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const testEvmWallet = params.get("testWallet");
    const testSolWallet = params.get("testSolana");

    if (testEvmWallet || testSolWallet) {
      const evmAddress = testEvmWallet ? getAddress(testEvmWallet) : null;
      const walletData = { evmAddress, solAddress: testSolWallet };
      setWallet(walletData);
      fetchBalances(walletData, true);
      return;
    }

    if (autoConnect && hasInjectedWallet) {
      connect();
    }
  }, [autoConnect, connect, fetchBalances, hasInjectedWallet]);

  useEffect(() => {
    const ethereum = getEthereumProvider();
    if (!ethereum?.on) return;

    const handleAccountsChanged = (accounts: unknown) => {
      const accts = accounts as string[];
      if (!accts || accts.length === 0) {
        setWallet((prev) => {
          if (!prev?.solAddress) {
            setBalances(null);
            balanceCache = null;
            return null;
          }
          const updated = { evmAddress: null, solAddress: prev.solAddress };
          balanceCache = null;
          fetchBalances(updated, true);
          return updated;
        });
        return;
      }

      const newAddress = getAddress(accts[0]);
      setWallet((prev) => {
        if (prev?.evmAddress && newAddress === prev.evmAddress) return prev;
        balanceCache = null;
        const updated = {
          evmAddress: newAddress,
          solAddress: prev?.solAddress ?? null,
        };
        fetchBalances(updated, true);
        return updated;
      });
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    return () =>
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
  }, [fetchBalances]);

  useEffect(() => {
    const solanaProvider = getSolanaProvider();
    if (!solanaProvider?.on) return;

    const handleAccountChanged = (publicKey: unknown) => {
      const newSolAddress = publicKey
        ? (publicKey as { toBase58: () => string }).toBase58()
        : null;

      setWallet((prev) => {
        if (newSolAddress === prev?.solAddress) return prev;
        balanceCache = null;
        const updated = {
          evmAddress: prev?.evmAddress ?? null,
          solAddress: newSolAddress,
        };
        if (!updated.evmAddress && !updated.solAddress) {
          setBalances(null);
          return null;
        }
        fetchBalances(updated, true);
        return updated;
      });
    };

    solanaProvider.on("accountChanged", handleAccountChanged);
    return () => solanaProvider.off?.("accountChanged", handleAccountChanged);
  }, [fetchBalances]);

  const sendTransaction = useCallback(
    async (
      token: WalletPaymentOption,
      amountUsd: number,
    ): Promise<{ txHash: string }> => {
      if (!wallet) throw new Error(t.walletUnavailable);
      if (!clientSecret) throw new Error("missing client secret");

      const tokenInfo = token.balance.token;
      if (tokenInfo.chainId === solana.chainId) {
        const txHash = await sendSolanaTransaction(
          client,
          wallet,
          sessionId,
          clientSecret,
          tokenInfo.token,
          amountUsd,
        );
        return { txHash };
      }

      const txHash = await sendEvmTransaction(
        wallet,
        destAddr,
        token,
        amountUsd,
      );
      return { txHash };
    },
    [wallet, sessionId, destAddr, clientSecret, client],
  );

  return {
    hasInjectedWallet,
    wallet,
    balances,
    isConnecting,
    isLoadingBalances,
    connectError,
    connect,
    sendTransaction,
  };
}

// ─── Connection helpers ─────────────────────────────────────────────────────

async function connectEvm(): Promise<Address | null> {
  const ethereum = getEthereumProvider();
  if (!ethereum) return null;
  try {
    const accounts = (await ethereum.request({
      method: "eth_requestAccounts",
    })) as string[];
    if (!accounts?.length) return null;
    return getAddress(accounts[0]);
  } catch (err) {
    console.warn("failed to connect EVM wallet:", err);
    return null;
  }
}

async function connectSolana(): Promise<string | null> {
  const solanaProvider = getSolanaProvider();
  if (!solanaProvider) return null;
  try {
    const pk =
      solanaProvider.publicKey ?? (await solanaProvider.connect()).publicKey;
    return pk.toBase58();
  } catch (err) {
    console.warn("failed to connect Solana wallet:", err);
    return null;
  }
}

// ─── Transaction helpers ────────────────────────────────────────────────────

async function sendEvmTransaction(
  wallet: WalletData,
  destAddr: string,
  token: WalletPaymentOption,
  amountUsd: number,
): Promise<string> {
  const ethereum = getEthereumProvider() as EthereumProvider;
  if (!ethereum) throw new Error(t.walletUnavailable);
  if (!wallet.evmAddress) throw new Error(t.walletDisconnected);

  const tokenInfo = token.balance.token;
  const chainId = tokenInfo.chainId;

  const currentChainId = (await ethereum.request({
    method: "eth_chainId",
  })) as string;

  if (parseInt(currentChainId, 16) !== chainId) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch {
      throw new Error(t.switchToChain(getChainName(chainId)));
    }
  }

  const tokenBalance = BigInt(token.balance.amount);
  const balanceUsd = token.balance.usd;
  if (balanceUsd <= 0) throw new Error("balance must be positive");
  const rawTokenAmount =
    (tokenBalance * BigInt(Math.floor(amountUsd * 1e6))) /
    BigInt(Math.floor(balanceUsd * 1e6));
  const tokenAmount =
    rawTokenAmount > tokenBalance ? tokenBalance : rawTokenAmount;

  const tokenAddress = getAddress(tokenInfo.token);

  if (isNativeToken(chainId, tokenAddress)) {
    return (await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: wallet.evmAddress,
          to: destAddr,
          value: `0x${tokenAmount.toString(16)}`,
        },
      ],
    })) as string;
  }

  const data = encodeFunctionData({
    abi: erc20TransferAbi,
    functionName: "transfer",
    args: [destAddr as `0x${string}`, tokenAmount],
  });

  return (await ethereum.request({
    method: "eth_sendTransaction",
    params: [{ from: wallet.evmAddress, to: tokenAddress, data }],
  })) as string;
}

async function sendSolanaTransaction(
  client: DaimoClient,
  wallet: WalletData,
  sessionId: string,
  clientSecret: string,
  inputTokenMint: string,
  amountUsd: number,
): Promise<string> {
  const solanaWallet = getSolanaProvider();
  if (!solanaWallet) throw new Error(t.walletUnavailable);
  if (!wallet.solAddress) throw new Error(t.walletDisconnected);

  const result = await client.sessions.paymentMethods.create(sessionId, {
    clientSecret,
    paymentMethod: {
      type: "solana",
      walletAddress: wallet.solAddress,
      inputTokenMint,
      amountUsd,
    },
  });

  if (!result.solana?.serializedTx) {
    throw new Error("solana transaction not returned");
  }

  const tx = VersionedTransaction.deserialize(
    hexToBytes(result.solana.serializedTx as `0x${string}`),
  );
  const txResult = await solanaWallet.signAndSendTransaction(tx);

  await client.sessions.check(sessionId, {
    clientSecret,
    txHash: txResult.signature,
  });

  return txResult.signature;
}

/** Check if error is a user rejection/cancellation */
export function isUserRejection(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  if ("code" in err && err.code === 4001) return true;
  const message =
    "message" in err && typeof err.message === "string"
      ? err.message.toLowerCase()
      : "";
  return (
    message.includes("user rejected") ||
    message.includes("user denied") ||
    message.includes("user cancelled") ||
    message.includes("user canceled") ||
    message.includes("rejected by user")
  );
}
