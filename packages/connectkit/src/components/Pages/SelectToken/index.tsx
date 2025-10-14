import { useWallet } from "@solana/wallet-adapter-react";
import { useEffect, useMemo, useState } from "react";
import { injected, useAccount } from "wagmi";
import { Ethereum, Solana } from "../../../assets/chains";
import { RetryIcon } from "../../../assets/icons";
import defaultTheme from "../../../constants/defaultTheme";
import { useConnect } from "../../../hooks/useConnect";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { useTokenOptions } from "../../../hooks/useTokenOptions";
import { useStellar } from "../../../provider/StellarContextProvider";
import Button from "../../Common/Button";
import { ModalContent, ModalH1, PageContent } from "../../Common/Modal/styles";
import { OptionsList } from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";

export default function SelectToken() {
  const { isMobile } = useIsMobile();
  const isMobileFormat =
    isMobile || window?.innerWidth < defaultTheme.mobileWidth;

  const { paymentState } = usePayContext();
  const { tokenMode } = paymentState;
  const { optionsList, isLoading, refreshOptions } = useTokenOptions(tokenMode);
  const { isConnected: isEvmConnected } = useAccount();
  const { isConnected: isStellarConnected } = useStellar();
  const { connected: isSolConnected } = useWallet();

  const isConnected = useMemo(
    () => isEvmConnected || isSolConnected || isStellarConnected,
    [isEvmConnected, isSolConnected, isStellarConnected]
  );

  const isAnotherMethodButtonVisible = useMemo(
    () => optionsList.length > 0 && tokenMode !== "all",
    [optionsList.length, tokenMode]
  );

  // Prevent showing "Insufficient balance" too quickly to avoid flickering
  const [showInsufficientBalance, setShowInsufficientBalance] = useState(false);

  useEffect(() => {
    if (!isLoading && isConnected && optionsList.length === 0) {
      // Add a small delay before showing insufficient balance to prevent flickering
      const timer = setTimeout(() => {
        setShowInsufficientBalance(true);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setShowInsufficientBalance(false);
    }
  }, [isLoading, isConnected, optionsList.length]);

  return (
    <PageContent>
      <OrderHeader minified show={tokenMode} excludeLogos={["stellar"]} />
      <OptionsList
        requiredSkeletons={4}
        isLoading={isLoading}
        options={optionsList}
        scrollHeight={
          isAnotherMethodButtonVisible && isMobileFormat ? 225 : 300
        }
        orDivider={isAnotherMethodButtonVisible}
        hideBottomLine={!isAnotherMethodButtonVisible}
      />
      {showInsufficientBalance && (
        <InsufficientBalance onRefresh={refreshOptions} />
      )}
      {!isLoading && !isConnected && tokenMode === "all" && <ConnectButton />}
      {isAnotherMethodButtonVisible && <SelectAnotherMethodButton />}
    </PageContent>
  );
}

function InsufficientBalance({
  onRefresh,
}: {
  onRefresh: () => Promise<void>;
}) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } catch (error) {
      console.error("Failed to refresh balances:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <ModalContent
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 16,
        paddingBottom: 16,
        gap: 16,
      }}
    >
      <ModalH1>Insufficient balance.</ModalH1>
      <Button
        variant="secondary"
        onClick={handleRefresh}
        disabled={isRefreshing}
        waiting={isRefreshing}
        icon={<RetryIcon />}
        iconPosition="left"
      >
        {isRefreshing ? "Refreshing..." : "Refresh Balance"}
      </Button>
      <SelectAnotherMethodButton />
    </ModalContent>
  );
}

function ConnectButton() {
  const { connect } = useConnect();
  const solanaWallets = useWallet();
  // On Android, filter out the Android Intent deeplink fake wallet.
  const filteredWallets = solanaWallets.wallets.filter(
    (w) => w.adapter.name !== "Mobile Wallet Adapter"
  );
  const hasSolanaWallet = filteredWallets.length > 0;

  const icons = [<Ethereum key="ethereum" />];
  if (hasSolanaWallet) {
    icons.push(<Solana key="solana" />);
  }

  const onClick = () => {
    connect({
      connector: injected(),
    });
    if (hasSolanaWallet) {
      if (solanaWallets.wallet == null) {
        solanaWallets.select(solanaWallets.wallets[0].adapter.name);
      }
      solanaWallets.connect();
    }
  };

  const connectOption = {
    id: "connect-wallet",
    title: "Connect Wallet",
    icons,
    onClick,
  };

  return <OptionsList options={[connectOption]} />;
}
