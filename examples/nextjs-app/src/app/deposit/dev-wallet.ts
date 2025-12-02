import { useEffect } from "react";

const PRIVY_PROVIDER_INFO = {
  rdns: "wallet.privy.injected",
  uuid: "privy-injected-wallet",
  name: "Privy Wallet",
  icon: "",
};

const CHAIN_ID_HEX = "0x2105";
const NET_VERSION_DEC = "8453";

type RequestArgs = { method: string; params?: unknown[] };

function createPrivyStubProvider() {
  const request = async ({ method }: RequestArgs) => {
    switch (method) {
      case "eth_requestAccounts":
      case "eth_accounts":
        return [];
      case "eth_chainId":
        return CHAIN_ID_HEX;
      case "net_version":
        return NET_VERSION_DEC;
      default:
        throw new Error(`[privy-stub] unsupported method: ${method}`);
    }
  };

  return {
    rdns: PRIVY_PROVIDER_INFO.rdns,
    id: PRIVY_PROVIDER_INFO.rdns,
    name: PRIVY_PROVIDER_INFO.name,
    icon: PRIVY_PROVIDER_INFO.icon,
    isPrivyInjected: true,
    request,
    on: () => {},
    removeListener: () => {},
    enable: () => request({ method: "eth_requestAccounts" }),
  };
}

function announceProvider(
  info: { rdns: string; uuid: string; name: string; icon: string },
  provider: unknown,
) {
  window.dispatchEvent(
    new CustomEvent("eip6963:announceProvider", {
      detail: { info, provider },
    }),
  );
}

export function usePrivyWalletInjection() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const provider = createPrivyStubProvider();

    // Announce via EIP-6963 without overriding window.ethereum
    announceProvider(PRIVY_PROVIDER_INFO, provider);

    // Re-announce on request (EIP-6963 discovery protocol)
    const handleRequest = () => {
      announceProvider(PRIVY_PROVIDER_INFO, provider);
    };
    window.addEventListener("eip6963:requestProvider", handleRequest);

    return () => {
      window.removeEventListener("eip6963:requestProvider", handleRequest);
    };
  }, []);
}
