import { Address, getAddress, zeroAddress } from "viem";
import { assertNotNull } from "./assert";
import {
  arbitrum,
  base,
  bsc,
  celo,
  ethereum,
  gnosis,
  linea,
  monad,
  optimism,
  polygon,
  scroll,
  solana,
  tron,
  worldchain,
} from "./chain";

export type Token = {
  /** Chain ID, eg 10 for OP Mainnet */
  chainId: number;
  /** Ethereum (capitalized) or Solana token address */
  token: `0x${string}` | string;
  /** Name, eg "Wrapped Bitcoin" */
  name?: string;
  /** Symbol, eg "WBTC" */
  symbol: string;
  /** Token decimals, eg 8 for WBTC */
  decimals: number;
  /** Fiat ISO code for stablecoins, eg "USD" or "EUR" */
  fiatISO?: string;
  /** Logo preview data URI. Generally SVG or 64x64 PNG. */
  logoURI: TokenLogo | string;
  /** Original source image URL. */
  logoSourceURI: string;
};

export enum TokenLogo {
  BNB = "https://pay.daimo.com/coin-logos/bnb.png",
  CELO = "https://pay.daimo.com/coin-logos/celo.png",
  cUSD = "https://pay.daimo.com/coin-logos/cusd.png",
  DAI = "https://pay.daimo.com/coin-logos/dai.png",
  ETH = "https://pay.daimo.com/coin-logos/eth.png",
  EURC = "https://pay.daimo.com/coin-logos/eurc.png",
  EURe = "https://pay.daimo.com/coin-logos/eure.png",
  JPYC = "https://pay.daimo.com/coin-logos/jpyc.png",
  MON = "https://pay.daimo.com/coin-logos/mon.png",
  POL = "https://pay.daimo.com/coin-logos/pol.png",
  SOL = "https://pay.daimo.com/coin-logos/sol.png",
  USDBc = "https://pay.daimo.com/coin-logos/usdbc.png",
  USDC = "https://pay.daimo.com/coin-logos/usdc.png",
  USDT = "https://pay.daimo.com/coin-logos/usdt.png",
  WBTC = "https://pay.daimo.com/coin-logos/wbtc.png",
  WETH = "https://pay.daimo.com/coin-logos/weth.png",
  WLD = "https://pay.daimo.com/coin-logos/wld.jpeg",
  XDAI = "https://pay.daimo.com/coin-logos/xdai.png",
}

const NATIVE_TOKEN_ADDRESS = zeroAddress;

/* --------------------- Tokens Constants --------------------- */

//
// Arbitrum
//

export const arbitrumETH = nativeETH(arbitrum.chainId);

export const arbitrumWETH: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const arbitrumUSDC: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0xaf88d065e77c8cC2239327C5EDb3A432268e5831"),
  name: "USD Coin",
  symbol: "USDC",
  fiatISO: "USD",
  decimals: 6,
  logoURI: TokenLogo.USDC,
});

export const arbitrumAxlUSDC: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

export const arbitrumDAI: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"),
  decimals: 18,
  fiatISO: "USD",
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
});

export const arbitrumUSDT: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

export const arbitrumUSDCe: Token = token({
  chainId: arbitrum.chainId,
  token: getAddress("0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8"),
  decimals: 6,
  fiatISO: "USD",
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
});

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

export const baseETH = nativeETH(base.chainId);

export const baseWETH: Token = token({
  chainId: base.chainId,
  token: getAddress("0x4200000000000000000000000000000000000006"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const baseUSDC: Token = token({
  chainId: base.chainId,
  token: getAddress("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"),
  name: "USD Coin",
  symbol: "USDC",
  fiatISO: "USD",
  decimals: 6,
  logoURI: TokenLogo.USDC,
});

export const baseEURC: Token = token({
  chainId: base.chainId,
  token: getAddress("0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42"),
  decimals: 6,
  fiatISO: "EUR",
  name: "EURC",
  symbol: "EURC",
  logoURI: TokenLogo.EURC,
});

export const baseUSDbC: Token = token({
  chainId: base.chainId,
  token: getAddress("0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA"),
  name: "Bridged USD Coin", // USDbC has a bad name & logo on CoinGecko
  symbol: "USDbC",
  fiatISO: "USD",
  decimals: 6,
  logoURI: TokenLogo.USDBc,
});

export const baseDAI: Token = token({
  chainId: base.chainId,
  token: getAddress("0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb"),
  name: "Dai Stablecoin",
  symbol: "DAI",
  fiatISO: "USD",
  decimals: 18,
  logoURI: TokenLogo.DAI,
});

export const baseUSDT: Token = token({
  chainId: base.chainId,
  token: getAddress("0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2"),
  name: "Tether USD",
  symbol: "USDT",
  fiatISO: "USD",
  decimals: 6,
  logoURI: TokenLogo.USDT,
});

export const baseAxlUSDC: Token = token({
  chainId: base.chainId,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

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
// BNB Smart Chain
//

export const bscBNB = nativeToken({
  chainId: bsc.chainId,
  name: "BNB",
  symbol: "BNB",
  logoURI: TokenLogo.BNB,
});

export const bscWBNB: Token = token({
  chainId: bsc.chainId,
  token: getAddress("0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"),
  decimals: 18,
  name: "Wrapped BNB",
  symbol: "WBNB",
  logoURI: TokenLogo.BNB,
});

export const bscAxlUSDC: Token = token({
  chainId: bsc.chainId,
  token: getAddress("0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

export const bscUSDC: Token = token({
  chainId: bsc.chainId,
  token: getAddress("0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d"),
  decimals: 18,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const bscUSDT: Token = token({
  chainId: bsc.chainId,
  token: getAddress("0x55d398326f99059fF775485246999027B3197955"),
  decimals: 18,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

const bscTokens: Token[] = [bscBNB, bscWBNB, bscAxlUSDC, bscUSDC, bscUSDT];

//
// Celo
//

// CELO functions as both a native token and an ERC-20 compatible token
export const celoCelo: Token = token({
  chainId: celo.chainId,
  token: getAddress("0x471EcE3750Da237f93B8E339c536989b8978a438"),
  decimals: 18,
  name: "Celo",
  symbol: "CELO",
  logoURI: TokenLogo.CELO,
});

export const celoAxlUSDC: Token = token({
  chainId: celo.chainId,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

export const celoUSDC: Token = token({
  chainId: celo.chainId,
  token: getAddress("0xcebA9300f2b948710d2653dD7B07f33A8B32118C"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const celoUSDT: Token = token({
  chainId: celo.chainId,
  token: getAddress("0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

export const celoCUSD: Token = token({
  chainId: celo.chainId,
  token: getAddress("0x765DE816845861e75A25fCA122bb6898B8B1282a"),
  decimals: 18,
  fiatISO: "USD",
  name: "Celo Dollar",
  symbol: "cUSD",
  logoURI: TokenLogo.cUSD,
});

const celoTokens: Token[] = [
  celoCelo,
  celoAxlUSDC,
  celoUSDC,
  celoUSDT,
  celoCUSD,
];

//
// Ethereum
//

export const ethereumETH = nativeETH(ethereum.chainId);

export const ethereumWETH: Token = token({
  chainId: ethereum.chainId,
  token: getAddress("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const ethereumUSDC: Token = token({
  chainId: ethereum.chainId,
  token: getAddress("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const ethereumDAI: Token = token({
  chainId: ethereum.chainId,
  token: getAddress("0x6B175474E89094C44Da98b954EedeAC495271d0F"),
  decimals: 18,
  fiatISO: "USD",
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
});

export const ethereumUSDT: Token = token({
  chainId: ethereum.chainId,
  token: getAddress("0xdAC17F958D2ee523a2206206994597C13D831ec7"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

export const ethereumEURC: Token = token({
  chainId: ethereum.chainId,
  token: getAddress("0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c"),
  decimals: 6,
  fiatISO: "EUR",
  name: "EURC",
  symbol: "EURC",
  logoURI: TokenLogo.EURC,
});

const ethereumTokens: Token[] = [
  ethereumETH,
  ethereumWETH,
  ethereumUSDC,
  ethereumEURC,
  ethereumDAI,
  ethereumUSDT,
];

//
// Gnosis
//

export const gnosisXDAI: Token = nativeToken({
  chainId: gnosis.chainId,
  name: "XDAI",
  symbol: "XDAI",
  logoURI: TokenLogo.XDAI,
  token: NATIVE_TOKEN_ADDRESS,
  decimals: 18,
});

export const gnosisUSDCe: Token = token({
  chainId: gnosis.chainId,
  token: getAddress("0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0"),
  decimals: 6,
  fiatISO: "USD",
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
});

export const gnosisEURe: Token = token({
  chainId: gnosis.chainId,
  token: getAddress("0x420CA0f9B9b604cE0fd9C18EF134C705e5Fa3430"),
  decimals: 18,
  fiatISO: "EUR",
  name: "Monerium EURe",
  symbol: "EURe",
  logoURI: TokenLogo.EURe,
});

const gnosisTokens: Token[] = [gnosisXDAI, gnosisUSDCe, gnosisEURe];

//
// Linea
//

export const lineaETH = nativeETH(linea.chainId);

export const lineaWETH: Token = token({
  chainId: linea.chainId,
  token: getAddress("0xe5d7c2a44ffddf6b295a15c148167daaaf5cf34f"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const lineaUSDC: Token = token({
  chainId: linea.chainId,
  token: getAddress("0x176211869cA2b568f2A7D4EE941E073a821EE1ff"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const lineaAxlUSDC: Token = token({
  chainId: linea.chainId,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

export const lineaDAI: Token = token({
  chainId: linea.chainId,
  token: getAddress("0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5"),
  decimals: 18,
  fiatISO: "USD",
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
});

const lineaTokens: Token[] = [
  lineaETH,
  lineaWETH,
  lineaUSDC,
  lineaAxlUSDC,
  lineaDAI,
];

//
// Monad
//

export const monadMON = nativeToken({
  chainId: monad.chainId,
  name: "Monad",
  symbol: "MON",
  logoURI: TokenLogo.MON,
});

export const monadWMON: Token = token({
  chainId: monad.chainId,
  token: getAddress("0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A"),
  decimals: 18,
  name: "Wrapped Monad",
  symbol: "WMON",
  logoURI: TokenLogo.MON,
});

export const monadUSDC: Token = token({
  chainId: monad.chainId,
  token: getAddress("0x754704Bc059F8C67012fEd69BC8A327a5aafb603"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const monadUSDT: Token = token({
  chainId: monad.chainId,
  token: getAddress("0xe7cd86e13AC4309349F30B3435a9d337750fC82D"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

const monadTokens: Token[] = [monadMON, monadWMON, monadUSDC, monadUSDT];

//
// Optimism
//

export const optimismETH = nativeETH(optimism.chainId);

export const optimismWETH: Token = token({
  chainId: optimism.chainId,
  token: getAddress("0x4200000000000000000000000000000000000006"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const optimismUSDC: Token = token({
  chainId: optimism.chainId,
  token: getAddress("0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const optimismAxlUSDC: Token = token({
  chainId: optimism.chainId,
  token: getAddress("0xEB466342C4d449BC9f53A865D5Cb90586f405215"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

export const optimismDAI: Token = token({
  chainId: optimism.chainId,
  token: getAddress("0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1"),
  decimals: 18,
  fiatISO: "USD",
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
});

export const optimismUSDT: Token = token({
  chainId: optimism.chainId,
  token: getAddress("0x94b008aA00579c1307B0EF2c499aD98a8ce58e58"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

export const optimismUSDCe: Token = token({
  chainId: optimism.chainId,
  token: getAddress("0x7F5c764cBc14f9669B88837ca1490cCa17c31607"),
  decimals: 6,
  fiatISO: "USD",
  name: "Bridged USD Coin",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
});

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
  chainId: polygon.chainId,
  name: "Polygon",
  symbol: "POL",
  logoURI: TokenLogo.POL,
});

export const polygonWPOL: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"),
  decimals: 18,
  name: "Wrapped Polygon",
  symbol: "WPOL",
  logoURI: TokenLogo.POL,
});

export const polygonWETH: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const polygonUSDC: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const polygonAxlUSDC: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed"),
  decimals: 6,
  fiatISO: "USD",
  name: "Axelar Wrapped USDC",
  symbol: "axlUSDC",
  logoURI: TokenLogo.USDC,
});

export const polygonDAI: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"),
  decimals: 18,
  fiatISO: "USD",
  name: "Dai Stablecoin",
  symbol: "DAI",
  logoURI: TokenLogo.DAI,
});

export const polygonUSDT: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0xc2132D05D31c914a87C6611C10748AEb04B58e8F"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

export const polygonUSDCe: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin (PoS)",
  symbol: "USDCe",
  logoURI: TokenLogo.USDC,
});

export const polygonJPYC: Token = token({
  chainId: polygon.chainId,
  token: getAddress("0xE7C3D8C9a439feDe00D2600032D5dB0Be71C3c29"),
  decimals: 18,
  fiatISO: "JPY",
  name: "JPY Coin",
  symbol: "JPYC",
  logoURI: TokenLogo.JPYC,
});

const polygonTokens: Token[] = [
  polygonPOL,
  polygonWPOL,
  polygonWETH,
  polygonUSDC,
  polygonAxlUSDC,
  polygonDAI,
  polygonUSDT,
  polygonUSDCe,
  polygonJPYC,
];

//
// Scroll
//

export const scrollETH = nativeETH(scroll.chainId);

export const scrollWETH: Token = token({
  chainId: scroll.chainId,
  token: getAddress("0x5300000000000000000000000000000000000004"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const scrollUSDC: Token = token({
  chainId: scroll.chainId,
  token: getAddress("0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const scrollUSDT: Token = token({
  chainId: scroll.chainId,
  token: getAddress("0xf55BEC9cafDbE8730f096Aa55dad6D22d44099Df"),
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

const scrollTokens: Token[] = [scrollETH, scrollWETH, scrollUSDC, scrollUSDT];

//
// Solana
//

export const solanaSOL = nativeToken({
  chainId: solana.chainId,
  name: "Solana",
  symbol: "SOL",
  logoURI: TokenLogo.SOL,
  token: "11111111111111111111111111111111",
  decimals: 9,
});

export const solanaWSOL: Token = token({
  chainId: solana.chainId,
  token: "So11111111111111111111111111111111111111112",
  decimals: 9,
  name: "Wrapped SOL",
  symbol: "WSOL",
  logoURI: TokenLogo.SOL,
});

export const solanaUSDC: Token = token({
  chainId: solana.chainId,
  token: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

const solanaTokens: Token[] = [solanaUSDC, solanaWSOL, solanaSOL];

//
// Tron
//

export const tronUSDT: Token = token({
  chainId: tron.chainId,
  token: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
  decimals: 6,
  fiatISO: "USD",
  name: "Tether USD",
  symbol: "USDT",
  logoURI: TokenLogo.USDT,
});

const tronTokens: Token[] = [tronUSDT];

//
// Worldchain
//

export const worldchainETH = nativeETH(worldchain.chainId);

export const worldchainWETH: Token = token({
  chainId: worldchain.chainId,
  token: getAddress("0x4200000000000000000000000000000000000006"),
  decimals: 18,
  name: "Wrapped Ether",
  symbol: "WETH",
  logoURI: TokenLogo.WETH,
});

export const worldchainWBTC: Token = token({
  chainId: worldchain.chainId,
  token: getAddress("0x03c7054bcb39f7b2e5b2c7acb37583e32d70cfa3"),
  decimals: 8,
  name: "Wrapped Bitcoin",
  symbol: "WBTC",
  logoURI: TokenLogo.WBTC,
});

export const worldchainUSDC: Token = token({
  chainId: worldchain.chainId,
  token: getAddress("0x79A02482A880bCE3F13e09Da970dC34db4CD24d1"),
  decimals: 6,
  fiatISO: "USD",
  name: "USD Coin",
  symbol: "USDC",
  logoURI: TokenLogo.USDC,
});

export const worldchainWLD: Token = token({
  chainId: worldchain.chainId,
  token: getAddress("0x2cFc85d8E48F8EAB294be644d9E25C3030863003"),
  decimals: 18,
  name: "Worldcoin",
  symbol: "WLD",
  logoURI: TokenLogo.WLD,
});

const worldchainTokens: Token[] = [
  worldchainETH,
  worldchainWETH,
  worldchainWBTC,
  worldchainUSDC,
  worldchainWLD,
];

const knownTokensByChain = new Map<number, Token[]>([
  [arbitrum.chainId, arbitrumTokens],
  [base.chainId, baseTokens],
  [bsc.chainId, bscTokens],
  [celo.chainId, celoTokens],
  [ethereum.chainId, ethereumTokens],
  [gnosis.chainId, gnosisTokens],
  [linea.chainId, lineaTokens],
  [monad.chainId, monadTokens],
  [optimism.chainId, optimismTokens],
  [polygon.chainId, polygonTokens],
  [scroll.chainId, scrollTokens],
  [solana.chainId, solanaTokens],
  [tron.chainId, tronTokens],
  [worldchain.chainId, worldchainTokens],
]);

/**
 * Common tokens, included for convenience.
 *
 * Daimo Pay supports payment in many more tokens. In general, the goal for
 * Pay is to accept all tokens with DEX liquidity on any major chain.
 */
export const knownTokens: Token[] = Array.from(
  knownTokensByChain.values(),
).flat();

/* --------------------- Tokens By Address --------------------- */

const tokensByChainAddr = new Map<string, Token>(
  knownTokens.map((t) => [`${t.chainId}-${t.token}`, t]),
);

export function getKnownToken(
  chainId: number,
  tokenAddress: string,
): Token | undefined {
  return tokensByChainAddr.get(`${chainId}-${tokenAddress}`);
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

const tokensByChainAndType: Map<
  number,
  Partial<Record<TokenType, Token>>
> = new Map([
  [
    arbitrum.chainId,
    {
      [TokenType.NATIVE]: arbitrumETH,
      [TokenType.WRAPPED_NATIVE]: arbitrumWETH,
      [TokenType.NATIVE_USDC]: arbitrumUSDC,
      [TokenType.BRIDGED_USDC]: arbitrumUSDCe,
      [TokenType.AXL_USDC]: arbitrumAxlUSDC,
      [TokenType.DAI]: arbitrumDAI,
    },
  ],
  [
    base.chainId,
    {
      [TokenType.NATIVE]: baseETH,
      [TokenType.WRAPPED_NATIVE]: baseWETH,
      [TokenType.NATIVE_USDC]: baseUSDC,
      [TokenType.BRIDGED_USDC]: baseUSDbC,
      [TokenType.AXL_USDC]: baseAxlUSDC,
      [TokenType.DAI]: baseDAI,
    },
  ],
  [
    bsc.chainId,
    {
      [TokenType.NATIVE]: bscBNB,
      [TokenType.WRAPPED_NATIVE]: bscWBNB,
      [TokenType.BRIDGED_USDC]: bscUSDC,
      [TokenType.AXL_USDC]: bscAxlUSDC,
    },
  ],
  [
    celo.chainId,
    {
      // CELO functions as both a native token and an ERC-20 compatible token
      [TokenType.NATIVE]: celoCelo,
      [TokenType.WRAPPED_NATIVE]: celoCelo,
      [TokenType.NATIVE_USDC]: celoUSDC,
      [TokenType.AXL_USDC]: celoAxlUSDC,
    },
  ],
  [
    ethereum.chainId,
    {
      [TokenType.NATIVE]: ethereumETH,
      [TokenType.WRAPPED_NATIVE]: ethereumWETH,
      [TokenType.NATIVE_USDC]: ethereumUSDC,
      [TokenType.DAI]: ethereumDAI,
    },
  ],
  [
    gnosis.chainId,
    {
      [TokenType.NATIVE]: gnosisXDAI,
      [TokenType.NATIVE_USDC]: gnosisUSDCe,
    },
  ],
  [
    linea.chainId,
    {
      [TokenType.NATIVE]: lineaETH,
      [TokenType.WRAPPED_NATIVE]: lineaWETH,
      [TokenType.NATIVE_USDC]: lineaUSDC,
      [TokenType.AXL_USDC]: lineaAxlUSDC,
      [TokenType.DAI]: lineaDAI,
    },
  ],
  [
    monad.chainId,
    {
      [TokenType.NATIVE]: monadMON,
      [TokenType.WRAPPED_NATIVE]: monadWMON,
      [TokenType.NATIVE_USDC]: monadUSDC,
    },
  ],
  [
    optimism.chainId,
    {
      [TokenType.NATIVE]: optimismETH,
      [TokenType.WRAPPED_NATIVE]: optimismWETH,
      [TokenType.NATIVE_USDC]: optimismUSDC,
      [TokenType.BRIDGED_USDC]: optimismUSDCe,
      [TokenType.AXL_USDC]: optimismAxlUSDC,
      [TokenType.DAI]: optimismDAI,
    },
  ],
  [
    polygon.chainId,
    {
      [TokenType.NATIVE]: polygonPOL,
      [TokenType.WRAPPED_NATIVE]: polygonWPOL,
      [TokenType.NATIVE_USDC]: polygonUSDC,
      [TokenType.BRIDGED_USDC]: polygonUSDCe,
      [TokenType.AXL_USDC]: polygonAxlUSDC,
      [TokenType.DAI]: polygonDAI,
    },
  ],
  [
    scroll.chainId,
    {
      [TokenType.NATIVE]: scrollETH,
      [TokenType.WRAPPED_NATIVE]: scrollWETH,
      [TokenType.BRIDGED_USDC]: scrollUSDC,
    },
  ],
  [
    solana.chainId,
    {
      [TokenType.NATIVE]: solanaSOL,
      [TokenType.WRAPPED_NATIVE]: solanaWSOL,
      [TokenType.NATIVE_USDC]: solanaUSDC,
    },
  ],
  [
    worldchain.chainId,
    {
      [TokenType.NATIVE]: worldchainETH,
      [TokenType.WRAPPED_NATIVE]: worldchainWETH,
      [TokenType.NATIVE_USDC]: worldchainUSDC,
    },
  ],
]);

export function isNativeToken(chainId: number, token: Address): boolean {
  const nativeToken = tokensByChainAndType.get(chainId)?.[TokenType.NATIVE];
  if (nativeToken == null) {
    return false;
  }
  return getAddress(nativeToken.token) === getAddress(token);
}

export function getChainNativeToken(chainId: number): Token {
  return assertNotNull(
    tokensByChainAndType.get(chainId)?.[TokenType.NATIVE],
    () => `missing native token for chainId ${chainId}`,
  );
}

export function getChainWrappedNativeToken(chainId: number): Token {
  return assertNotNull(
    tokensByChainAndType.get(chainId)?.[TokenType.WRAPPED_NATIVE],
    () => `missing wrapped native token for chainId ${chainId}`,
  );
}

export function getChainNativeUSDC(chainId: number): Token | undefined {
  return tokensByChainAndType.get(chainId)?.[TokenType.NATIVE_USDC];
}

export function getChainAxlUSDC(chainId: number): Token | undefined {
  return tokensByChainAndType.get(chainId)?.[TokenType.AXL_USDC];
}

/** Returns native USDC when available, otherwise bridged USDC. */
export function getChainBestUSDC(chainId: number): Token | undefined {
  const t = tokensByChainAndType.get(chainId);
  return t?.[TokenType.NATIVE_USDC] ?? t?.[TokenType.BRIDGED_USDC];
}

export function getChainDAI(chainId: number): Token | undefined {
  return tokensByChainAndType.get(chainId)?.[TokenType.DAI];
}

/** Returns true if two tokens are equal (same chain and token address). */
export function tokensEqual(a: Token, b: Token): boolean {
  return a.chainId === b.chainId && a.token === b.token;
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
  token = NATIVE_TOKEN_ADDRESS,
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
    logoSourceURI: logoURI,
  };
}

export function token({
  chainId,
  token,
  name,
  symbol,
  decimals,
  fiatISO,
  logoURI,
}: {
  chainId: number;
  token: Address | string;
  name: string;
  symbol: string;
  decimals: number;
  fiatISO?: string;
  logoURI: string;
}): Token {
  return {
    chainId,
    token,
    name,
    symbol,
    decimals,
    fiatISO,
    logoURI,
    logoSourceURI: logoURI,
  };
}
