import { useEffect } from "react";
import type { Connector } from "wagmi";

export const COINBASE_PROVIDER_ID = "com.coinbase.wallet";

const BASE_ICON =
  "data:image/svg+xml,%3Csvg%20width='1024'%20height='1024'%20viewBox='0%200%201024%201024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3E%3Crect%20width='1024'%20height='1024'%20fill='white'/%3E%3Cpath%20d='M231%20275.477C231%20260.242%20231%20252.625%20233.871%20246.766C236.619%20241.156%20241.156%20236.619%20246.766%20233.871C252.625%20231%20260.242%20231%20275.477%20231H749.523C764.758%20231%20772.375%20231%20778.234%20233.871C783.845%20236.619%20788.381%20241.156%20791.129%20246.766C794%20252.625%20794%20260.242%20794%20275.477V749.523C794%20764.758%20794%20772.375%20791.129%20778.234C788.381%20783.845%20783.845%20788.381%20778.234%20791.129C772.375%20794%20764.758%20794%20749.523%20794H275.477C260.242%20794%20252.625%20794%20246.766%20791.129C241.156%20788.381%20236.619%20783.845%20233.871%20778.234C231%20772.375%20231%20764.758%20231%20749.523V275.477Z'%20fill='%230000FF'/%3E%3C/svg%3E%0A";

const PRIVY_PROVIDER_INFO = {
  rdns: "wallet.privy.injected",
  name: "Privy Wallet",
  icon: "",
};

const BASE_PROVIDER_INFO = {
  rdns: COINBASE_PROVIDER_ID,
  name: "Base",
  icon: BASE_ICON,
};

const CHAIN_ID_HEX = "0x2105";
const NET_VERSION_DEC = "8453";

let capturedBaseProvider: any = null;

function normalizeBaseProvider(provider: any) {
  if (!provider) return null;
  return {
    ...provider,
    rdns: provider.rdns ?? COINBASE_PROVIDER_ID,
    id: provider.id ?? COINBASE_PROVIDER_ID,
    name: provider.name ?? "Base",
    icon: provider.icon ?? BASE_ICON,
    isCoinbaseWallet: true,
  };
}

export async function captureBaseProvider(
  connectors: readonly Connector[],
): Promise<boolean> {
  if (capturedBaseProvider) return true;

  for (const connector of connectors) {
    if (connector.id !== COINBASE_PROVIDER_ID) continue;
    if (typeof connector.getProvider !== "function") continue;
    try {
      const provider = await connector.getProvider();
      const normalized = normalizeBaseProvider(provider);
      if (normalized) {
        capturedBaseProvider = normalized;
        return true;
      }
    } catch (error) {
      console.warn("[BaseInjector] failed to capture provider", error);
    }
  }

  if (typeof window === "undefined") return false;
  const w = window as any;
  const normalized = normalizeBaseProvider(w.ethereum);
  if (normalized) {
    capturedBaseProvider = normalized;
    return true;
  }
  return false;
}

type ProviderInfo = { rdns: string; name: string; icon: string };
type RequestArgs = { method: string; params?: any[] };

function createStubProvider(address: string, info: ProviderInfo) {
  const request = async ({ method }: RequestArgs) => {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [address];
      case "eth_chainId":
        return CHAIN_ID_HEX;
      case "net_version":
        return NET_VERSION_DEC;
      default:
        throw new Error(`[stub-wallet] unsupported method: ${method}`);
    }
  };

  return {
    rdns: info.rdns,
    id: info.rdns,
    name: info.name,
    icon: info.icon,
    request,
    on: () => {},
    removeListener: () => {},
    enable: () => request({ method: "eth_requestAccounts" }),
  };
}

function announce(info: ProviderInfo, provider: any) {
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: { info, provider },
    }),
  );
}

export function usePrivyWalletInjection() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;
    const provider: any = createStubProvider("", PRIVY_PROVIDER_INFO);
    provider.isPrivyInjected = true;

    w.ethereum = provider;
    w.ethereum.providers = [provider];

    announce(PRIVY_PROVIDER_INFO, provider);
  }, []);
}

export function useBaseWalletInjection(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!capturedBaseProvider) return;

    const provider: any = capturedBaseProvider;
    const w = window as any;
    w.ethereum = provider;
    w.ethereum.providers = [provider];

    announce(BASE_PROVIDER_INFO, provider);
  }, [enabled]);
}
