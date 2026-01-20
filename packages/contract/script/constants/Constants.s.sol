// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.13;

import {CREATE3Factory} from "../../vendor/create3/CREATE3Factory.sol";

// Uniswap deployments
// https://docs.uniswap.org/contracts/v3/reference/deployments/

// Mainnet USDC deployments
// https://developers.circle.com/stablecoins/docs/usdc-on-main-networks

// Sepolia USDC deployments
// https://developers.circle.com/stablecoins/docs/usdc-on-test-networks

// CCTP Token Messenger deployments
// https://developers.circle.com/stablecoins/docs/evm-smart-contracts#tokenmessenger-mainnet
// https://developers.circle.com/stablecoins/docs/evm-smart-contracts#tokenmessenger-testnet

// CCTP Token Minter deployments
// https://developers.circle.com/stablecoins/docs/evm-smart-contracts#tokenminter-mainnet
// https://developers.circle.com/stablecoins/docs/evm-smart-contracts#tokenminter-testnet

// Across contract deployments
// https://docs.across.to/reference/contract-addresses
// https://github.com/across-protocol/contracts/blob/master/deployments/README.md

// Axelar contract deployments and token addresses
// https://docs.axelar.dev/resources/contract-addresses/mainnet

// ----------------- Chain IDs ----------------- //
uint256 constant ARBITRUM_MAINNET = 42161;
uint256 constant BASE_MAINNET = 8453;
uint256 constant BSC_MAINNET = 56;
uint256 constant CELO_MAINNET = 42220;
uint256 constant ETH_MAINNET = 1;
uint256 constant GNOSIS_MAINNET = 100;
uint256 constant HYPEREVM_MAINNET = 999;
uint256 constant LINEA_MAINNET = 59144;
uint256 constant MONAD_MAINNET = 143;
uint256 constant OP_MAINNET = 10;
uint256 constant POLYGON_MAINNET = 137; // PoS
uint256 constant SCROLL_MAINNET = 534352;
uint256 constant WORLDCHAIN_MAINNET = 480;

// ----------------- Token Addresses ----------------- //

// USDC addresses
address constant ARBITRUM_MAINNET_USDC = 0xaf88d065e77c8cC2239327C5EDb3A432268e5831;
address constant BASE_MAINNET_USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
address constant CELO_MAINNET_USDC = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C;
address constant ETH_MAINNET_USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
address constant HYPEREVM_MAINNET_USDC = 0xb88339CB7199b77E23DB6E890353E22632Ba630f;
address constant LINEA_MAINNET_USDC = 0x176211869cA2b568f2A7D4EE941E073a821EE1ff;
address constant MONAD_MAINNET_USDC = 0x754704Bc059F8C67012fEd69BC8A327a5aafb603;
address constant OP_MAINNET_USDC = 0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85;
address constant POLYGON_MAINNET_USDC = 0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359;
address constant SCROLL_MAINNET_USDC = 0x06eFdBFf2a14a7c8E15944D1F4A48F9F95F663A4;
address constant WORLDCHAIN_MAINNET_USDC = 0x79A02482A880bCE3F13e09Da970dC34db4CD24d1;

// DAI addresses
address constant ARBITRUM_MAINNET_DAI = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
address constant BASE_MAINNET_DAI = 0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb;
address constant BSC_MAINNET_DAI = 0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3;
address constant ETH_MAINNET_DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
address constant LINEA_MAINNET_DAI = 0x4AF15ec2A0BD43Db75dd04E62FAA3B8EF36b00d5;
address constant OP_MAINNET_DAI = 0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1;
address constant POLYGON_MAINNET_DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;

// USDT addresses
address constant ARBITRUM_MAINNET_USDT = 0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9;
address constant BASE_MAINNET_USDT = 0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2;
address constant BSC_MAINNET_USDT = 0x55d398326f99059fF775485246999027B3197955;
address constant CELO_MAINNET_USDT = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e;
address constant ETH_MAINNET_USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
address constant LINEA_MAINNET_USDT = 0xA219439258ca9da29E9Cc4cE5596924745e12B93;
address constant MONAD_MAINNET_USDT = 0xe7cd86e13AC4309349F30B3435a9d337750fC82D;
address constant OP_MAINNET_USDT = 0x94b008aA00579c1307B0EF2c499aD98a8ce58e58;
address constant POLYGON_MAINNET_USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

// Legacy Mesh UsdtOFT addresses (LayerZero USDT)
address constant ARBITRUM_MAINNET_LEGACY_MESH_USDT_OFT = 0x77652D5aba086137b595875263FC200182919B92;
address constant CELO_MAINNET_LEGACY_MESH_USDT_OFT = 0xf10E161027410128E63E75D0200Fb6d34b2db243;
address constant ETH_MAINNET_LEGACY_MESH_USDT_OFT = 0x1F748c76dE468e9D11bd340fA9D5CBADf315dFB0;

// USDC.e or USDbC (bridged USDC) addresses
address constant ARBITRUM_MAINNET_BRIDGED_USDC = 0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8;
address constant BASE_MAINNET_BRIDGED_USDC = 0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA;
address constant BSC_MAINNET_BRIDGED_USDC = 0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d; // NOTE: Binance pegged USDC has 18 decimals on BSC.
address constant GNOSIS_MAINNET_BRIDGED_USDC = 0x2a22f9c3b484c3629090FeED35F17Ff8F88f76F0;
address constant OP_MAINNET_BRIDGED_USDC = 0x7F5c764cBc14f9669B88837ca1490cCa17c31607;
address constant POLYGON_MAINNET_BRIDGED_USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;

// axlUSDC (Axelar wrapped USDC) addresses
address constant ARBITRUM_MAINNET_AXLUSDC = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
address constant BASE_MAINNET_AXLUSDC = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
address constant BSC_MAINNET_AXLUSDC = 0x4268B8F0B87b6Eae5d897996E6b845ddbD99Adf3;
address constant ETH_MAINNET_AXLUSDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
address constant LINEA_MAINNET_AXLUSDC = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
address constant OP_MAINNET_AXLUSDC = 0xEB466342C4d449BC9f53A865D5Cb90586f405215;
address constant POLYGON_MAINNET_AXLUSDC = 0x750e4C4984a9e0f12978eA6742Bc1c5D248f40ed;

// ----------------- Hop ----------------- //

function getHopCoinDecimals(address token) pure returns (uint256) {
    // Special case:
    if (token == BSC_MAINNET_BRIDGED_USDC) return 18;

    // USDC addresses
    if (token == ARBITRUM_MAINNET_USDC) return 6;
    if (token == BASE_MAINNET_USDC) return 6;
    if (token == CELO_MAINNET_USDC) return 6;
    if (token == ETH_MAINNET_USDC) return 6;
    if (token == HYPEREVM_MAINNET_USDC) return 6;
    if (token == LINEA_MAINNET_USDC) return 6;
    if (token == MONAD_MAINNET_USDC) return 6;
    if (token == OP_MAINNET_USDC) return 6;
    if (token == POLYGON_MAINNET_USDC) return 6;
    if (token == SCROLL_MAINNET_USDC) return 6;
    if (token == WORLDCHAIN_MAINNET_USDC) return 6;

    // USDT addresses
    if (token == ARBITRUM_MAINNET_USDT) return 6;
    if (token == CELO_MAINNET_USDT) return 6;

    // USDC.e or USDbC (bridged USDC) addresses
    if (token == ARBITRUM_MAINNET_BRIDGED_USDC) return 6;
    if (token == BASE_MAINNET_BRIDGED_USDC) return 6;
    if (token == GNOSIS_MAINNET_BRIDGED_USDC) return 6;
    if (token == OP_MAINNET_BRIDGED_USDC) return 6;
    if (token == POLYGON_MAINNET_BRIDGED_USDC) return 6;

    // axlUSDC (Axelar wrapped USDC) addresses
    if (token == ARBITRUM_MAINNET_AXLUSDC) return 6;
    if (token == BASE_MAINNET_AXLUSDC) return 6;
    if (token == BSC_MAINNET_AXLUSDC) return 6;
    if (token == ETH_MAINNET_AXLUSDC) return 6;
    if (token == LINEA_MAINNET_AXLUSDC) return 6;
    if (token == OP_MAINNET_AXLUSDC) return 6;
    if (token == POLYGON_MAINNET_AXLUSDC) return 6;

    revert("Unsupported token for getHopCoinDecimals");
}

// ----------------- CCTP V1 ----------------- //

address constant ARBITRUM_MAINNET_TOKEN_MESSENGER = 0x19330d10D9Cc8751218eaf51E8885D058642E08A;
address constant BASE_MAINNET_TOKEN_MESSENGER = 0x1682Ae6375C4E4A97e4B583BC394c861A46D8962;
address constant ETH_MAINNET_TOKEN_MESSENGER = 0xBd3fa81B58Ba92a82136038B25aDec7066af3155;
address constant OP_MAINNET_TOKEN_MESSENGER = 0x2B4069517957735bE00ceE0fadAE88a26365528f;
address constant POLYGON_MAINNET_TOKEN_MESSENGER = 0x9daF8c91AEFAE50b9c0E69629D3F6Ca40cA3B3FE;

// Retrieve the token messenger address for a given chainId.
function _getTokenMessengerAddress(uint256 chainId) pure returns (address) {
    // Mainnets
    if (chainId == ARBITRUM_MAINNET) return ARBITRUM_MAINNET_TOKEN_MESSENGER;
    if (chainId == BASE_MAINNET) return BASE_MAINNET_TOKEN_MESSENGER;
    if (chainId == ETH_MAINNET) return ETH_MAINNET_TOKEN_MESSENGER;
    if (chainId == OP_MAINNET) return OP_MAINNET_TOKEN_MESSENGER;
    if (chainId == POLYGON_MAINNET) return POLYGON_MAINNET_TOKEN_MESSENGER;

    revert("Unsupported chainId for CCTP token messenger");
}

address constant ARBITRUM_MAINNET_TOKEN_MINTER = 0xE7Ed1fa7f45D05C508232aa32649D89b73b8bA48;
address constant BASE_MAINNET_TOKEN_MINTER = 0xe45B133ddc64bE80252b0e9c75A8E74EF280eEd6;
address constant ETH_MAINNET_TOKEN_MINTER = 0xc4922d64a24675E16e1586e3e3Aa56C06fABe907;
address constant OP_MAINNET_TOKEN_MINTER = 0x33E76C5C31cb928dc6FE6487AB3b2C0769B1A1e3;
address constant POLYGON_MAINNET_TOKEN_MINTER = 0x10f7835F827D6Cf035115E10c50A853d7FB2D2EC;

// Retrieve the token messenger address for a given chainId.
function _getTokenMinterAddress(uint256 chainId) pure returns (address) {
    // Mainnets
    if (chainId == ARBITRUM_MAINNET) return ARBITRUM_MAINNET_TOKEN_MINTER;
    if (chainId == BASE_MAINNET) return BASE_MAINNET_TOKEN_MINTER;
    if (chainId == ETH_MAINNET) return ETH_MAINNET_TOKEN_MINTER;
    if (chainId == OP_MAINNET) return OP_MAINNET_TOKEN_MINTER;
    if (chainId == POLYGON_MAINNET) return POLYGON_MAINNET_TOKEN_MINTER;

    revert("Unsupported chainId for CCTP token minter");
}

// ----------------- CCTP V2 ----------------- //

// Token messenger V2 is the same on all chains.
address constant TOKEN_MESSENGER_V2 = 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d;

function _getTokenMessengerV2Address(uint256 chainId) pure returns (address) {
    if (chainId == ARBITRUM_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == BASE_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == ETH_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == HYPEREVM_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == LINEA_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == MONAD_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == OP_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == POLYGON_MAINNET) return TOKEN_MESSENGER_V2;
    if (chainId == WORLDCHAIN_MAINNET) return TOKEN_MESSENGER_V2;

    revert("Unsupported chainId for CCTP token messenger V2");
}

// Token minter V2 is the same on all chains.
address constant TOKEN_MINTER_V2 = 0xfd78EE919681417d192449715b2594ab58f5D002;

function _getTokenMinterV2Address(uint256 chainId) pure returns (address) {
    if (chainId == ARBITRUM_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == BASE_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == ETH_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == HYPEREVM_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == LINEA_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == MONAD_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == OP_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == POLYGON_MAINNET) return TOKEN_MINTER_V2;
    if (chainId == WORLDCHAIN_MAINNET) return TOKEN_MINTER_V2;

    revert("Unsupported chainId for CCTP token minter V2");
}

// ----------------- Across ----------------- //

address constant ARBITRUM_MAINNET_SPOKE_POOL = 0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A;
address constant BASE_MAINNET_SPOKE_POOL = 0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64;
address constant ETH_MAINNET_SPOKE_POOL = 0x5c7BCd6E7De5423a257D81B442095A1a6ced35C5;
address constant LINEA_MAINNET_SPOKE_POOL = 0x7E63A5f1a8F0B4d0934B2f2327DAED3F6bb2ee75;
address constant OP_MAINNET_SPOKE_POOL = 0x6f26Bf09B1C792e3228e5467807a900A503c0281;
address constant POLYGON_MAINNET_SPOKE_POOL = 0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096;
address constant SCROLL_MAINNET_SPOKE_POOL = 0x3baD7AD0728f9917d1Bf08af5782dCbD516cDd96;
address constant WORLDCHAIN_MAINNET_SPOKE_POOL = 0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64;

function _getSpokePoolAddress(uint256 chainId) pure returns (address) {
    // Mainnets
    if (chainId == ARBITRUM_MAINNET) return ARBITRUM_MAINNET_SPOKE_POOL;
    if (chainId == BASE_MAINNET) return BASE_MAINNET_SPOKE_POOL;
    if (chainId == ETH_MAINNET) return ETH_MAINNET_SPOKE_POOL;
    if (chainId == LINEA_MAINNET) return LINEA_MAINNET_SPOKE_POOL;
    if (chainId == OP_MAINNET) return OP_MAINNET_SPOKE_POOL;
    if (chainId == POLYGON_MAINNET) return POLYGON_MAINNET_SPOKE_POOL;
    if (chainId == SCROLL_MAINNET) return SCROLL_MAINNET_SPOKE_POOL;
    if (chainId == WORLDCHAIN_MAINNET) return WORLDCHAIN_MAINNET_SPOKE_POOL;

    revert("Unsupported chainID for Across spoke pool");
}

// ----------------- Axelar ----------------- //

address constant ARBITRUM_MAINNET_AXELAR_GATEWAY = 0xe432150cce91c13a887f7D836923d5597adD8E31;
address constant BASE_MAINNET_AXELAR_GATEWAY = 0xe432150cce91c13a887f7D836923d5597adD8E31;
address constant BSC_MAINNET_AXELAR_GATEWAY = 0x304acf330bbE08d1e512eefaa92F6a57871fD895;
address constant CELO_MAINNET_AXELAR_GATEWAY = 0xe432150cce91c13a887f7D836923d5597adD8E31;
address constant ETH_MAINNET_AXELAR_GATEWAY = 0x4F4495243837681061C4743b74B3eEdf548D56A5;
address constant LINEA_MAINNET_AXELAR_GATEWAY = 0xe432150cce91c13a887f7D836923d5597adD8E31;
address constant OP_MAINNET_AXELAR_GATEWAY = 0xe432150cce91c13a887f7D836923d5597adD8E31;
address constant POLYGON_MAINNET_AXELAR_GATEWAY = 0x6f015F16De9fC8791b234eF68D486d2bF203FBA8;

function _getAxelarGatewayAddress(uint256 chainId) pure returns (address) {
    if (chainId == ARBITRUM_MAINNET) return ARBITRUM_MAINNET_AXELAR_GATEWAY;
    if (chainId == BASE_MAINNET) return BASE_MAINNET_AXELAR_GATEWAY;
    if (chainId == BSC_MAINNET) return BSC_MAINNET_AXELAR_GATEWAY;
    if (chainId == CELO_MAINNET) return CELO_MAINNET_AXELAR_GATEWAY;
    if (chainId == ETH_MAINNET) return ETH_MAINNET_AXELAR_GATEWAY;
    if (chainId == LINEA_MAINNET) return LINEA_MAINNET_AXELAR_GATEWAY;
    if (chainId == OP_MAINNET) return OP_MAINNET_AXELAR_GATEWAY;
    if (chainId == POLYGON_MAINNET) return POLYGON_MAINNET_AXELAR_GATEWAY;

    revert("Unsupported chainID for Axelar gateway");
}

address constant ARBITRUM_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant BASE_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant BSC_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant CELO_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant ETH_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant LINEA_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant OP_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;
address constant POLYGON_MAINNET_AXELAR_GAS_SERVICE = 0x2d5d7d31F671F86C782533cc367F14109a082712;

function _getAxelarGasServiceAddress(uint256 chainId) pure returns (address) {
    if (chainId == ARBITRUM_MAINNET) return ARBITRUM_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == BASE_MAINNET) return BASE_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == BSC_MAINNET) return BSC_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == CELO_MAINNET) return CELO_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == ETH_MAINNET) return ETH_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == LINEA_MAINNET) return LINEA_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == OP_MAINNET) return OP_MAINNET_AXELAR_GAS_SERVICE;
    if (chainId == POLYGON_MAINNET) return POLYGON_MAINNET_AXELAR_GAS_SERVICE;

    revert("Unsupported chainID for Axelar gas service");
}

// ----------------- Hypercore ----------------- //

// CoreDepositWallet for depositing tokens from HyperEVM to Hypercore
// https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/hypercore-less-than-greater-than-hyperevm
address constant HYPEREVM_MAINNET_CORE_DEPOSIT_WALLET = 0x6B9E773128f453f5c2C60935Ee2DE2CBc5390A24;

// ----------------- Deployment ----------------- //

// Deployed from commit hash 1f545cb93015444ab193629c7791e2a58c541c4c
CREATE3Factory constant CREATE3 = CREATE3Factory(
    0x37922885311Bc9d18E136e4FE6654409d3F45FFd
);
