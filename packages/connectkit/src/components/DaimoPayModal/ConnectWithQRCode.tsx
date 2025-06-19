import React from "react";
import { ROUTES } from "../../constants/routes";
import { usePayContext } from "../../hooks/usePayContext";

import { OrDivider } from "../Common/Modal";
import { ModalContent, PageContent } from "../Common/Modal/styles";

import ScanIconWithLogos from "../../assets/ScanIconWithLogos";
import { useDaimoPay } from "../../hooks/useDaimoPay";
import useLocales from "../../hooks/useLocales";
import Button from "../Common/Button";
import CopyToClipboard from "../Common/CopyToClipboard";
import CustomQRCode from "../Common/CustomQRCode";

import { writeDaimoPayOrderID } from "@daimo/pay-common";
import MobileWithLogos from "../../assets/MobileWithLogos";
import { useWallet } from "../../wallets/useWallets";

const ConnectWithQRCode: React.FC<{}> = () => {
  const context = usePayContext();
  const { pendingConnectorId } = context;
  const wallet = useWallet(pendingConnectorId ?? "");
  const pay = useDaimoPay();

  const locales = useLocales({
    CONNECTORNAME: wallet?.name,
  });

  if (!wallet) return <>Wallet not found {pendingConnectorId}</>;

  const downloads = wallet?.downloadUrls;
  const hasApps = downloads && Object.keys(downloads).length !== 0;
  const showAdditionalOptions = false;
  const payId = pay.order ? writeDaimoPayOrderID(pay.order.id) : "";

  return (
    <PageContent>
      <ModalContent style={{ paddingBottom: 8, gap: 14 }}>
        <CustomQRCode
          value={`https://pay.daimo.com/pay?id=${payId}`}
          image={
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
          }
          tooltipMessage={
            wallet?.id === "Mobile Wallets" ? (
              <>
                <ScanIconWithLogos />
                <span>
                  Finish the payment <br />
                  on your mobile phone
                </span>
              </>
            ) : (
              <>
                <ScanIconWithLogos logo={wallet?.icon} />
                <span>{locales.scanScreen_tooltip_default}</span>
              </>
            )
          }
        />
        {showAdditionalOptions ? (
          <OrDivider />
        ) : (
          hasApps && <OrDivider>{locales.dontHaveTheApp}</OrDivider>
        )}
      </ModalContent>

      {showAdditionalOptions && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <CopyToClipboard variant="button" string={""}>
            {locales.copyToClipboard}
          </CopyToClipboard>
        </div>
      )}

      {hasApps && (
        <>
          <Button
            onClick={() => {
              context.setRoute(ROUTES.DOWNLOAD);
            }}
            download
          >
            {locales.getWalletName}
          </Button>
        </>
      )}
    </PageContent>
  );
};

export default ConnectWithQRCode;
