import { ExternalPaymentOptions } from "@daimo/pay-common";
import styled from "styled-components";
import { Connector, useAccount, useDisconnect } from "wagmi";
import { Bitcoin, Solana, Tron } from "../../../assets/chains";
import { Coinbase, MetaMask, Rabby, Rainbow } from "../../../assets/logos";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";
import OptionsList from "../OptionsList";

const OptionsContainer = styled.div`
  width: 100%;
  margin-top: 1rem;
`;

export default function SelectAnotherMethodButton() {
  const { paymentState, setRoute } = usePayContext();
  const { externalPaymentOptions, daimoPayOrder } = paymentState;
  const { connector } = useAccount();
  const { disconnectAsync } = useDisconnect();
  const paymentOptions = daimoPayOrder?.metadata.payer?.paymentOptions;
  const allPaymentOptions = [
    ...externalPaymentOptions.options.map((option) => option.id),
    ...(paymentOptions ?? []),
  ].flat();

  const includeSolana =
    paymentOptions == null ||
    paymentOptions.includes(ExternalPaymentOptions.Solana);
  // Deposit address options, e.g. Bitcoin, Tron, Zcash, etc.
  // Include by default if paymentOptions not provided
  const includeDepositAddressOption =
    paymentOptions == null ||
    paymentOptions.includes(ExternalPaymentOptions.ExternalChains);

  const selectMethodOption = {
    id: "select-method",
    title: `Pay with another method`,
    icons: getBestPaymentMethodIcons(),
    onClick: () => {
      setRoute(ROUTES.SELECT_METHOD);
    },
  };

  const selectWalletOption = {
    id: "select-wallet",
    title: "Pay with another wallet",
    icons: getBestUnconnectedWalletIcons(connector),
    onClick: async () => {
      await disconnectAsync();
      setRoute(ROUTES.CONNECTORS);
    },
  };

  function getBestUnconnectedWalletIcons(connector: Connector | undefined) {
    const icons: JSX.Element[] = [];
    const strippedId = connector?.id.toLowerCase(); // some connector ids can have weird casing and or suffixes and prefixes
    const [isMetaMask, isRainbow, isCoinbase] = [
      strippedId?.includes("metamask"),
      strippedId?.includes("rainbow"),
      strippedId?.includes("coinbase"),
    ];

    if (!isRainbow) icons.push(<Rainbow />);
    if (!isMetaMask) icons.push(<MetaMask />);
    if (!isCoinbase) icons.push(<Coinbase />);
    if (icons.length < 3) icons.push(<Rabby />);

    return icons;
  }

  function getBestPaymentMethodIcons() {
    let icons = externalPaymentOptions.options
      .filter((option) => option.id !== ExternalPaymentOptions.Daimo)
      .map((option) => (
        <div
          key={option.id}
          style={{ borderRadius: "22.5%", overflow: "hidden" }}
        >
          <img src={option.logoURI} alt="" />
        </div>
      ));

    if (icons.length < 3) {
      const additionalIcons: JSX.Element[] = [];
      if (includeSolana) additionalIcons.push(<Solana />);
      if (includeDepositAddressOption && additionalIcons.length < 3)
        additionalIcons.push(<Bitcoin />);
      if (includeDepositAddressOption && additionalIcons.length < 3)
        additionalIcons.push(<Tron />);
      if (additionalIcons.length < 3)
        additionalIcons.push(...getBestUnconnectedWalletIcons(connector));

      icons = [...icons, ...additionalIcons.slice(0, 3 - icons.length)];
    }

    return icons;
  }

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
