import { getAddress, zeroAddress } from "viem";

export type Token = {
  chainId: number;
  token: string;
  name?: string;
  symbol: string;
  decimals: number;
  logoURI?: string;
};

export enum TokenLogo {
  ETH = "https://pay.daimo.com/chain-logos/ethereum.png",
  USDC = "https://assets.coingecko.com/coins/images/6319/large/usdc.png",
  EURC = "https://assets.coingecko.com/coins/images/26045/large/euro.png",
  USDT = "https://pay.daimo.com/coin-logos/usdt.png",
  DAI = "https://pay.daimo.com/coin-logos/dai.png",
  POL = "https://assets.coingecko.com/coins/images/4713/large/polygon.png",
  AVAX = "https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_RedWhite_Trans.png",
  BNB = "https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",
  SOL = "https://solana.com/src/img/branding/solanaLogoMark.png",
  WLD = "https://assets.coingecko.com/coins/images/31069/large/worldcoin.jpeg",
  USDB = "https://assets.coingecko.com/coins/images/35595/large/65c67f0ebf2f6a1bd0feb13c_usdb-icon-yellow.png",
  BLAST = "https://assets.coingecko.com/coins/images/35494/large/Blast.jpg",
  WBTC = "https://s2.coinmarketcap.com/static/img/coins/128x128/3717.png",
  MNT = "https://assets.coingecko.com/coins/images/30980/large/Mantle-Logo-mark.png",
}

/* --------------------- Tokens Constants --------------------- */

//
// Arbitrum
//

export const arbitrumETH = nativeETH(42161);

export const arbitrumWETH: Token = {
  chainId: 42161,
  token: getAddress("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const arbitrumUSDC: Token = {
  chainId: 42161,
  token: getAddress("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  logoURI: TokenLogo.USDC,
};

export const arbitrumAxlUSDC: Token = {
  chainId: 42161,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

export const arbitrumDAI: Token = {
  chainId: 42161,
  token: getAddress("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"),
  decimals: 18,
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
};

export const arbitrumUSDT: Token = {
  chainId: 42161,
  token: getAddress("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"),
  decimals: 6,
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
};

export const arbitrumUSDCe: Token = {
  chainId: 42161,
  token: getAddress("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"),
  decimals: 6,
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
};

const arbitrumTokens: Token[] = [
  arbitrumETH,
  arbitrumWETH,
  arbitrumUSDC,
  arbitrumAxlUSDC,
  arbitrumDAI,
  arbitrumUSDT,
  arbitrumUSDCe,
];

//
// Base Mainnet
//

export const baseETH = nativeETH(8453);

export const baseWETH: Token = {
  chainId: 8453,
  token: getAddress("0x4200000000000000000000000000000000000006"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const baseUSDC: Token = {
  chainId: 8453,
  token: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
  name: "USD Coin",
  symbol: "USDC",
  decimals: 6,
  logoURI: TokenLogo.USDC,
};

export const baseEURC: Token = {
  chainId: 8453,
  token: getAddress("0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"),
  decimals: 6,
  name: "EURC",
  symbol: "EURC",
  logoURI: TokenLogo.EURC,
};

export const baseUSDbC: Token = {
  chainId: 8453,
  token: getAddress("0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"),
  name: "Bridged USD Coin", // USDbC has a bad name & logo on CoinGecko
  symbol: "USDbC",
  decimals: 6,
  logoURI: `https://daimo.com/assets/foreign-coin-logos/USDbC.png`,
};

export const baseDAI: Token = {
  chainId: 8453,
  token: getAddress("0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"),
  name: "Dai Stablecoin",
  symbol: "DAI",
  decimals: 18,
  logoURI: TokenLogo.DAI,
};

export const baseUSDT: Token = {
  chainId: 8453,
  token: getAddress("0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"),
  name: "Tether USD",
  symbol: "USDT",
  decimals: 6,
  logoURI: TokenLogo.USDT,
};

export const baseAxlUSDC: Token = {
  chainId: 8453,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

const baseTokens: Token[] = [
  baseETH,
  baseWETH,
  baseUSDC,
  baseEURC,
  baseUSDbC,
  baseDAI,
  baseUSDT,
  baseAxlUSDC,
];

//
// Blast
//

export const blastETH = nativeETH(81457);

export const blastWETH: Token = {
  chainId: 81457,
  token: getAddress("0x4300000000000000000000000000000000000004"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const blastUSDB: Token = {
  chainId: 81457,
  token: getAddress("0x4300000000000000000000000000000000000003"),
  decimals: 18,
  name: "USDB",
  symbol: "USDB",
  logoURI: TokenLogo.USDB,
};

const blastTokens: Token[] = [blastETH, blastWETH, blastUSDB];

//
// BNB Smart Chain
//

export const bscBNB = nativeToken({
  chainId: 56,
  name: "BNB",
  symbol: "BNB",
  logoURI: TokenLogo.BNB,
});

export const bscWBNB: Token = {
  chainId: 56,
  token: getAddress("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"),
  decimals: 18,
  name: "Wrapped BNB",
  symbol: "WBNB",
  logoURI: TokenLogo.BNB,
};

export const bscAxlUSDC: Token = {
  chainId: 56,
  token: getAddress("0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

export const bscUSDC: Token = {
  chainId: 56,
  token: getAddress("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"),
  decimals: 18,
  name: "Binance-Peg USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
};

export const bscUSDT: Token = {
  chainId: 56,
  token: getAddress("0x55d398326f99059fF775485246999027B3197955"),
  decimals: 18,
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
};

const bscTokens: Token[] = [bscBNB, bscWBNB, bscAxlUSDC, bscUSDC, bscUSDT];

//
// Ethereum
//

export const ethereumETH = nativeETH(1);

export const ethereumWETH: Token = {
  chainId: 1,
  token: getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const ethereumUSDC: Token = {
  chainId: 1,
  token: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
};

export const ethereumDAI: Token = {
  chainId: 1,
  token: getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"),
  decimals: 18,
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
};

export const ethereumUSDT: Token = {
  chainId: 1,
  token: getAddress("0xdAC17F958D2ee523a2206206994597C13D831ec7"),
  decimals: 6,
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
};

export const ethereumEURC: Token = {
  chainId: 1,
  token: getAddress("0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c"),
  decimals: 6,
  name: "EURC",
  symbol: "EURC",
  logoURI: TokenLogo.EURC,
};

const ethereumTokens: Token[] = [
  ethereumETH,
  ethereumWETH,
  ethereumUSDC,
  ethereumEURC,
  ethereumDAI,
  ethereumUSDT,
];

//
// Linea
//

export const lineaETH = nativeETH(59144);

export const lineaWETH: Token = {
  chainId: 59144,
  token: getAddress("0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const lineaUSDCe: Token = {
  chainId: 59144,
  token: getAddress("0x176211869cA2b568f2A7D4EE941E073a821EE1ff"),
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC.e",
  logoURI: TokenLogo.USDC,
};

export const lineaAxlUSDC: Token = {
  chainId: 59144,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

export const lineaDAI: Token = {
  chainId: 59144,
  token: getAddress("0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5"),
  decimals: 18,
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
};

const lineaTokens: Token[] = [
  lineaETH,
  lineaWETH,
  lineaUSDCe,
  lineaAxlUSDC,
  lineaDAI,
];

//
// Mantle
//

export const mantleMNT = nativeToken({
  chainId: 5000,
  name: "Mantle",
  symbol: "MNT",
  logoURI: TokenLogo.MNT,
});

export const mantleWMNT: Token = {
  chainId: 5000,
  token: getAddress("0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8"),
  decimals: 18,
  name: "Wrapped Mantle",
  symbol: "WMNT",
  logoURI: TokenLogo.MNT,
};

export const mantleBridgedUSDC: Token = {
  chainId: 5000,
  token: getAddress("0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9"),
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
};

export const mantleUSDT: Token = {
  chainId: 5000,
  token: getAddress("0x201eba5cc46d216ce6dc03f6a759e8e766e956ae"),
  decimals: 6,
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
};

export const mantleAxlUSDC: Token = {
  chainId: 5000,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

const mantleTokens: Token[] = [
  mantleMNT,
  mantleWMNT,
  mantleBridgedUSDC,
  mantleUSDT,
  mantleAxlUSDC,
];

//
// Optimism
//

export const optimismETH = nativeETH(10);

export const optimismWETH: Token = {
  chainId: 10,
  token: getAddress("0x4200000000000000000000000000000000000006"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const optimismUSDC: Token = {
  chainId: 10,
  token: getAddress("0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"),
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
};

export const optimismAxlUSDC: Token = {
  chainId: 10,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

export const optimismDAI: Token = {
  chainId: 10,
  token: getAddress("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"),
  decimals: 18,
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
};

export const optimismUSDT: Token = {
  chainId: 10,
  token: getAddress("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"),
  decimals: 6,
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
};

export const optimismUSDCe: Token = {
  chainId: 10,
  token: getAddress("0x7F5c764cBc14f9669B88837ca1490cCa17c31607"),
  decimals: 6,
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
};

const optimismTokens = [
  optimismETH,
  optimismWETH,
  optimismUSDC,
  optimismAxlUSDC,
  optimismDAI,
  optimismUSDT,
  optimismUSDCe,
];

//
// Polygon
//

export const polygonPOL = nativeToken({
  chainId: 137,
  name: "Polygon",
  symbol: "POL",
  logoURI: TokenLogo.POL,
});

export const polygonWPOL: Token = {
  chainId: 137,
  token: getAddress("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"),
  decimals: 18,
  name: "Wrapped Polygon",
  symbol: "WPOL",
  logoURI: TokenLogo.POL,
};

export const polygonWETH: Token = {
  chainId: 137,
  token: getAddress("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const polygonUSDC: Token = {
  chainId: 137,
  token: getAddress("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"),
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
};

export const polygonAxlUSDC: Token = {
  chainId: 137,
  token: getAddress("0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed"),
  decimals: 6,
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
};

export const polygonDAI: Token = {
  chainId: 137,
  token: getAddress("0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"),
  decimals: 18,
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
};

export const polygonUSDT: Token = {
  chainId: 137,
  token: getAddress("0xc2132D05D31c914a87C6611C10748AEb04B58e8F"),
  decimals: 6,
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
};

export const polygonUSDCe: Token = {
  chainId: 137,
  token: getAddress("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"),
  decimals: 6,
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
};

const polygonTokens: Token[] = [
  polygonPOL,
  polygonWPOL,
  polygonWETH,
  polygonUSDC,
  polygonAxlUSDC,
  polygonDAI,
  polygonUSDT,
  polygonUSDCe,
];

//
// Solana
//

export const solanaSOL = nativeToken({
  chainId: 501,
  name: "Solana",
  symbol: "SOL",
  logoURI: TokenLogo.SOL,
  token: "11111111111111111111111111111111",
  decimals: 9,
});

export const solanaWSOL: Token = {
  chainId: 501,
  token: "So11111111111111111111111111111111111111112",
  decimals: 9,
  name: "Wrapped SOL",
  symbol: "WSOL",
  logoURI: TokenLogo.SOL,
};

export const solanaUSDC: Token = {
  chainId: 501,
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
};

const solanaTokens: Token[] = [solanaUSDC, solanaWSOL, solanaSOL];

//
// Worldchain
//

export const worldchainETH = nativeETH(480);

export const worldchainWETH: Token = {
  chainId: 480,
  token: getAddress("0x4200000000000000000000000000000000000006"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.ETH,
};

export const worldchainUSDCe: Token = {
  chainId: 480,
  token: getAddress("0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"),
  decimals: 6,
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
};

export const worldchainWLD: Token = {
  chainId: 480,
  token: getAddress("0x2cFc85d8E48F8EAB294be644d9E25C3030863003"),
  decimals: 18,
  name: "Worldcoin",
  symbol: "WLD",
  logoURI: TokenLogo.WLD,
};

const worldchainTokens: Token[] = [
  worldchainETH,
  worldchainWETH,
  worldchainUSDCe,
  worldchainWLD,
];

export const supportedTokens: Token[] = [
  ...arbitrumTokens,
  ...baseTokens,
  ...blastTokens,
  ...bscTokens,
  ...ethereumTokens,
  ...lineaTokens,
  ...mantleTokens,
  ...optimismTokens,
  ...polygonTokens,
  ...solanaTokens,
  ...worldchainTokens,
];

/* --------------------- Token Utils --------------------- */

// Export tokens for each supported chain
const tokensByChainId = new Map<number, Token[]>();

for (const token of supportedTokens) {
  const toks = tokensByChainId.get(token.chainId) || [];
  tokensByChainId.set(token.chainId, toks);
  toks.push(token);
}

/** All supported tokens on a given chain. */
export function getTokensForChain(chainId: number): Token[] {
  const ret = tokensByChainId.get(chainId);
  if (ret == null) throw new Error(`Unsupported chain ${chainId}`);
  return ret;
}

/* --------------------- Tokens By Type --------------------- */

enum TokenType {
  NATIVE = "NATIVE",
  WRAPPED_NATIVE = "WRAPPED_NATIVE",
  NATIVE_USDC = "NATIVE_USDC",
  BRIDGED_USDC = "BRIDGED_USDC",
  AXL_USDC = "AXL_USDC",
  DAI = "DAI",
}

const tokensByChainAndType: Record<
  number,
  Partial<Record<TokenType, Token>>
> = {
  42161: {
    [TokenType.NATIVE]: arbitrumETH,
    [TokenType.WRAPPED_NATIVE]: arbitrumWETH,
    [TokenType.NATIVE_USDC]: arbitrumUSDC,
    [TokenType.BRIDGED_USDC]: arbitrumUSDCe,
    [TokenType.AXL_USDC]: arbitrumAxlUSDC,
    [TokenType.DAI]: arbitrumDAI,
  },
  8453: {
    [TokenType.NATIVE]: baseETH,
    [TokenType.WRAPPED_NATIVE]: baseWETH,
    [TokenType.NATIVE_USDC]: baseUSDC,
    [TokenType.BRIDGED_USDC]: baseUSDbC,
    [TokenType.AXL_USDC]: baseAxlUSDC,
    [TokenType.DAI]: baseDAI,
  },
  81457: {
    [TokenType.NATIVE]: blastETH,
    [TokenType.WRAPPED_NATIVE]: blastWETH,
  },
  56: {
    [TokenType.NATIVE]: bscBNB,
    [TokenType.WRAPPED_NATIVE]: bscWBNB,
    [TokenType.BRIDGED_USDC]: bscUSDC,
    [TokenType.AXL_USDC]: bscAxlUSDC,
  },
  1: {
    [TokenType.NATIVE]: ethereumETH,
    [TokenType.WRAPPED_NATIVE]: ethereumWETH,
    [TokenType.NATIVE_USDC]: ethereumUSDC,
    [TokenType.DAI]: ethereumDAI,
  },
  59144: {
    [TokenType.NATIVE]: lineaETH,
    [TokenType.WRAPPED_NATIVE]: lineaWETH,
    [TokenType.BRIDGED_USDC]: lineaUSDCe,
    [TokenType.AXL_USDC]: lineaAxlUSDC,
    [TokenType.DAI]: lineaDAI,
  },
  5000: {
    [TokenType.NATIVE]: mantleMNT,
    [TokenType.WRAPPED_NATIVE]: mantleWMNT,
    [TokenType.BRIDGED_USDC]: mantleBridgedUSDC,
    [TokenType.AXL_USDC]: mantleAxlUSDC,
  },
  10: {
    [TokenType.NATIVE]: optimismETH,
    [TokenType.WRAPPED_NATIVE]: optimismWETH,
    [TokenType.NATIVE_USDC]: optimismUSDC,
    [TokenType.BRIDGED_USDC]: optimismUSDCe,
    [TokenType.AXL_USDC]: optimismAxlUSDC,
    [TokenType.DAI]: optimismDAI,
  },
  137: {
    [TokenType.NATIVE]: polygonPOL,
    [TokenType.WRAPPED_NATIVE]: polygonWPOL,
    [TokenType.NATIVE_USDC]: polygonUSDC,
    [TokenType.BRIDGED_USDC]: polygonUSDCe,
    [TokenType.AXL_USDC]: polygonAxlUSDC,
    [TokenType.DAI]: polygonDAI,
  },
  501: {
    [TokenType.NATIVE]: solanaSOL,
    [TokenType.WRAPPED_NATIVE]: solanaWSOL,
    [TokenType.NATIVE_USDC]: solanaUSDC,
  },
  480: {
    [TokenType.NATIVE]: worldchainETH,
    [TokenType.WRAPPED_NATIVE]: worldchainWETH,
    [TokenType.BRIDGED_USDC]: worldchainUSDCe,
  },
};

export function getChainNativeToken(chainId: number): Token | undefined {
  return tokensByChainAndType[chainId][TokenType.NATIVE];
}

export function getChainWrappedNativeToken(chainId: number): Token | undefined {
  return tokensByChainAndType[chainId][TokenType.WRAPPED_NATIVE];
}

export function getChainNativeUSDC(chainId: number): Token | undefined {
  return tokensByChainAndType[chainId][TokenType.NATIVE_USDC];
}

export function getChainAxlUSDC(chainId: number): Token | undefined {
  return tokensByChainAndType[chainId][TokenType.AXL_USDC];
}

/** Returns native USDC when available, otherwise bridged USDC. */
export function getChainBestUSDC(chainId: number): Token | undefined {
  const t = tokensByChainAndType[chainId];
  return t[TokenType.NATIVE_USDC] ?? t[TokenType.BRIDGED_USDC];
}

export function getChainDAI(chainId: number): Token | undefined {
  return tokensByChainAndType[chainId][TokenType.DAI];
}

/* --------------------- Native Token Utils --------------------- */

function nativeETH(chainId: number): Token {
  return nativeToken({
    chainId,
    name: "Ether",
    symbol: "ETH",
    logoURI: TokenLogo.ETH,
  });
}

function nativeToken({
  chainId,
  name,
  symbol,
  logoURI,
  token = zeroAddress,
  decimals = 18,
}: {
  chainId: number;
  name: string;
  symbol: string;
  logoURI: string;
  token?: string;
  decimals?: number;
}): Token {
  return {
    chainId,
    token,
    name,
    decimals,
    symbol,
    logoURI,
  };
}
