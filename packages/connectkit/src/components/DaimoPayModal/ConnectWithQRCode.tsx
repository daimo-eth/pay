import React from "react";
import { usePayContext } from "../../hooks/usePayContext";

import { ModalContent, PageContent } from "../Common/Modal/styles";

import ScanIconWithLogos from "../../assets/ScanIconWithLogos";
import { useDaimoPay } from "../../hooks/useDaimoPay";
import useLocales from "../../hooks/useLocales";
import CustomQRCode from "../Common/CustomQRCode";

import { writeDaimoPayOrderID } from "@daimo/pay-common";
import { SquircleIcon } from "../../assets/logos";
import MobileWithLogos from "../../assets/MobileWithLogos";
import { ROUTES } from "../../constants/routes";
import { WALLET_ID_MOBILE_WALLETS } from "../../constants/wallets";
import useIsMobile from "../../hooks/useIsMobile";
import { useWallet } from "../../wallets/useWallets";
import { OrderHeader } from "../Common/OrderHeader";

/**
 * Continues a Daimo Pay flow in another app.
 * - If the pendingConnectorId is a mobile wallet, deeplink directly into that
 *   wallet. This opens the flow in eg. the Rainbow in-app browser, letting the
 *   user finish the flow in a single app switch instead of multiple.
 * - If the pendingConnectorId is MOBILE_WALLETS_CONNECTOR_ID, then show a QR
 *   that the user can scan from their phone. This opens the flow in eg. mobile
 *   Safari, letting them pick which app they want to use & finish there.
 * - If the pendingConnectorId is a walletConfig, then show a QR that the user can scan
 *   from their phone. This deeplinks into the wallet's checkout page
 */
const ConnectWithQRCode: React.FC<{ externalUrl?: string | null }> = ({
  externalUrl,
}) => {
  const context = usePayContext();
  const { isAndroid, isIOS } = useIsMobile();
  const { pendingConnectorId, paymentState } = context;
  const walletFromConnectors = useWallet(pendingConnectorId ?? "");
  // Fall back to selectedWallet for wallets from walletConfigs (e.g. unique payment options)
  const wallet = walletFromConnectors || paymentState.selectedWallet;
  const externalOption = paymentState.selectedExternalOption;
  const pay = useDaimoPay();

  const locales = useLocales({
    CONNECTORNAME: wallet?.name ?? externalOption?.id,
  });

  if (!wallet && !externalOption)
    return <> No wallet or external option found </>;

  const payId = pay.order ? writeDaimoPayOrderID(pay.order.id) : "";
  const platform = isIOS ? "ios" : isAndroid ? "android" : "other";

  const isDesktopLinkToMobileWallets = wallet?.id === WALLET_ID_MOBILE_WALLETS;
  const walletDeeplink = wallet?.getDaimoPayDeeplink
    ? wallet.getDaimoPayDeeplink(payId, platform)
    : null;

  const url =
    externalUrl ?? // QR code opens eg. Binance
    walletDeeplink ?? // open in wallet
    `https://pay.daimo.com/pay?id=${payId}&mode=browser`; // browser

  // Show order header only for unique payment option scenario
  const isUniquePaymentOption =
    context.uniquePaymentMethodPage === ROUTES.CONNECT ||
    context.uniquePaymentMethodPage === ROUTES.WAITING_EXTERNAL;

  return (
    <PageContent>
      {isUniquePaymentOption && <OrderHeader />}
      <ModalContent style={{ paddingBottom: 8 }}>
        <CustomQRCode
          value={url}
          image={
            externalOption?.logoURI ? (
              <SquircleIcon icon={externalOption.logoURI} alt="Logo" />
            ) : wallet?.id ? (
              wallet.icon
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "22.5%",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "var(--ck-body-background)",
                  transform: "scale(1.3) translateY(5%)",
                  transformOrigin: "center center",
                }}
              >
                <MobileWithLogos />
              </div>
            )
          }
          tooltipMessage={
            isDesktopLinkToMobileWallets ? (
              <>
                <ScanIconWithLogos />
                <span>
                  Finish the payment <br />
                  on your mobile phone
                </span>
              </>
            ) : (
              <>
                <ScanIconWithLogos
                  logo={
                    externalOption?.logoURI ? (
                      <SquircleIcon icon={externalOption.logoURI} alt="Logo" />
                    ) : (
                      wallet?.icon
                    )
                  }
                />
                <span>{locales.scanScreen_tooltip_default}</span>
              </>
            )
          }
        />
      </ModalContent>
    </PageContent>
  );
};

export default ConnectWithQRCode;
