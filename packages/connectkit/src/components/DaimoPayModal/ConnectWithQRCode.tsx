import React from "react";
import { ROUTES } from "../../constants/routes";
import { usePayContext } from "../../hooks/usePayContext";

import { useWalletConnectModal } from "../../hooks/useWalletConnectModal";

import { isWalletConnectConnector } from "../../utils";

import { OrDivider } from "../Common/Modal";
import { ModalContent, PageContent } from "../Common/Modal/styles";

import ScanIconWithLogos from "../../assets/ScanIconWithLogos";
import { ExternalLinkIcon } from "../../assets/icons";
import useLocales from "../../hooks/useLocales";
import Button from "../Common/Button";
import CopyToClipboard from "../Common/CopyToClipboard";
import CustomQRCode from "../Common/CustomQRCode";

import { useWallet } from "../../wallets/useWallets";
import { useWeb3 } from "../contexts/web3";

const ConnectWithQRCode: React.FC<{
  switchConnectMethod: (id?: string) => void;
}> = () => {
  const context = usePayContext();
  const { pendingConnectorId } = context;
  const wallet = useWallet(pendingConnectorId ?? "");

  const { open: openW3M, isOpen: isOpenW3M } = useWalletConnectModal();
  const {
    connect: { getUri },
  } = useWeb3();

  const wcUri = getUri(pendingConnectorId ?? "");
  const uri = wcUri
    ? (wallet?.getWalletConnectDeeplink?.(wcUri) ?? wcUri)
    : undefined;

  const locales = useLocales({
    CONNECTORNAME: wallet?.name,
  });

  if (!wallet) return <>Wallet not found {pendingConnectorId}</>;

  const downloads = wallet?.downloadUrls;

  const hasApps = downloads && Object.keys(downloads).length !== 0;

  const showAdditionalOptions = isWalletConnectConnector(
    pendingConnectorId ?? "",
  );

  return (
    <PageContent>
      <ModalContent style={{ paddingBottom: 8, gap: 14 }}>
        <CustomQRCode
          value={uri}
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

      {showAdditionalOptions && ( // for walletConnect
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
          }}
        >
          {context.options?.walletConnectCTA !== "modal" && (
            <CopyToClipboard variant="button" string={uri}>
              {context.options?.walletConnectCTA === "link"
                ? locales.copyToClipboard
                : locales.copyCode}
            </CopyToClipboard>
          )}
          {context.options?.walletConnectCTA !== "link" && (
            <Button
              icon={<ExternalLinkIcon />}
              onClick={openW3M}
              disabled={isOpenW3M}
              waiting={isOpenW3M}
            >
              {context.options?.walletConnectCTA === "modal"
                ? locales.useWalletConnectModal
                : locales.useModal}
            </Button>
          )}
        </div>
      )}

      {/*
      {hasExtensionInstalled && ( // Run the extension
        <Button
          icon={connectorInfo?.logos.default}
          roundedIcon
          onClick={() => switchConnectMethod(id)}
        >
          Open {connectorInfo?.name}
        </Button>
      )}

      {!hasExtensionInstalled && extensionUrl && (
        <Button href={extensionUrl} icon={<BrowserIcon />}>
          {locales.installTheExtension}
        </Button>
      )}
      */}

      {hasApps && (
        <>
          <Button
            onClick={() => {
              context.setRoute(ROUTES.DOWNLOAD);
            }}
            /*
            icon={
              <div style={{ background: connectorInfo?.icon }}>
                {connectorInfo?.logos.default}
              </div>
            }
            roundedIcon
            */
            download
          >
            {locales.getWalletName}
          </Button>
        </>
      )}
      {/*
        {suggestedExtension && (
          <Button
            href={suggestedExtension?.url}
            icon={<BrowserIcon browser={suggestedExtension?.name} />}
          >
            Install on {suggestedExtension?.label}
          </Button>
        }
        */}
    </PageContent>
  );
};

export default ConnectWithQRCode;
