import { useEffect } from "react";
import { useAccount } from "wagmi";
import { ROUTES } from "../../constants/routes";
import { usePayContext } from "../../hooks/usePayContext";
import { CustomTheme, Languages, Mode, Theme } from "../../types";
import Modal from "../Common/Modal";

import About from "../Pages/About";
import Connectors from "../Pages/Connectors";
import DownloadApp from "../Pages/DownloadApp";
import MobileConnectors from "../Pages/MobileConnectors";
import Onboarding from "../Pages/Onboarding";
import SwitchNetworks from "../Pages/SwitchNetworks";
import ConnectUsing from "./ConnectUsing";

import { assert, ExternalPaymentOptions } from "@daimo/pay-common";
import { useWallet } from "@solana/wallet-adapter-react";
import { getAppName } from "../../defaultConfig";
import { useChainIsSupported } from "../../hooks/useChainIsSupported";
import { DaimoPayThemeProvider } from "../DaimoPayThemeProvider/DaimoPayThemeProvider";
import Confirmation from "../Pages/Confirmation";
import PayWithToken from "../Pages/PayWithToken";
import SelectAmount from "../Pages/SelectAmount";
import SelectDepositAddressAmount from "../Pages/SelectDepositAddressAmount";
import SelectDepositAddressChain from "../Pages/SelectDepositAddressChain";
import SelectExternalAmount from "../Pages/SelectExternalAmount";
import SelectMethod from "../Pages/SelectMethod";
import SelectToken from "../Pages/SelectToken";
import ConnectorSolana from "../Pages/Solana/ConnectorSolana";
import ConnectSolana from "../Pages/Solana/ConnectSolana";
import PayWithSolanaToken from "../Pages/Solana/PayWithSolanaToken";
import SelectSolanaAmount from "../Pages/Solana/SelectSolanaAmount";
import SelectSolanaToken from "../Pages/Solana/SelectSolanaToken";
import WaitingDepositAddress from "../Pages/WaitingDepositAddress";
import WaitingExternal from "../Pages/WaitingExternal";
const customThemeDefault: object = {};

export const DaimoPayModal: React.FC<{
  mode?: Mode;
  theme?: Theme;
  customTheme?: CustomTheme;
  lang?: Languages;
}> = ({
  mode = "auto",
  theme = "auto",
  customTheme = customThemeDefault,
  lang = "en-US",
}) => {
  const context = usePayContext();
  const paymentState = context.paymentState;
  const {
    payParams,
    generatePreviewOrder,
    isDepositFlow,
    setPaymentWaitingMessage,
    setSelectedExternalOption,
    setSelectedTokenOption,
    setSelectedSolanaTokenOption,
    setSelectedDepositAddressOption,
  } = paymentState;

  const {
    isConnected: isEthConnected,
    connector,
    chain,
    address,
  } = useAccount();
  const { connected: isSolanaConnected } = useWallet();
  const { daimoPayOrder } = paymentState;
  const paymentOptions = daimoPayOrder?.metadata.payer?.paymentOptions;
  // Solana payment option
  // Include by default if paymentOptions not provided
  const includeSolana =
    paymentOptions == null ||
    paymentOptions.includes(ExternalPaymentOptions.Solana);
  const chainIsSupported = useChainIsSupported(chain?.id);

  //if chain is unsupported we enforce a "switch chain" prompt
  const closeable = !(
    context.options?.enforceSupportedChains &&
    isEthConnected &&
    !chainIsSupported
  );

  const showBackButton =
    closeable &&
    context.route !== ROUTES.SELECT_METHOD &&
    context.route !== ROUTES.CONFIRMATION &&
    context.route !== ROUTES.SELECT_TOKEN &&
    context.route !== ROUTES.SOLANA_SELECT_TOKEN;

  const onBack = () => {
    const meta = { event: "click-back" };
    if (context.route === ROUTES.DOWNLOAD) {
      context.setRoute(ROUTES.CONNECT, meta);
    } else if (context.route === ROUTES.CONNECTORS) {
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_AMOUNT) {
      setSelectedTokenOption(undefined);
      context.setRoute(ROUTES.SELECT_TOKEN, meta);
    } else if (context.route === ROUTES.SELECT_EXTERNAL_AMOUNT) {
      setSelectedExternalOption(undefined);
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    } else if (context.route === ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT) {
      setSelectedDepositAddressOption(undefined);
      context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
    } else if (context.route === ROUTES.WAITING_EXTERNAL) {
      setPaymentWaitingMessage(undefined);
      if (isDepositFlow) {
        assert(
          payParams != null,
          "[PAY MODAL] payParams cannot be null in deposit flow",
        );
        generatePreviewOrder(payParams);
        context.setRoute(ROUTES.SELECT_EXTERNAL_AMOUNT, meta);
      } else {
        setSelectedExternalOption(undefined);
        context.setRoute(ROUTES.SELECT_METHOD, meta);
      }
    } else if (context.route === ROUTES.PAY_WITH_TOKEN) {
      if (isDepositFlow) {
        assert(
          payParams != null,
          "[PAY MODAL] payParams cannot be null in deposit flow",
        );
        generatePreviewOrder(payParams);
        context.setRoute(ROUTES.SELECT_AMOUNT, meta);
      } else {
        setSelectedTokenOption(undefined);
        context.setRoute(ROUTES.SELECT_TOKEN, meta);
      }
    } else if (context.route === ROUTES.ONBOARDING) {
      context.setRoute(ROUTES.CONNECTORS, meta);
    } else if (context.route === ROUTES.WAITING_DEPOSIT_ADDRESS) {
      if (isDepositFlow) {
        assert(
          payParams != null,
          "[PAY MODAL] payParams cannot be null in deposit flow",
        );
        generatePreviewOrder(payParams);
        context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT, meta);
      } else {
        setSelectedDepositAddressOption(undefined);
        context.setRoute(ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN, meta);
      }
    } else if (context.route === ROUTES.SOLANA_SELECT_AMOUNT) {
      setSelectedSolanaTokenOption(undefined);
      context.setRoute(ROUTES.SOLANA_SELECT_TOKEN, meta);
    } else if (context.route === ROUTES.SOLANA_PAY_WITH_TOKEN) {
      if (isDepositFlow) {
        assert(
          payParams != null,
          "[PAY MODAL] payParams cannot be null in deposit flow",
        );
        generatePreviewOrder(payParams);
        context.setRoute(ROUTES.SOLANA_SELECT_AMOUNT, meta);
      } else {
        setSelectedSolanaTokenOption(undefined);
        context.setRoute(ROUTES.SOLANA_SELECT_TOKEN, meta);
      }
    } else {
      context.setRoute(ROUTES.SELECT_METHOD, meta);
    }
  };

  const pages: Record<ROUTES, React.ReactNode> = {
    [ROUTES.SELECT_METHOD]: <SelectMethod />,
    [ROUTES.SELECT_TOKEN]: <SelectToken />,
    [ROUTES.SELECT_AMOUNT]: <SelectAmount />,
    [ROUTES.SELECT_EXTERNAL_AMOUNT]: <SelectExternalAmount />,
    [ROUTES.SELECT_DEPOSIT_ADDRESS_AMOUNT]: <SelectDepositAddressAmount />,
    [ROUTES.WAITING_EXTERNAL]: <WaitingExternal />,
    [ROUTES.SELECT_DEPOSIT_ADDRESS_CHAIN]: <SelectDepositAddressChain />,
    [ROUTES.WAITING_DEPOSIT_ADDRESS]: <WaitingDepositAddress />,
    [ROUTES.CONFIRMATION]: <Confirmation />,
    [ROUTES.PAY_WITH_TOKEN]: <PayWithToken />,
    [ROUTES.SOLANA_CONNECT]: <ConnectSolana />,
    [ROUTES.SOLANA_CONNECTOR]: <ConnectorSolana />,
    [ROUTES.SOLANA_SELECT_TOKEN]: <SelectSolanaToken />,
    [ROUTES.SOLANA_SELECT_AMOUNT]: <SelectSolanaAmount />,
    [ROUTES.SOLANA_PAY_WITH_TOKEN]: <PayWithSolanaToken />,
    // Unused routes. Kept to minimize connectkit merge conflicts.
    [ROUTES.ONBOARDING]: <Onboarding />,
    [ROUTES.ABOUT]: <About />,
    [ROUTES.DOWNLOAD]: <DownloadApp />,
    [ROUTES.CONNECTORS]: <Connectors />,
    [ROUTES.MOBILECONNECTORS]: <MobileConnectors />,
    [ROUTES.CONNECT]: <ConnectUsing />,
    [ROUTES.SWITCHNETWORKS]: <SwitchNetworks />,
  };

  function hide() {
    if (isDepositFlow) {
      assert(
        payParams != null,
        "[PAY MODAL] payParams cannot be null in deposit flow",
      );
      generatePreviewOrder(payParams);
    }
    context.setOpen(false, { event: "click-close" });
  }

  // Separate effect for initial route when modal opens
  useEffect(() => {
    if (
      context.open &&
      !isSolanaConnected &&
      (context.wcWallet || isEthConnected)
    ) {
      // Only set initial route if we're at SELECT_METHOD when opening
      if (context.route === ROUTES.SELECT_METHOD) {
        context.setRoute(ROUTES.SELECT_TOKEN, {
          event: "eth_connected_on_open",
          walletId: connector?.id,
          chainId: chain?.id,
          address,
        });
      }
    } else if (
      context.open &&
      isSolanaConnected &&
      !isEthConnected &&
      context.wcWallet === undefined &&
      includeSolana
    ) {
      if (context.route === ROUTES.SELECT_METHOD) {
        context.setRoute(ROUTES.SOLANA_SELECT_TOKEN, {
          event: "solana_connected_on_open",
        });
      }
    }
    // If both are connected, do nothing and stay on SELECT_METHOD
  }, [context.open]);

  useEffect(() => {
    if (
      context.route === ROUTES.CONNECT ||
      context.route === ROUTES.CONNECTORS ||
      context.route === ROUTES.MOBILECONNECTORS
    ) {
      if (isEthConnected) {
        context.setRoute(ROUTES.SELECT_TOKEN, {
          event: "connected",
          walletId: connector?.id,
          chainId: chain?.id,
          address,
        });
      }
    }
  }, [isEthConnected, context.route]);

  useEffect(() => context.setMode(mode), [mode]);
  useEffect(() => context.setTheme(theme), [theme]);
  useEffect(() => context.setCustomTheme(customTheme), [customTheme]);
  useEffect(() => context.setLang(lang), [lang]);

  /* When pulling data into WalletConnect, it prioritises the og:title tag over the title tag */
  useEffect(() => {
    const appName = getAppName();
    if (!appName || !context.open) return;

    const title = document.createElement("meta");
    title.setAttribute("property", "og:title");
    title.setAttribute("content", appName);
    document.head.prepend(title);

    /*
    // TODO:  When pulling data into WalletConnect, figure out which icon gets used and replace with appIcon if available 
    const appIcon = getAppIcon();
    const icon = document.createElement('link');
    if (appIcon) {
      icon.setAttribute('rel', 'icon');
      icon.setAttribute('href', appIcon);
      document.head.prepend(icon);
    }*/

    return () => {
      try {
        document.head.removeChild(title);
      } catch {}
      //if (appIcon) document.head.removeChild(icon);
    };
  }, [context.open]);

  return (
    <DaimoPayThemeProvider theme={theme} customTheme={customTheme} mode={mode}>
      <Modal
        open={context.open}
        pages={pages}
        pageId={context.route}
        onClose={closeable ? hide : undefined}
        onInfo={undefined}
        onBack={showBackButton ? onBack : undefined}
      />
    </DaimoPayThemeProvider>
  );
};
