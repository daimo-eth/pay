import { useWallet } from "@solana/wallet-adapter-react";
import { injected, useAccount } from "wagmi";
import { Ethereum, Solana } from "../../../assets/chains";
import defaultTheme from "../../../constants/defaultTheme";
import { useConnect } from "../../../hooks/useConnect";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { useTokenOptions } from "../../../hooks/useTokenOptions";
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
  const { optionsList, isLoading } = useTokenOptions(tokenMode);
  const { isConnected: isEvmConnected } = useAccount();

  const solanaWallets = useWallet();
  const isSolConnected = solanaWallets.connected;
  const isConnected = isEvmConnected || isSolConnected;

  const isAnotherMethodButtonVisible =
    optionsList.length > 0 && tokenMode !== "all";

  return (
    <PageContent>
      <OrderHeader minified showEth={true} />
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
      {!isLoading && isConnected && optionsList.length === 0 && (
        <InsufficientBalance />
      )}
      {!isLoading && !isConnected && tokenMode === "all" && <ConnectButton />}
      {isAnotherMethodButtonVisible && <SelectAnotherMethodButton />}
    </PageContent>
  );
}

function InsufficientBalance() {
  return (
    <ModalContent
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        paddingTop: 16,
        paddingBottom: 16,
      }}
    >
      <ModalH1>Insufficient balance.</ModalH1>
      <SelectAnotherMethodButton />
    </ModalContent>
  );
}

function ConnectButton() {
  const { connect } = useConnect();
  const solanaWallets = useWallet();
  const hasSolanaWallet = solanaWallets.wallets.length > 0;

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
    title: `Connect Wallet`,
    icons,
    onClick,
  };

  return <OptionsList options={[connectOption]} />;
}
