export type Chain = {
  type: "evm" | "solana" | "tron";
  chainId: number;
  name: string;
  cctpDomain: number | null;
  lzEid: number | null;
};

export const arbitrum: Chain = {
  type: "evm",
  chainId: 42161,
  name: "Arbitrum",
  cctpDomain: 3,
  lzEid: 30110,
};

export const base: Chain = {
  type: "evm",
  chainId: 8453,
  name: "Base",
  cctpDomain: 6,
  lzEid: 30184,
};

export const bsc: Chain = {
  type: "evm",
  chainId: 56,
  name: "BNB Smart Chain",
  cctpDomain: null,
  lzEid: 30102,
};

export const celo: Chain = {
  type: "evm",
  chainId: 42220,
  name: "Celo",
  cctpDomain: null,
  lzEid: 30125,
};

export const ethereum: Chain = {
  type: "evm",
  chainId: 1,
  name: "Ethereum",
  cctpDomain: 0,
  lzEid: 30101,
};

export const gnosis: Chain = {
  type: "evm",
  chainId: 100,
  name: "Gnosis",
  cctpDomain: null,
  lzEid: 30145,
};

export const hyperEvm: Chain = {
  type: "evm",
  chainId: 999,
  name: "HyperEVM",
  cctpDomain: 19,
  lzEid: 30367,
};

export const linea: Chain = {
  type: "evm",
  chainId: 59144,
  name: "Linea",
  cctpDomain: 11,
  lzEid: 30183,
};

export const monad: Chain = {
  type: "evm",
  chainId: 143,
  name: "Monad",
  cctpDomain: 15,
  lzEid: 30390,
};

export const optimism: Chain = {
  type: "evm",
  chainId: 10,
  name: "Optimism",
  cctpDomain: 2,
  lzEid: 30111,
};

export const polygon: Chain = {
  type: "evm",
  chainId: 137,
  name: "Polygon",
  cctpDomain: 7,
  lzEid: 30109,
};

export const scroll: Chain = {
  type: "evm",
  chainId: 534352,
  name: "Scroll",
  cctpDomain: null,
  lzEid: 30214,
};

export const worldchain: Chain = {
  type: "evm",
  chainId: 480,
  name: "Worldchain",
  cctpDomain: 14,
  lzEid: 30319,
};

//
// Non-EVM chains: source only
//

export const tron: Chain = {
  type: "tron",
  chainId: 728126428,
  name: "Tron",
  cctpDomain: null,
  lzEid: 30420,
};

export const solana: Chain = {
  type: "solana",
  chainId: 501,
  name: "Solana",
  cctpDomain: 5,
  lzEid: 30168,
};

export const supportedChains: Chain[] = [
  arbitrum,
  base,
  bsc,
  celo,
  ethereum,
  gnosis,
  hyperEvm,
  linea,
  monad,
  optimism,
  polygon,
  scroll,
  worldchain,
  solana,
  tron,
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

/** Returns the CCTP domain for the given chainId. */
export function getCCTPDomain(chainId: number): number | null {
  return getChainById(chainId).cctpDomain;
}

/** Returns the LayerZero endpoint ID for the given chainId. */
export function getLZEid(chainId: number): number | null {
  return getChainById(chainId).lzEid;
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
    case bsc.chainId:
      return "https://bscscan.com";
    case celo.chainId:
      return "https://celoscan.io";
    case ethereum.chainId:
      return "https://etherscan.io";
    case gnosis.chainId:
      return "https://gnosisscan.io";
    case hyperEvm.chainId:
      return "https://hyperevmscan.io";
    case linea.chainId:
      return "https://lineascan.build";
    case monad.chainId:
      return "https://monadvision.com";
    case optimism.chainId:
      return "https://optimistic.etherscan.io";
    case polygon.chainId:
      return "https://polygonscan.com";
    case scroll.chainId:
      return "https://scrollscan.com";
    case solana.chainId:
      return "https://solscan.io";
    case tron.chainId:
      return "https://tronscan.org";
    case worldchain.chainId:
      return "https://worldscan.org";
    default:
      return undefined;
  }
}

/**
 * Get block explorer address URL for chain ID and address.
 */
export function getChainExplorerAddressUrl(
  chainId: number,
  address: string,
): string | undefined {
  const explorer = getChainExplorerByChainId(chainId);
  if (!explorer) {
    return undefined;
  }
  // Tron uses hash-based routing
  if (chainId === tron.chainId) {
    return `${explorer}/#/address/${address}`;
  }
  return `${explorer}/address/${address}`;
}

/**
 * Get block explorer transaction URL for chain ID and transaction hash.
 */
export function getChainExplorerTxUrl(
  chainId: number,
  txHash: string,
): string | undefined {
  const explorer = getChainExplorerByChainId(chainId);
  if (!explorer) {
    return undefined;
  }
  // Tron uses hash-based routing with "transaction" instead of "tx"
  if (chainId === tron.chainId) {
    return `${explorer}/#/transaction/${txHash.replace("0x", "")}`;
  }
  return `${explorer}/tx/${txHash}`;
}
