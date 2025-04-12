import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import CustomQRCode from "../../Common/CustomQRCode";

import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import { useWallet } from "../../../wallets/useWallets";

const DownloadApp = () => {
  const { pendingConnectorId } = usePayContext();
  const wallet = useWallet(pendingConnectorId ?? "");

  const locales = useLocales({
    CONNECTORNAME: wallet?.name,
  });

  if (!wallet) return <>Wallet not found</>;

  const downloads = {
    ios: wallet.downloadUrls?.ios,
    android: wallet.downloadUrls?.android,
    redirect: wallet.downloadUrls?.download,
  };

  const bodycopy =
    downloads.ios && downloads.android
      ? locales.downloadAppScreen_iosAndroid
      : downloads.ios
        ? locales.downloadAppScreen_ios
        : locales.downloadAppScreen_android;

  return (
    <PageContent>
      <ModalContent style={{ paddingBottom: 4, gap: 14 }}>
        {downloads.redirect && <CustomQRCode value={downloads.redirect} />}
        {!downloads.redirect && <>No download link available</>}
        <ModalBody
          style={{ fontSize: 15, lineHeight: "20px", padding: "0 12px" }}
        >
          {bodycopy}
        </ModalBody>
      </ModalContent>
    </PageContent>
  );
};

export default DownloadApp;
