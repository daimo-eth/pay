import Logos from "../assets/logos";

/**
 * EIP-6963: Multi Injected Provider Discovery
 * https://eips.ethereum.org/EIPS/eip-6963
 *
 */
export type WalletConfigProps = {
  // Wallets name
  name?: string;
  // Wallets short name. Defaults to `name`
  shortName?: string;
  // Icon to display in the modal
  icon?: string | React.ReactNode;
  // Icon to use on the wallet list button. If not provided, `icon` will be used
  iconConnector?: React.ReactNode;
  // Defaults to `'circle'`, but some icons look better as squircle (e.g. if they have a background)
  iconShape?: "squircle" | "circle" | "square";
  // Defaults to `false`, but some icons don't have a background and look better if they shrink to fit the container
  iconShouldShrink?: boolean;
  // Links to download the wallet
  downloadUrls?: {
    // Download redirect, hosted by Family.co
    // This URL redirects to the correct download URL based on the user's device
    // Note: this will eventually be automated by the below data
    download?: string;
    // wallet's website
    website?: string;
    // app downloads
    desktop?: string;
    android?: string;
    ios?: string;
    // browser extensions
    chrome?: string;
    firefox?: string;
    brave?: string;
    edge?: string;
    safari?: string;
  };
  // Create URI for QR code, where uri is encoded data from WalletConnect
  getWalletConnectDeeplink?: (uri: string) => string;
  walletDeepLink?: string;
  shouldDeeplinkDesktop?: boolean;
  showInMobileConnectors: boolean;
};

// Organised in alphabetical order by key
export const walletConfigs: {
  [rdns: string]: WalletConfigProps; // for multiple cases seperate rdns by comma
} = {
  //TODO: update new wallet configs
  Zeal: {
    name: "Zeal",
    showInMobileConnectors: false,
  },
  Uniswap: {
    name: "Uniswap Wallet",
    shortName: "Uniswap",
    showInMobileConnectors: false,
  },
  Bitget: {
    name: "Bitget",
    shortName: "Bitget",
    showInMobileConnectors: false,
  },
  OKX: {
    name: "OKX",
    shortName: "OKX",
    showInMobileConnectors: false,
  },
  mock: {
    icon: <Logos.Mock />,
    showInMobileConnectors: false,
  },
  argent: {
    name: "Argent",
    icon: <Logos.Argent />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/argent",
      android:
        "https://play.google.com/store/apps/details?id=im.argent.contractwalletclient",
      ios: "https://apps.apple.com/app/argent/id1358741926",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://argent.link/app/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  "coinbaseWallet, coinbaseWalletSDK": {
    name: "Coinbase Wallet",
    shortName: "Coinbase",
    icon: <Logos.Coinbase background />,
    iconShape: "squircle",
    downloadUrls: {
      download: "https://connect.family.co/v0/download/coinbasewallet",
      website: "https://www.coinbase.com/wallet/getting-started-extension",
      android: "https://play.google.com/store/apps/details?id=org.toshi",
      ios: "https://apps.apple.com/app/coinbase-wallet-store-crypto/id1278383455",
      chrome:
        "https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  "com.coinbase.wallet": {
    name: "Coinbase Wallet",
    shortName: "Coinbase",
    icon: <Logos.Coinbase background />,
    iconShape: "circle",
    downloadUrls: {
      download: "https://connect.family.co/v0/download/coinbasewallet",
      website: "https://www.coinbase.com/wallet/getting-started-extension",
      android: "https://play.google.com/store/apps/details?id=org.toshi",
      ios: "https://apps.apple.com/app/coinbase-wallet-store-crypto/id1278383455",
      chrome:
        "https://chrome.google.com/webstore/detail/coinbase-wallet-extension/hnfanknocfeofbddgcijnmhnfnkdnaad",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://go.cb-w.com/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  "com.crypto.wallet": {
    name: "Crypto.com",
    shortName: "Crypto",
    showInMobileConnectors: false,
  },
  dawn: {
    name: "Dawn Wallet",
    shortName: "Dawn",
    downloadUrls: {
      download:
        "https://apps.apple.com/us/app/dawn-ethereum-wallet/id1673143782",
      website: "https://www.dawnwallet.xyz/",
      ios: "https://apps.apple.com/us/app/dawn-ethereum-wallet/id1673143782",
    },
    showInMobileConnectors: false,
  },
  "co.family.wallet": {
    name: "Family",
    shortName: "Family",
    icon: <Logos.Family />,
    iconShape: "squircle",
    downloadUrls: {
      download: "https://connect.family.co/v0/download/family",
      website: "https://family.co",
      ios: "https://family.co/download",
    },
    getWalletConnectDeeplink: (uri: string) => {
      return `familywallet://wc?uri=${encodeURIComponent(uri)}`;
    },
    walletDeepLink: "familywallet://",
    showInMobileConnectors: true,
  },
  frame: {
    name: "Frame",
    icon: <Logos.Frame />,
    iconShouldShrink: true,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/frame",
      website: "https://frame.sh",
      chrome:
        "https://chrome.google.com/webstore/detail/frame-companion/ldcoohedfbjoobcadoglnnmmfbdlmmhf",
      firefox: "https://addons.mozilla.org/en-US/firefox/addon/frame-extension",
      brave:
        "https://chrome.google.com/webstore/detail/frame-companion/ldcoohedfbjoobcadoglnnmmfbdlmmhf",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => uri,
  },
  frontier: {
    name: "Frontier Wallet",
    shortName: "Frontier",
    icon: <Logos.Frontier />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/frontier",
      ios: "https://apps.apple.com/app/frontier-crypto-defi-wallet/id1482380988",
      android:
        "https://play.google.com/store/apps/details?id=com.frontierwallet",
      website: "https://frontier.xyz/",
      chrome:
        "https://chrome.google.com/webstore/detail/frontier-wallet/kppfdiipphfccemcignhifpjkapfbihd",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `frontier://wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  injected: {
    name: "Browser Wallet",
    shortName: "Browser",
    icon: <Logos.Injected />,
    showInMobileConnectors: false,
  },
  "metaMask, metaMask-io, io.metamask, io.metamask.mobile, metaMaskSDK": {
    name: "MetaMask",
    icon: <Logos.MetaMask />,
    iconConnector: <Logos.MetaMask />,
    iconShouldShrink: true,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/metamask",
      website: "https://metamask.io/download/",
      android: "https://play.google.com/store/apps/details?id=io.metamask",
      ios: "https://apps.apple.com/app/metamask/id1438144202",
      chrome:
        "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
      firefox: "https://addons.mozilla.org/firefox/addon/ether-metamask/",
      brave:
        "https://chrome.google.com/webstore/detail/metamask/nkbihfbeogaeaoehlefnkodbefgpgknn",
      edge: "https://microsoftedge.microsoft.com/addons/detail/metamask/ejbalbakoplchlghecdalmeeeajnimhm",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://metamask.app.link/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  "app.phantom": {
    name: "Phantom",
    iconShape: "squircle",
    showInMobileConnectors: false,
  },
  "me.rainbow": {
    name: "Rainbow Wallet",
    shortName: "Rainbow",
    icon: <Logos.Rainbow />,
    iconShape: "squircle",
    downloadUrls: {
      download: "https://connect.family.co/v0/download/rainbow",
      website: "https://rainbow.me/?utm_source=daimopay",
      android:
        "https://play.google.com/store/apps/details?id=me.rainbow&referrer=utm_source%3Ddaimopay&utm_source=daimopay",
      ios: "https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021?pt=119997837&ct=daimopay&mt=8",
      chrome: "https://rainbow.me/extension?utm_source=daimopay",
      edge: "https://rainbow.me/extension?utm_source=daimopay",
      brave: "https://rainbow.me/extension?utm_source=daimopay",
    },
    showInMobileConnectors: true,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://rnbwapp.com/wc?uri=${encodeURIComponent(
        uri,
      )}&connector=daimopay`;
    },
  },
  "io.rabby": {
    name: "Rabby Wallet",
    shortName: "Rabby",
    downloadUrls: {
      website: "https://rabby.io",
      chrome:
        "https://chrome.google.com/webstore/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch",
    },
    showInMobileConnectors: false,
  },
  safe: {
    name: "Safe",
    icon: <Logos.Safe />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/safe",
      website: "https://safe.global/",
      ios: "https://apps.apple.com/app/id1515759131",
      android: "https://play.google.com/store/apps/details?id=io.gnosis.safe",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://gnosis-safe.io/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  "xyz.talisman": {
    name: "Talisman",
    shortName: "Talisman",
    iconShape: "squircle",
    downloadUrls: {
      download: "https://talisman.xyz/download",
      website: "https://talisman.xyz",
      chrome:
        "https://chrome.google.com/webstore/detail/talisman-polkadot-wallet/fijngjgcjhjmmpcmkeiomlglpeiijkld",
      firefox:
        "https://addons.mozilla.org/en-US/firefox/addon/talisman-wallet-extension/",
    },
    showInMobileConnectors: false,
  },
  "com.trustwallet.app": {
    name: "Trust Wallet",
    shortName: "Trust",
    icon: <Logos.Trust />,
    iconShouldShrink: true,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/trust",
      android:
        "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
      ios: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink(uri) {
      return `https://link.trustwallet.com/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  infinityWallet: {
    name: "Infinity Wallet",
    icon: <Logos.InfinityWallet />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/infinityWallet",
      website: "https://infinitywallet.io/download",
      chrome: "https://infinitywallet.io/download",
      firefox: "https://infinitywallet.io/download",
      brave: "https://infinitywallet.io/download",
      edge: "https://infinitywallet.io/download",
    },
    showInMobileConnectors: false,
  },
  imToken: {
    name: "imToken",
    icon: <Logos.ImToken />,
    downloadUrls: {
      //website: 'https://support.token.im/hc/en-us/categories/360000925393',
      download: "https://connect.family.co/v0/download/imToken",
      android: "https://play.google.com/store/apps/details?id=im.token.app",
      ios: "https://itunes.apple.com/us/app/imtoken2/id1384798940",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `imtokenv2://wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  unstoppable: {
    name: "Unstoppable",
    icon: <Logos.Unstoppable />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/unstoppable",
      ios: "https://apps.apple.com/app/bank-bitcoin-wallet/id1447619907",
      android:
        "https://play.google.com/store/apps/details?id=io.horizontalsystems.bankwallet",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://unstoppable.money/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  onto: {
    name: "ONTO",
    icon: <Logos.ONTO />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/onto",
      ios: "https://apps.apple.com/app/onto-an-ontology-dapp/id1436009823",
      android:
        "https://play.google.com/store/apps/details?id=com.github.ontio.onto",
      website: "https://onto.app/en/download/",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://onto.app/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  steak: {
    name: "Steak",
    icon: <Logos.Steak />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/steak",
      android:
        "https://play.google.com/store/apps/details?id=fi.steakwallet.app",
      ios: "https://apps.apple.com/app/steakwallet/id1569375204",
      website: "https://steakwallet.fi/download",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://links.steakwallet.fi/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  ledger: {
    name: "Ledger Live",
    shortName: "Ledger",
    icon: <Logos.Ledger />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/ledger",
      website: "https://www.ledger.com/ledger-live/download#download-device-2",
      android: "https://play.google.com/store/apps/details?id=com.ledger.live",
      ios: "https://apps.apple.com/app/ledger-live-web3-wallet/id1361671700",
    },
    showInMobileConnectors: true,
    getWalletConnectDeeplink: (uri: string) => {
      return `ledgerlive://wc?uri=${encodeURIComponent(uri)}`;
    },
    shouldDeeplinkDesktop: true,
  },
  zerion: {
    name: "Zerion",
    icon: <Logos.Zerion />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/zerion",
      ios: "https://apps.apple.com/app/apple-store/id1456732565",
      android:
        "https://play.google.com/store/apps/details?id=io.zerion.android",
      website: "https://zerion.io/",
    },
    getWalletConnectDeeplink: (uri: string) => {
      return `https://app.zerion.io/wc?uri=${encodeURIComponent(uri)}`;
    },
    showInMobileConnectors: true,
  },
  slope: {
    name: "Slope",
    icon: <Logos.Slope />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/slope",
      ios: "https://apps.apple.com/app/slope-wallet/id1574624530",
      android: "https://play.google.com/store/apps/details?id=com.wd.wallet",
      chrome:
        "https://chrome.google.com/webstore/detail/slope-wallet/pocmplpaccanhmnllbbkpgfliimjljgo",
      website: "https://slope.finance/",
    },
    showInMobileConnectors: false,
    getWalletConnectDeeplink: (uri: string) => {
      return `https://slope.finance/app/wc?uri=${encodeURIComponent(uri)}`;
    },
  },
  tokenPocket: {
    name: "TokenPocket Wallet",
    icon: <Logos.TokenPocket />,
    downloadUrls: {
      website: "https://www.tokenpocket.pro/en/download/app",
      download: "https://www.tokenpocket.pro/en/download/app",
      android:
        "https://play.google.com/store/apps/details?id=vip.mytokenpocket",
      ios: "https://apps.apple.com/us/app/tp-global-wallet/id6444625622",
      chrome:
        "https://chrome.google.com/webstore/detail/tokenpocket/mfgccjchihfkkindfppnaooecgfneiii",
    },
    showInMobileConnectors: false,
  },
  talisman: {
    name: "Talisman",
    icon: <Logos.Talisman />,
    downloadUrls: {
      download: "https://talisman.xyz/download",
      website: "https://talisman.xyz",
      chrome:
        "https://chrome.google.com/webstore/detail/talisman-polkadot-wallet/fijngjgcjhjmmpcmkeiomlglpeiijkld",
      firefox:
        "https://addons.mozilla.org/en-US/firefox/addon/talisman-wallet-extension/",
    },
    showInMobileConnectors: false,
  },
  walletConnect: {
    name: "Other Wallets",
    shortName: "Other",
    icon: <Logos.WalletConnect background />,
    iconConnector: <Logos.OtherWallets />,
    iconShape: "square",
    getWalletConnectDeeplink: (uri: string) => uri,
    showInMobileConnectors: false,
  },
} as const;
