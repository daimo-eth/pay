import Logos from "../assets/logos";

// Infer in-wallet payment URL from environment.
let daimoPayHost = "https://pay.daimo.com";

export function setInWalletPaymentUrlFromApiUrl(apiUrl: string) {
  if (apiUrl.startsWith("http://localhost")) {
    daimoPayHost = "http://localhost:3001";
  } else if (apiUrl.startsWith("https://pay-api-stage.daimo.xyz")) {
    daimoPayHost = "https://pay.stage.daimo.xyz";
  } else {
    daimoPayHost = "https://pay.daimo.com";
  }
}

function getDaimoPayUrl(payId: string) {
  return daimoPayHost + "/pay?id=" + payId;
}

function getEncodedDaimoPayUrl(payId: string) {
  let url = getDaimoPayUrl(payId);
  let encodedUrl = encodeURIComponent(url);
  return encodedUrl;
}

export type WalletConfigProps = {
  // Wallet ID, eg "io.rabby" or a sentinel value like WALLET_ID_OTHER_WALLET.
  id?: string;
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
  deeplinkScheme?: string;
  // For Daimo Pay deeplinks. Platform parameter: 'android' | 'ios' | 'other'
  getDaimoPayDeeplink?: (payId: string, platform?: string) => string;
  // To sort mobile wallets to show in the connector list
  showInMobileConnectors?: boolean;
  // Show wallet on Android. Defaults to true if not specified.
  showOnAndroid?: boolean;
  // Show wallet on iOS. Defaults to true if not specified.
  showOnIOS?: boolean;
  // Used to filter wallets that only support solana in mobile mode to not show in the connector options when the payID doesn't support solana
  isSolanaOnly?: boolean;
};

// Organised in alphabetical order by key
export const walletConfigs: {
  [rdns: string]: WalletConfigProps; // for multiple cases seperate rdns by comma
} = {
  baseAccount: {
    name: "Base App",
    shortName: "Base",
    icon: <Logos.Base />,
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
    deeplinkScheme: "cbwallet://",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string, platform?: string) => {
      if (platform === "android") {
        return (
          "https://go.cb-w.com/dapp?cb_url=" + getEncodedDaimoPayUrl(payId)
        );
      }
      return "cbwallet://dapp?url=" + getEncodedDaimoPayUrl(payId);
    },
  },
  backpack: {
    name: "Backpack",
    shortName: "Backpack",
    icon: <Logos.Backpack />,
    iconShape: "squircle",
    showInMobileConnectors: true,
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      const url = encodeURIComponent(getDaimoPayUrl(payId));
      return `https://backpack.app/ul/v1/browse/${url}`;
    },
  },
  bitget: {
    name: "Bitget",
    icon: <Logos.Bitget />,
    iconShape: "squircle",
    showInMobileConnectors: true,
    showOnAndroid: true,
    showOnIOS: true,
    deeplinkScheme: "bitkeep://",
    getDaimoPayDeeplink: (payId: string) => {
      return "bitkeep://bkconnect?action=dapp&url=" + getDaimoPayUrl(payId);
    },
  },
  "co.family.wallet": {
    name: "Family",
    shortName: "Family",
    icon: <Logos.Family />,
    iconShape: "squircle",
    showOnAndroid: false,
    showOnIOS: true,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/family",
      website: "https://family.co",
      ios: "https://family.co/download",
    },
    deeplinkScheme: "familywallet://",
    getDaimoPayDeeplink: (payId: string) => {
      return "familywallet://browser?url=" + getDaimoPayUrl(payId);
    },
    showInMobileConnectors: true,
  },
  "metaMask, metaMask-io, io.metamask, io.metamask.mobile, metaMaskSDK": {
    name: "MetaMask",
    shortName: "MetaMask",
    icon: <Logos.MetaMask />,
    iconConnector: <Logos.MetaMask />,
    iconShouldShrink: true,
    showOnAndroid: true,
    showOnIOS: true,
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
    deeplinkScheme: "metamask://",
    getDaimoPayDeeplink: (payId: string) => {
      const daimoPayUrl = getDaimoPayUrl(payId);
      return (
        "https://link.metamask.io/dapp/" + daimoPayUrl.replace("https://", "")
      );
    },
  },
  "app.phantom": {
    name: "Phantom",
    icon: <Logos.Phantom />,
    iconShape: "squircle",
    showInMobileConnectors: true,
    deeplinkScheme: "phantom://",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      const url = encodeURIComponent(getDaimoPayUrl(payId));
      const ref = encodeURIComponent(window.location.origin);
      return `https://phantom.app/ul/browse/${url}?ref=${ref}`;
    },
  },
  // porto: {
  //   name: "Porto",
  //   icon: <Logos.Porto />,
  //   iconShape: "squircle",
  //   showInMobileConnectors: true,
  // },
  farcaster: {
    name: "Farcaster",
    icon: <Logos.Farcaster />,
    iconShape: "squircle",
    // Temporarily hidden from mobile connectors to make room for World wallet.
    // Will re-enable once /pay flow is fixed for Farcaster and we support more mobile wallets.
    showInMobileConnectors: false,
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      return (
        "https://farcaster.xyz/miniapps/sGRsevnRvM9P/daimo-pay/?id=" + payId
      );
    },
  },
  minipay: {
    id: "minipay",
    name: "MiniPay",
    shortName: "MiniPay",
    icon: <Logos.MiniPay />,
    iconConnector: <Logos.MiniPay />,
    iconShape: "squircle",
    showInMobileConnectors: true,
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      return (
        "https://cash.minipay.xyz/browse?url=" +
        encodeURIComponent(getDaimoPayUrl(payId))
      );
    },
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
    deeplinkScheme: "rainbow://",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      return "rainbow://dapp?url=" + getDaimoPayUrl(payId);
    },
  },
  // "io.rabby": {
  //   name: "Rabby Wallet",
  //   shortName: "Rabby",
  //   downloadUrls: {
  //     website: "https://rabby.io",
  //     chrome:
  //       "https://chrome.google.com/webstore/detail/rabby-wallet/acmacodkjbdgmoleebolmdjonilkdbch",
  //   },
  //   showInMobileConnectors: false,
  //   //TODO: add wallet deep link
  //   // edit rabby scheme to deeplink URL: https://github.com/RabbyHub/rabby-mobile/blob/999d60f49c5254e4aa8e6aa8bb80ad46e267845c/apps/mobile/src/LinkingConfig.ts#L25
  // },
  "com.trustwallet.app": {
    name: "Trust Wallet",
    shortName: "Trust",

    icon: <Logos.Trust />,
    iconConnector: <Logos.Trust />,
    downloadUrls: {
      download: "https://connect.family.co/v0/download/trust",
      android:
        "https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp",
      ios: "https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409",
    },
    showInMobileConnectors: false,
    deeplinkScheme: "trust://",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      return "trust://open_url?coin_id=60&url=" + getDaimoPayUrl(payId);
    },
  },
  okx: {
    name: "OKX",
    icon: <Logos.OKX />,
    showInMobileConnectors: true,
    deeplinkScheme: "okx://",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      return "okx://wallet/dapp/url?dappUrl=" + getDaimoPayUrl(payId);
    },
  },
  solflare: {
    name: "Solflare",
    icon: <Logos.Solflare />,
    showInMobileConnectors: true,
    showOnAndroid: true,
    showOnIOS: true,
    deeplinkScheme: "solflare://",
    getDaimoPayDeeplink: (payId: string) => {
      const url = encodeURIComponent(getDaimoPayUrl(payId));
      const ref = encodeURIComponent(window.location.origin);
      return `https://solflare.com/ul/v1/browse/${url}?ref=${ref}`;
    },
    isSolanaOnly: true,
  },
  // ledger: {
  //   name: "Ledger Live",
  //   shortName: "Ledger",
  //   icon: <Logos.Ledger />,
  //   downloadUrls: {
  //     download: "https://connect.family.co/v0/download/ledger",
  //     website: "https://www.ledger.com/ledger-live/download#download-device-2",
  //     android: "https://play.google.com/store/apps/details?id=com.ledger.live",
  //     ios: "https://apps.apple.com/app/ledger-live-web3-wallet/id1361671700",
  //   },
  //   showInMobileConnectors: true,
  //   deeplinkScheme: "ledgerlive://",
  //   // getDaimoPayDeeplink: (payId: string) => {
  //   //   return "ledgerlive://discover/" + daimoPayUrl + payId;
  //   // },
  //   // TODO: Add Daimo Pay to Ledger Live's Discover section https://developers.ledger.com/docs/ledger-live/discover/getting-started
  //   shouldDeeplinkDesktop: true,
  // },
  world: {
    id: "world",
    name: "World",
    shortName: "World",
    icon: <Logos.World />,
    iconConnector: <Logos.World />,
    showInMobileConnectors: true,
    iconShape: "squircle",
    deeplinkScheme: "world",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string) => {
      const path = "/pay?id=" + payId;
      const url =
        "https://worldcoin.org/mini-app?app_id=app_e7d27c5ce2234e00558776f227f791ef&path=" +
        encodeURIComponent(path);
      return url;
    },
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
    showInMobileConnectors: true,
    deeplinkScheme: "zerion://",
    showOnAndroid: true,
    showOnIOS: true,
    getDaimoPayDeeplink: (payId: string, platform?: string) => {
      const payUrl = getDaimoPayUrl(payId);
      if (platform === "android") {
        return "https://link.zerion.io/?url=" + encodeURIComponent(payUrl);
      }
      return "zerion://browser?url=" + payUrl;
    },
  },
} as const;
