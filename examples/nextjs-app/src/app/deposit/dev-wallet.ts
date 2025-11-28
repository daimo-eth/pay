import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

// The specific private key requested
const PRIVATE_KEY =
  "0x9d1e0ae6cd57d1ee31593d2090d09f8f578d031993c05b6c89eed7b9e80d6ca8";
const BASE_ICON =
  "data:image/svg+xml,%3Csvg%20width='1024'%20height='1024'%20viewBox='0%200%201024%201024'%20fill='none'%20xmlns='http://www.w3.org/2000/svg'%3E%3Crect%20width='1024'%20height='1024'%20fill='white'/%3E%3Cpath%20d='M231%20275.477C231%20260.242%20231%20252.625%20233.871%20246.766C236.619%20241.156%20241.156%20236.619%20246.766%20233.871C252.625%20231%20260.242%20231%20275.477%20231H749.523C764.758%20231%20772.375%20231%20778.234%20233.871C783.845%20236.619%20788.381%20241.156%20791.129%20246.766C794%20252.625%20794%20260.242%20794%20275.477V749.523C794%20764.758%20794%20772.375%20791.129%20778.234C788.381%20783.845%20783.845%20788.381%20778.234%20791.129C772.375%20794%20764.758%20794%20749.523%20794H275.477C260.242%20794%20252.625%20794%20246.766%20791.129C241.156%20788.381%20236.619%20783.845%20233.871%20778.234C231%20772.375%20231%20764.758%20231%20749.523V275.477Z'%20fill='%230000FF'/%3E%3C/svg%3E%0A";

export const COINBASE_PROVIDER_ID = "com.coinbase.wallet";
const COINBASE_PROVIDER_INFO = {
  rdns: COINBASE_PROVIDER_ID,
  name: "Base",
  icon: BASE_ICON,
};

export function injectDevWallet() {
  if (typeof window === "undefined") return;
  const current = (window as any).ethereum;
  if (current?.isCoinbaseWallet) {
    return;
  }

  const account = privateKeyToAccount(PRIVATE_KEY);

  // Create a client to handle signing
  const client = createWalletClient({
    account,
    chain: base,
    transport: http(),
  });

  console.log("[DevWallet] Injecting wallet for", account.address);

  // Partial implementation of EIP-1193
  const request: any = async (args: any) => {
    const { method, params } = args;
    const p = params || [];
    console.log("[DevWallet] Request:", method, p);

    try {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [account.address];

        case "eth_chainId":
          return "0x2105"; // Base (8453)

        case "net_version":
          return "8453";

        case "personal_sign":
          // params: [message, address]
          return await client.signMessage({
            message: { raw: p[0] } as any,
            account,
          });

        case "eth_signTypedData_v4":
          // params: [address, data]
          return await client.signTypedData({
            ...JSON.parse(p[1]),
            account,
          });

        case "eth_sendTransaction":
          // params: [tx]
          return await client.sendTransaction(p[0] as any);

        case "wallet_switchEthereumChain":
          // Mock success for Base
          if (p[0].chainId === "0x2105") return null;
          console.warn("[DevWallet] Requested switch to", p[0].chainId);
          return null; // Just pretend we switched

        default:
          // For read methods, we can try to pass through to public client?
          // But since wagmi config uses http transport, these shouldn't be called often for reads
          // unless the app explicitly uses window.ethereum.
          console.warn("[DevWallet] Unhandled method:", method);
          return null;
      }
    } catch (error) {
      console.error("[DevWallet] Error:", error);
      throw error;
    }
  };

  const provider = {
    rdns: COINBASE_PROVIDER_ID,
    id: COINBASE_PROVIDER_ID,
    name: COINBASE_PROVIDER_INFO.name,
    icon: COINBASE_PROVIDER_INFO.icon,
    request,
    on: () => {},
    removeListener: () => {},
    enable: () => request({ method: "eth_requestAccounts" } as any),
  };

  (window as any).ethereum = provider;
  (window as any).ethereum.providers = [provider];

  // Dispatch event to notify listeners (like wagmi injected connector)
  window.dispatchEvent(new Event("ethereum#initialized"));
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: { info: COINBASE_PROVIDER_INFO, provider },
    }),
  );
}

export function injectWalletById(walletId?: string) {
  if (!walletId || walletId === COINBASE_PROVIDER_ID) {
    injectDevWallet();
    return;
  }
  console.warn("[DevWallet] No injector implemented for", walletId);
}
