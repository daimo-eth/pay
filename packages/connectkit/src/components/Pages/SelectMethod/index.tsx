import React from "react";
import { ROUTES, useContext } from "../../DaimoPay";

import { PageContent } from "../../Common/Modal/styles";

import { getAddressContraction } from "@daimo/common";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connector, useAccount, useDisconnect } from "wagmi";
import { Bitcoin, Solana } from "../../../assets/chains";
import { Coinbase, MetaMask, Rabby, Rainbow } from "../../../assets/logos";
import useIsMobile from "../../../hooks/useIsMobile";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";
import PoweredByFooter from "../../Common/PoweredByFooter";

// Get 3 icons, skipping the one that is already connected
function getBestUnconnectedWalletIcons(connector: Connector | undefined) {
  const icons: JSX.Element[] = [];
  const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
  const [isMetaMask, isRainbow, isCoinbase] = [
    strippedId?.includes("metamask"),
    strippedId?.includes("rainbow"),
    strippedId?.includes("coinbase"),
  ];

  if (!isMetaMask) icons.push(<MetaMask />);
  if (!isRainbow) icons.push(<Rainbow />);
  if (!isCoinbase) icons.push(<Coinbase />);
  if (icons.length < 3) icons.push(<Rabby />);

  return icons;
}

function getSolanaOption() {
  const { wallets } = useWallet();
  const { setRoute } = useContext();

  if (wallets.length === 0) return null;

  return {
    id: "solana",
    title: "Pay on Solana",
    icons: [<Solana />],
    onClick: () => {
      setRoute(ROUTES.SOLANA_CONNECT);
    },
  };
}

function getBitcoinOption(usdRequired: number) {
  const { setRoute } = useContext();

  if (usdRequired < 20) return null;

  return {
    id: "bitcoin",
    title: "Pay with Bitcoin",
    icons: [<Bitcoin />],
    onClick: () => {
      setRoute(ROUTES.WAITING_BITCOIN);
    },
  };
}

const SelectMethod: React.FC = () => {
  const isMobile = useIsMobile();

  const { address, isConnected, connector } = useAccount();
  const { disconnectAsync } = useDisconnect();

  const { setRoute, paymentInfo, log } = useContext();
  const {
    daimoPayOrder,
    setSelectedExternalOption,
    externalPaymentOptions,
    senderEnsName,
  } = paymentInfo;
  const displayName =
    senderEnsName ?? (address ? getAddressContraction(address) : "wallet");

  const connectedWalletOption = isConnected
    ? {
        id: "connectedWallet",
        title: `Pay with ${displayName}`,
        icons: connector && connector.icon ? [connector.icon] : [<MetaMask />],
        onClick: () => {
          setRoute(ROUTES.SELECT_TOKEN);
        },
      }
    : null;

  const unconnectedWalletOption = {
    id: "unconnectedWallet",
    title: isConnected ? `Pay with another wallet` : `Pay with wallet`,
    icons: getBestUnconnectedWalletIcons(connector),
    onClick: async () => {
      await disconnectAsync();
      setRoute(ROUTES.CONNECTORS);
    },
  };

  const walletOptions = connectedWalletOption
    ? [connectedWalletOption, unconnectedWalletOption]
    : [unconnectedWalletOption];

  log(
    `[SELECT_METHOD] loading: ${externalPaymentOptions.loading}, options: ${JSON.stringify(
      externalPaymentOptions.options,
    )}`,
  );

  const solanaOption = getSolanaOption();
  const bitcoinOption = getBitcoinOption(
    daimoPayOrder?.destFinalCallTokenAmount.usd ?? 0,
  );

  return (
    <PageContent>
      <OrderHeader />

      <OptionsList
        requiredSkeletons={isMobile ? 4 : 3} // TODO: programmatically determine skeletons to best avoid layout shifts
        isLoading={externalPaymentOptions.loading}
        options={[
          ...walletOptions,
          ...(solanaOption ? [solanaOption] : []),
          ...(externalPaymentOptions.options ?? []).map((option) => ({
            id: option.id,
            title: option.cta,
            icons: [option.logoURI],
            onClick: () => {
              setSelectedExternalOption(option);
              setRoute(ROUTES.WAITING_OTHER);
            },
          })),
          ...(bitcoinOption ? [bitcoinOption] : []),
        ]}
      />
      <PoweredByFooter />
    </PageContent>
  );
};

export default SelectMethod;
