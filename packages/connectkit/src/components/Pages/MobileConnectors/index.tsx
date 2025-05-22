import React from "react";

import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";
import { useWallets } from "../../../wallets/useWallets";
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

  const wallets = useWallets();

  // filter out installed wallets
  const walletsIdsToDisplay =
    Object.keys(walletConfigs).filter((walletId) => {
      const wallet = walletConfigs[walletId];
      if (wallets.find((w) => w.connector?.id === walletId)) return false;
      if (!wallet.showInMobileConnectors) return false;
      // If the mobile wallet supports solana only, don't show it if we are not supporting solana has a payment method
      if (wallet.isSolanaOnly && !context.paymentState.showSolanaPaymentMethod)
        return false;
      return true;
    }) ?? [];

  const goToWallet = (wallet: WalletConfigProps) => {
    if (wallet.getDaimoPayDeeplink == null) {
      console.error(`wallet ${wallet.name} has no deeplink`);
      return;
    }
    if (paymentState.isDepositFlow) {
      context.paymentState.setSelectedWallet(wallet);
      setRoute(ROUTES.SELECT_WALLET_AMOUNT);
    } else {
      paymentState.openInWalletBrowser(wallet);
    }
  };

  return (
    <PageContent style={{ width: 312 }}>
      <Container>
        <ModalContent style={{ paddingBottom: 0 }}>
          <ScrollArea height={340}>
            <WalletList>
              {walletsIdsToDisplay
                .sort(
                  // sort by name
                  (a, b) => {
                    const walletA = walletConfigs[a];
                    const walletB = walletConfigs[b];
                    const nameA = walletA.name ?? walletA.shortName ?? a;
                    const nameB = walletB.name ?? walletB.shortName ?? b;
                    return nameA.localeCompare(nameB);
                  },
                )
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
