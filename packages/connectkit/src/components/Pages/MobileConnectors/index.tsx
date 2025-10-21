import React from "react";

import { ROUTES } from "../../../constants/routes";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import {
  WalletConfigProps,
  walletConfigs,
} from "../../../wallets/walletConfigs";
import { ModalContent, PageContent } from "../../Common/Modal/styles";
import { ScrollArea } from "../../Common/ScrollArea";
import {
  Container,
  WalletIcon,
  WalletItem,
  WalletLabel,
  WalletList,
} from "./styles";

const MobileConnectors: React.FC = () => {
  const context = usePayContext();
  const { paymentState, setRoute } = context;
  const { isAndroid, isIOS } = useIsMobile();

  // filter out installed wallets
  const availableWalletIds =
    Object.keys(walletConfigs).filter((walletId) => {
      const wallet = walletConfigs[walletId];
      if (!wallet.showInMobileConnectors) return false;
      // filter by platform
      if (isAndroid && wallet.showOnAndroid === false) return false;
      if (isIOS && wallet.showOnIOS === false) return false;
      return true;
    }) ?? [];

  // apply ordering from parsedConfig if available
  const { parsedConfig } = paymentState.externalPaymentOptions;
  const { walletOrder } = parsedConfig;

  let walletsIdsToDisplay = availableWalletIds;
  if (walletOrder.length > 0) {
    const ordered: string[] = [];
    const remaining = [...availableWalletIds];

    // add wallets in order specified
    for (const optionId of walletOrder) {
      const walletId = Object.keys(walletConfigs).find((id) => {
        const wallet = walletConfigs[id];
        const optionLower = optionId.toLowerCase();
        return (
          wallet.name?.toLowerCase() === optionLower ||
          wallet.shortName?.toLowerCase() === optionLower ||
          wallet.name?.toLowerCase().includes(optionLower) ||
          id.toLowerCase() === optionLower ||
          id.toLowerCase().includes(optionLower)
        );
      });
      if (walletId && remaining.includes(walletId)) {
        ordered.push(walletId);
        const idx = remaining.indexOf(walletId);
        remaining.splice(idx, 1);
      }
    }

    // add remaining wallets
    walletsIdsToDisplay = [...ordered, ...remaining];
  }

  const goToWallet = async (wallet: WalletConfigProps) => {
    if (wallet.getDaimoPayDeeplink == null) {
      console.error(`wallet ${wallet.name} has no deeplink`);
      return;
    }
    if (paymentState.isDepositFlow) {
      context.paymentState.setSelectedWallet(wallet);
      setRoute(ROUTES.SELECT_WALLET_AMOUNT);
    } else if (!isIOS && !isAndroid && wallet.id) {
      // on desktop, show QR code
      context.setPendingConnectorId(wallet.id);
      setRoute(ROUTES.CONNECT);
    } else {
      await paymentState.openInWalletBrowser(wallet);
    }
  };

  return (
    <PageContent style={{ width: 312 }}>
      <Container>
        <ModalContent style={{ paddingBottom: 0 }}>
          <ScrollArea height={340}>
            <WalletList>
              {walletsIdsToDisplay
                .filter(
                  (walletId) =>
                    !(
                      walletId === "coinbaseWallet" ||
                      walletId === "com.coinbase.wallet"
                    ),
                )
                .map((walletId, i) => {
                  const wallet = walletConfigs[walletId];
                  const { name, shortName, iconConnector, icon } = wallet;
                  return (
                    <WalletItem
                      key={i}
                      onClick={() => goToWallet(wallet)}
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      <WalletIcon>{iconConnector ?? icon}</WalletIcon>
                      <WalletLabel>{shortName ?? name}</WalletLabel>
                    </WalletItem>
                  );
                })}
            </WalletList>
          </ScrollArea>
        </ModalContent>
      </Container>
    </PageContent>
  );
};

export default MobileConnectors;
