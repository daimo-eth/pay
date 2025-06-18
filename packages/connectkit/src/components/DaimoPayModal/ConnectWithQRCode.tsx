import React from "react";
import { ROUTES } from "../../constants/routes";
import { usePayContext } from "../../hooks/usePayContext";

import { OrDivider } from "../Common/Modal";
import { ModalContent, PageContent } from "../Common/Modal/styles";

import ScanIconWithLogos from "../../assets/ScanIconWithLogos";
import useLocales from "../../hooks/useLocales";
import Button from "../Common/Button";
import CopyToClipboard from "../Common/CopyToClipboard";
import CustomQRCode from "../Common/CustomQRCode";

import { useWallet } from "../../wallets/useWallets";

const ConnectWithQRCode: React.FC<{
  switchConnectMethod: (id?: string) => void;
}> = () => {
  const context = usePayContext();
  const { pendingConnectorId } = context;
  const wallet = useWallet(pendingConnectorId ?? "");

  const locales = useLocales({
    CONNECTORNAME: wallet?.name,
  });

  if (!wallet) return <>Wallet not found {pendingConnectorId}</>;

  const downloads = wallet?.downloadUrls;

  const hasApps = downloads && Object.keys(downloads).length !== 0;

  const showAdditionalOptions = false;

  return (
    <PageContent>
      <ModalContent style={{ paddingBottom: 8, gap: 14 }}>
        <CustomQRCode
          value={""}
          image={wallet?.icon}
          tooltipMessage={
            showAdditionalOptions ? (
              <>
                <ScanIconWithLogos />
                <span>{locales.scanScreen_tooltip_walletConnect}</span>
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
