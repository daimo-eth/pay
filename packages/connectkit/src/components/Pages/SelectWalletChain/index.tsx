import React from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import { ModalContent, PageContent } from "../../Common/Modal/styles";

import WalletPaymentSpinner from "../../Spinners/WalletPaymentSpinner";

import { Ethereum, Solana } from "../../../assets/chains";
import { ROUTES } from "../../../constants/routes";
import { OptionsList } from "../../Common/OptionsList";

const SelectWalletChain: React.FC = () => {
  const { paymentState, setPendingConnectorId, setRoute, setSolanaConnector } =
    usePayContext();
  const { selectedWallet } = paymentState;

  if (selectedWallet == null) {
    return <PageContent></PageContent>;
  }

  const walletAny = selectedWallet as any;

  // If wallet only supports one chain, skip this page (fallback safety)
  if (!walletAny.solanaConnectorName) {
    return <PageContent></PageContent>;
  }

  function handleSelect(chain: "evm" | "solana") {
    if (chain === "evm") {
      setPendingConnectorId(walletAny.id);
      setRoute(ROUTES.CONNECT);
    } else {
      setSolanaConnector(walletAny.solanaConnectorName);
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
