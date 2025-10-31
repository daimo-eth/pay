import React from "react";

import { ROUTES } from "../../../constants/routes";
import { useConnectors } from "../../../hooks/useConnectors";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { isInjectedConnector } from "../../../utils";
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
  const { paymentState, setRoute, disableMobileInjector } = context;
  const { isAndroid, isIOS } = useIsMobile();
  const connectors = useConnectors();

  // Apply ordering from parsedConfig if available
  const { parsedConfig } = paymentState.externalPaymentOptions;
  const { walletOrder } = parsedConfig;

  // Filter available wallets
  const availableWalletIds =
    Object.keys(walletConfigs).filter((walletId) => {
      const wallet = walletConfigs[walletId];
      // If walletOrder is provided, ignore showInMobileConnectors flag
      if (walletOrder.length === 0 && !wallet.showInMobileConnectors)
        return false;
      // Filter by platform
      if (isAndroid && wallet.showOnAndroid === false) return false;
      if (isIOS && wallet.showOnIOS === false) return false;
      return true;
    }) ?? [];

  let walletsIdsToDisplay = availableWalletIds;
  if (walletOrder.length > 0) {
    // Check for injected wallets that match the filter
    const hasInjected =
      !disableMobileInjector &&
      connectors.some((c) => {
        if (!isInjectedConnector(c.type)) return false;
        if (c.name?.toLowerCase().includes("walletconnect")) return false;
        // Check if this injected wallet matches the filter
        return walletOrder.some(
          (filterName) =>
            c.name?.toLowerCase().includes(filterName.toLowerCase()) ||
            c.id.toLowerCase().includes(filterName.toLowerCase()),
        );
      });

    // Calculate which wallets to exclude (shown in main selector)
    const totalWallets = walletOrder.length;
    const injectedCount = hasInjected ? 1 : 0;
    const maxNonInjectedInMain =
      totalWallets > 3 ? 2 : Math.min(3 - injectedCount, totalWallets);
    const shownInMain = walletOrder.slice(0, maxNonInjectedInMain);

    // Filter to only show wallets from the order
    const filtered = availableWalletIds.filter((walletId) => {
      const wallet = walletConfigs[walletId];
      return walletOrder.some((optionId) => {
        const optionLower = optionId.toLowerCase();
        const name =
          wallet.name?.toLowerCase() || wallet.shortName?.toLowerCase() || "";
        return (
          name === optionLower ||
          name.includes(optionLower) ||
          walletId.toLowerCase() === optionLower ||
          walletId.toLowerCase().includes(optionLower)
        );
      });
    });

    // Exclude wallets shown in main selector
    const excludedWallets = shownInMain.map((name) => name.toLowerCase());
    const remaining = filtered.filter((walletId) => {
      const wallet = walletConfigs[walletId];
      const walletName =
        wallet.name?.toLowerCase() || wallet.shortName?.toLowerCase() || "";
      return !excludedWallets.some(
        (excluded) =>
          walletName.includes(excluded) || excluded.includes(walletName),
      );
    });

    // Order remaining wallets by walletOrder
    const ordered: string[] = [];
    for (const optionId of walletOrder) {
      const walletId = remaining.find((id) => {
        const wallet = walletConfigs[id];
        const optionLower = optionId.toLowerCase();
        const name =
          wallet.name?.toLowerCase() || wallet.shortName?.toLowerCase() || "";
        return (
          name === optionLower ||
          name.includes(optionLower) ||
          id.toLowerCase() === optionLower ||
          id.toLowerCase().includes(optionLower)
        );
      });
      if (walletId && !ordered.includes(walletId)) {
        ordered.push(walletId);
      }
    }

    walletsIdsToDisplay = ordered;
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
      // On desktop, show QR code
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
