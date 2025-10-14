import { createAppKit } from "@reown/appkit";
import { defineChain } from "@reown/appkit/networks";

// Extend the ChainNamespace type to include Stellar
declare module "@reown/appkit/networks" {
  interface ChainNamespace {
    stellar: "stellar";
  }
}

// Extend the CAIP network ID types to include Stellar
declare global {
  namespace ChainNamespace {
    type Stellar = "stellar";
  }
}

// Extend AppKit types to support Stellar networks
declare module "@reown/appkit" {
  interface AppKitNetwork {
    chainNamespace?: "stellar";
    caipNetworkId?: `stellar:${"pubnet" | "testnet"}`;
  }
}

// Custom Stellar chain configuration interface
export interface StellarChainConfig {
  id: "pubnet" | "testnet";
  name: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: {
    default: {
      http: string[];
    };
  };
  blockExplorers: {
    default: {
      name: string;
      url: string;
    };
  };
  chainNamespace: "stellar";
  caipNetworkId: `stellar:${"pubnet" | "testnet"}`;
}

// Extended defineChain function for Stellar
export const defineStellarChain = (config: StellarChainConfig) => {
  // Convert readonly arrays to mutable arrays for compatibility
  const mutableConfig = {
    ...config,
    rpcUrls: {
      ...config.rpcUrls,
      default: {
        ...config.rpcUrls.default,
        http: [...config.rpcUrls.default.http],
      },
    },
  };
  return defineChain(mutableConfig as any) as any;
};

// Type guards for Stellar chains
export const isStellarChain = (chain: any): chain is StellarChainConfig => {
  return chain?.chainNamespace === "stellar";
};

// Stellar network constants
export const STELLAR_NETWORKS: Record<
  "pubnet" | "testnet",
  StellarChainConfig
> = {
  pubnet: {
    id: "pubnet",
    name: "Stellar Mainnet",
    nativeCurrency: {
      name: "Stellar Lumens",
      symbol: "XLM",
      decimals: 7,
    },
    rpcUrls: {
      default: {
        http: ["https://horizon.stellar.org"],
      },
    },
    blockExplorers: {
      default: {
        name: "Stellar Explorer",
        url: "https://stellar.expert/explorer/public",
      },
    },
    chainNamespace: "stellar",
    caipNetworkId: "stellar:pubnet",
  },
  testnet: {
    id: "testnet",
    name: "Stellar Testnet",
    nativeCurrency: {
      name: "Stellar Lumens",
      symbol: "XLM",
      decimals: 7,
    },
    rpcUrls: {
      default: {
        http: ["https://horizon-testnet.stellar.org"],
      },
    },
    blockExplorers: {
      default: {
        name: "Stellar Explorer",
        url: "https://stellar.expert/explorer/testnet",
      },
    },
    chainNamespace: "stellar",
    caipNetworkId: "stellar:testnet",
  },
};
