import React from "react";
import {
  Container,
  WalletIcon,
  WalletItem,
  WalletLabel,
  WalletList,
} from "./styles";

import { ModalContent, PageContent } from "../../Common/Modal/styles";

import { writeDaimoPayOrderID } from "@daimo/pay-common";
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
  const { paymentState, log, setRoute } = context;
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
      return true;
    }) ?? [];

  const connectWallet = (wallet: WalletConfigProps) => {
    if (wallet.getDaimoPayDeeplink == null) {
      console.error(`[MobileConnectors] wallet ${wallet.name} has no deeplink`);
      return;
    }

    const order = paymentState.daimoPayOrder;
    const payId = order && writeDaimoPayOrderID(order.id);
    const deeplink = payId ? wallet.getDaimoPayDeeplink(payId) : undefined;
    log(`[MobileConnectors] clicked ${wallet.name}: ${deeplink}`);
    // Using open(.., '_blank') to open the wallet connect modal.
    // Previously, we used window.location.href = uri, but this closes the dapp
    // (losing state) if there's no deeplink handler for the URI.
    if (deeplink) {
      window.open(deeplink, "_blank");
      context.paymentState.setSelectedWallet(wallet);
      context.paymentState.setSelectedWalletDeepLink(deeplink);
      setRoute(ROUTES.WAITING_WALLET, {
        event: "click-option",
        wallet_name: wallet.name,
      });
    }
  };

  const depositWallet = (wallet: WalletConfigProps) => {
    context.paymentState.setSelectedWallet(wallet);
    setRoute(ROUTES.SELECT_WALLET);
  };

  return (
    <PageContent style={{ width: 312 }}>
      <Container>
        <ModalContent style={{ paddingBottom: 0 }}>
          <ScrollArea height={340}>
            <WalletList $disabled={!wcUri}>
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
                      onClick={() =>
                        !paymentState.isDepositFlow
                          ? connectWallet(wallet)
                          : depositWallet(wallet)
                      }
                      style={{
                        animationDelay: `${i * 50}ms`,
                      }}
                    >
                      <WalletIcon $outline={true}>
                        {iconConnector ?? icon}
                      </WalletIcon>
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
              {locales.copyToClipboard}
            </CopyToClipboard>
          </div>
        )}
      </Container>
    </PageContent>
  );
};

export default MobileConnectors;
