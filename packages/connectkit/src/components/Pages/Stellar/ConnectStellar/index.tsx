import React, { useEffect, useMemo, useState } from "react";

import {
  ModalContent,
  ModalH1,
  PageContent,
} from "../../../Common/Modal/styles";

import { Stellar } from "../../../../assets/chains";
import { SquircleIcon } from "../../../../assets/logos";
import { ROUTES } from "../../../../constants/routes";
import { usePayContext } from "../../../../hooks/usePayContext";
import { useStellar } from "../../../../provider/StellarContextProvider";
import { OptionsList } from "../../../Common/OptionsList";
import { OrderHeader } from "../../../Common/OrderHeader";
import SelectAnotherMethodButton from "../../../Common/SelectAnotherMethodButton";
import WalletPaymentSpinner from "../../../Spinners/WalletPaymentSpinner";

interface Option {
  id: string;
  title: string;
  subtitle?: string;
  icons: (React.ReactNode | string)[];
  onClick: () => void;
  disabled?: boolean;
}

const ConnectStellar: React.FC = () => {
  const { setStellarConnector, setRoute, log } = usePayContext();
  const { kit, setPublicKey, setConnector } = useStellar();

  // State to store the fetched Stellar wallets
  const [stellarWallets, setStellarWallets] = useState<Array<any>>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Stellar wallets when the kit is available
  useEffect(() => {
    const fetchStellarWallets = async () => {
      if (!kit) return;
      setIsLoading(true);
      try {
        const wallets = await kit.getSupportedWallets();
        setStellarWallets(wallets);
      } catch (error) {
        console.error("Error fetching Stellar wallets:", error);
        setStellarWallets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStellarWallets();
  }, [kit]);

  // Create options list from the fetched wallets
  const stellarOptions = useMemo(() => {
    return stellarWallets
      .filter((wallet) => wallet.isAvailable)
      .map((wallet) => ({
        id: wallet.id,
        title: wallet.name
          .toLowerCase()
          .split(" ")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        icons: [
          <SquircleIcon key={wallet.id} icon={wallet.icon} alt={wallet.name} />,
        ],
        onClick: async () => {
          log("wallet.name ", wallet.id);

          await kit?.setWallet(wallet.id);
          kit?.getAddress().then(({ address }) => {
            // Stellar Provider
            setPublicKey(address);
            setConnector(wallet);

            // PayContext
            setStellarConnector(wallet.id);
            setRoute(ROUTES.STELLAR_CONNECTOR, {
              event: "click-stellar-wallet",
              walletName: wallet.name,
            });
          });
        },
      }));
  }, [stellarWallets, kit]);

  return (
    <PageContent>
      {isLoading ? (
        <WalletPaymentSpinner
          logo={<Stellar />}
          logoShape="circle"
          loading={true}
          unavailable={false}
        />
      ) : (
        <>
          {/* No wallets on desktop */}
          {stellarOptions.length === 0 && (
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
              <ModalH1>No Stellar wallets detected.</ModalH1>
              <SelectAnotherMethodButton />
            </ModalContent>
          )}

          {/* Show wallet options when not on mobile adapter */}
          {stellarOptions.length > 0 && (
            <>
              <OrderHeader minified show="stellar" />
              <OptionsList options={stellarOptions} />
            </>
          )}
        </>
      )}
    </PageContent>
  );
};

export default ConnectStellar;
