import React from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, PageContent } from "../../Common/Modal/styles";

import WalletPaymentSpinner from "../../Spinners/WalletPaymentSpinner";

import { Ethereum, Solana } from "../../../assets/chains";
import { ROUTES } from "../../../constants/routes";
import { WalletProps } from "../../../wallets/useWallets";
import { OptionsList } from "../../Common/OptionsList";

const SelectWalletChain: React.FC = () => {
  const { paymentState, setPendingConnectorId, setRoute, setSolanaConnector } =
    usePayContext();
  const { selectedWallet } = paymentState;

  if (selectedWallet == null) {
    return <PageContent></PageContent>;
  }

  // Narrow the wallet type to include solanaConnectorName.
  const wallet = selectedWallet as WalletProps;

  // If wallet only supports one chain, skip this page (fallback safety)
  if (!wallet.solanaConnectorName) {
    return <PageContent></PageContent>;
  }

  function handleSelect(chain: "evm" | "solana") {
    if (chain === "evm") {
      setPendingConnectorId(wallet.id);
      setRoute(ROUTES.CONNECT);
    } else {
      setSolanaConnector(wallet.solanaConnectorName);
      setRoute(ROUTES.SOLANA_CONNECTOR);
    }
  }
  const options = [
    {
      id: "ethereum",
      title: "Ethereum",
      icons: [<Ethereum key="ethereum" />],
      onClick: () => handleSelect("evm"),
    },
    {
      id: "solana",
      title: "Solana",
      icons: [<Solana key="solana" />],
      onClick: () => handleSelect("solana"),
    },
  ];

  return (
    <PageContent>
      <WalletPaymentSpinner
        logo={selectedWallet.icon}
        logoShape={
          selectedWallet.iconShape === "square"
            ? "squircle"
            : selectedWallet.iconShape || "squircle"
        }
      />
      <ModalContent $preserveDisplay={true}>
        <OptionsList options={options} />
      </ModalContent>
    </PageContent>
  );
};

export default SelectWalletChain;
