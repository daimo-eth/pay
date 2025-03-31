export type Chain = {
  type: "evm" | "solana";
  chainId: number;
  name: string;
  cctpDomain: number | null;
};

export const arbitrum: Chain = {
  type: "evm",
  chainId: 42161,
  name: "Arbitrum",
  cctpDomain: 3,
};

export const base: Chain = {
  type: "evm",
  chainId: 8453,
  name: "Base",
  cctpDomain: 6,
};

export const blast: Chain = {
  type: "evm",
  chainId: 81457,
  name: "Blast",
  cctpDomain: null,
};

export const bsc: Chain = {
  type: "evm",
  chainId: 56,
  name: "BNB Smart Chain",
  cctpDomain: null,
};

export const ethereum: Chain = {
  type: "evm",
  chainId: 1,
  name: "Ethereum",
  cctpDomain: 0,
};

export const linea: Chain = {
  type: "evm",
  chainId: 59144,
  name: "Linea",
  cctpDomain: null,
};

export const mantle: Chain = {
  type: "evm",
  chainId: 5000,
  name: "Mantle",
  cctpDomain: null,
};

export const optimism: Chain = {
  type: "evm",
  chainId: 10,
  name: "Optimism",
  cctpDomain: 2,
};

export const polygon: Chain = {
  type: "evm",
  chainId: 137,
  name: "Polygon",
  cctpDomain: 7,
};

export const solana: Chain = {
  type: "solana",
  chainId: 501,
  name: "Solana",
  cctpDomain: 5,
};

export const worldchain: Chain = {
  type: "evm",
  chainId: 480,
  name: "Worldchain",
  cctpDomain: null,
};

export const supportedChains: Chain[] = [
  arbitrum,
  base,
  blast,
  bsc,
  ethereum,
  linea,
  mantle,
  optimism,
  polygon,
  solana,
  worldchain,
];

/** Given a chainId, return the chain. */
export function getChainById(chainId: number): Chain {
  const ret = supportedChains.find((c) => c.chainId === chainId);
  if (ret == null) throw new Error(`Unknown chainId ${chainId}`);
  return ret;
}

/** Returns the chain name for the given chainId. */
export function getChainName(chainId: number): string {
  return getChainById(chainId).name;
}

/**
 * Get block explorer URL for chain ID
 */
export function getChainExplorerByChainId(chainId: number): string | undefined {
  switch (chainId) {
    case arbitrum.chainId:
      return "https://arbiscan.io";
    case base.chainId:
      return "https://basescan.org";
    case blast.chainId:
      return "https://blastscan.io";
    case bsc.chainId:
      return "https://bscscan.com";
    case ethereum.chainId:
      return "https://etherscan.io";
    case linea.chainId:
      return "https://lineascan.build";
    case mantle.chainId:
      return "https://mantlescan.xyz";
    case optimism.chainId:
      return "https://optimistic.etherscan.io";
    case polygon.chainId:
      return "https://polygonscan.com";
    case solana.chainId:
      return "https://solscan.io";
    case worldchain.chainId:
      return "https://worldscan.org";
    default:
      return undefined;
  }
}

/**
 * Get block explorer address URL for chain ID and address.
 */
export function getChainExplorerAddressUrl(chainId: number, address: string) {
  const explorer = getChainExplorerByChainId(chainId);
  if (!explorer) {
    return undefined;
  }
  return `${explorer}/address/${address}`;
}

/**
 * Get block explorer transaction URL for chain ID and transaction hash.
 */
export function getChainExplorerTxUrl(chainId: number, txHash: string) {
  const explorer = getChainExplorerByChainId(chainId);
  if (!explorer) {
    return undefined;
  }
  return `${explorer}/tx/${txHash}`;
}
