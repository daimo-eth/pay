import { ExternalPaymentOptions } from "@daimo/pay-common";
import { Connector, useAccount } from "wagmi";
import { MetaMask, Phantom, Rabby, Rainbow } from "../../../assets/logos";
import { ROUTES } from "../../../constants/routes";
import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
import { OptionsList } from "../OptionsList";

const OptionsContainer = styled.div`
  width: 100%;
  margin-top: 1rem;
`;

export default function SelectAnotherMethodButton() {
  const locales = useLocales();
  const { paymentState, setRoute } = usePayContext();
  const { externalPaymentOptions } = paymentState;
  const { connector } = useAccount();
  const allPaymentOptions = Array.from(
    externalPaymentOptions.options.values(),
  ).flat();

  const createIconDiv = (content: React.ReactNode, key: string) => (
    <div key={key} style={{ borderRadius: "22.5%", overflow: "hidden" }}>
      {content}
    </div>
  );

  const getWalletIcons = (connector: Connector | undefined) => {
    const connectorId = connector?.id.toLowerCase();
    const walletTypes = [
      { component: <MetaMask />, id: "metamask" },
      { component: <Rainbow />, id: "rainbow" },
      { component: <Rabby />, id: "rabby" },
    ];

    const icons = walletTypes
      .filter(({ id }) => !connectorId?.includes(id))
      .map(({ component }) => component);

    if (icons.length < 3) icons.push(<Phantom />);
    return icons;
  };

  const getPaymentMethodIcons = () => {
    const icons: JSX.Element[] = [];

    // Add TRON USDT as first priority
    icons.push(
      createIconDiv(
        <img
          src="https://pay.daimo.com/chain-logos/tronusdt.svg"
          alt="TRON USDT"
        />,
        "tron-usdt",
      ),
    );

    // Add external payment options
    const externalIcons = allPaymentOptions
      .filter((option) => option.id !== ExternalPaymentOptions.Daimo)
      .slice(0, 1)
      .map((option) =>
        createIconDiv(
          typeof option.logoURI === "string" ? (
            <img src={option.logoURI} alt={option.id} />
          ) : (
            option.logoURI
          ),
          option.id,
        ),
      );

    icons.push(...externalIcons);

    // Fill remaining slots with wallet icons
    if (icons.length < 3) {
      const walletIcons = getWalletIcons(connector);
      const remainingSlots = 3 - icons.length;
      icons.push(...walletIcons.slice(0, remainingSlots));
    }

    return icons.slice(0, 3);
  };

  const selectMethodOption = {
    id: "select-method",
    title: locales.payWithAnotherMethod,
    icons: getPaymentMethodIcons(),
    onClick: () => setRoute(ROUTES.SELECT_METHOD),
  };

  const selectWalletOption = {
    id: "select-wallet",
    title: locales.payWithAnotherWallet,
    icons: getWalletIcons(connector),
    onClick: () => setRoute(ROUTES.SELECT_METHOD),
  };

  return (
    <OptionsContainer>
      <OptionsList
        options={
          allPaymentOptions.length > 0
            ? [selectMethodOption]
            : [selectWalletOption]
        }
      />
    </OptionsContainer>
  );
}
