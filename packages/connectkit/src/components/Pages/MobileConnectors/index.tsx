import React from "react";
import {
  Container,
  WalletIcon,
  WalletItem,
  WalletLabel,
  WalletList,
} from "./styles";

import { ModalContent, PageContent } from "../../Common/Modal/styles";

import { ROUTES } from "../../../constants/routes";
import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import { useWalletConnectModal } from "../../../hooks/useWalletConnectModal";
import { useWallets } from "../../../wallets/useWallets";
import {
  WalletConfigProps,
  walletConfigs,
} from "../../../wallets/walletConfigs";
import CopyToClipboard from "../../Common/CopyToClipboard";
import { ScrollArea } from "../../Common/ScrollArea";
import { Spinner } from "../../Common/Spinner";
import { useWeb3 } from "../../contexts/web3";

const MoreIcon = (
  <svg
    width="60"
    height="60"
    viewBox="0 0 60 60"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M30 42V19M19 30.5H42"
      stroke="var(--ck-body-color-muted)"
      strokeWidth="3"
      strokeLinecap="round"
    />
  </svg>
);

const MobileConnectors: React.FC = () => {
  const locales = useLocales();
  const context = usePayContext();
  const { paymentState, setRoute } = context;
  const {
    connect: { getUri },
  } = useWeb3();
  const wcUri = getUri();

  const { open: openW3M, isOpen: isOpenW3M } = useWalletConnectModal();
  const wallets = useWallets();

  // filter out installed wallets
  const walletsIdsToDisplay =
    Object.keys(walletConfigs).filter((walletId) => {
      const wallet = walletConfigs[walletId];
      if (wallets.find((w) => w.connector?.id === walletId)) return false;
      if (!wallet.showInMobileConnectors) return false;
      // If the mobile wallet supports solana only, don't show it if we are not supporting solana has a payment method
      if (wallet.isSolanaOnly === !context.paymentState.showSolanaPaymentMethod)
        return false;
      return true;
    }) ?? [];

  const goToWallet = (wallet: WalletConfigProps) => {
    if (wallet.getDaimoPayDeeplink == null) {
      console.error(`wallet ${wallet.name} has no deeplink`);
      return;
    }
    context.paymentState.setSelectedWallet(wallet);
    if (paymentState.isDepositFlow) {
      setRoute(ROUTES.SELECT_WALLET_AMOUNT);
    } else {
      paymentState.payWithWallet(wallet);
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
              <WalletItem onClick={openW3M} $waiting={isOpenW3M}>
                <WalletIcon
                  style={{ background: "var(--ck-body-background-secondary)" }}
                >
                  {isOpenW3M ? (
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <div
                        style={{
                          width: "50%",
                        }}
                      >
                        <Spinner />
                      </div>
                    </div>
                  ) : (
                    MoreIcon
                  )}
                </WalletIcon>
                <WalletLabel>{locales.more}</WalletLabel>
              </WalletItem>
            </WalletList>
          </ScrollArea>
        </ModalContent>
        {context.options?.walletConnectCTA !== "modal" && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 14,
              paddingTop: 8,
            }}
          >
            <CopyToClipboard variant="button" string={wcUri}>
              Copy WC link
            </CopyToClipboard>
          </div>
        )}
      </Container>
    </PageContent>
  );
};

export default MobileConnectors;
