import React from "react";

import { PageContent } from "../../Common/Modal/styles";

import {
  baseUSDC,
  DaimoPayToken,
  ExternalPaymentOptions,
} from "@daimo/pay-common";
import {
  CashApp,
  MercadoPago,
  Revolut,
  Venmo,
  Wise,
} from "../../../assets/logos";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";
import OptionsList from "../../Common/OptionsList";
import { OrderHeader } from "../../Common/OrderHeader";

interface Option {
  id: string;
  title: string;
  subtitle?: string;
  icons: (React.ReactNode | string)[];
  onClick: () => void;
  disabled?: boolean;
}

const SelectZKP2P: React.FC = () => {
  const context = usePayContext();

  const dpBaseUSDC: DaimoPayToken = {
    chainId: baseUSDC.chainId,
    token: baseUSDC.token,
    usd: 1,
    priceFromUsd: 1,
    maxAcceptUsd: 1000000,
    maxSendUsd: 1000000,
    displayDecimals: 1,
    symbol: baseUSDC.symbol,
    decimals: baseUSDC.decimals,
    logoURI: baseUSDC.logoURI,
    logoSourceURI: baseUSDC.logoSourceURI,
  };
  const defaultOptions: Option[] = [
    {
      id: "Venmo",
      title: "Pay with Venmo",
      icons: [<Venmo />],
      onClick: () => {
        context.paymentState.setSelectedExternalOption({
          id: ExternalPaymentOptions.Venmo,
          cta: "Pay with Venmo",
          logo: <Venmo />,
          logoShape: "squircle",
          paymentToken: dpBaseUSDC,
          disabled: false,
        });
        context.setRoute(ROUTES.WAITING_EXTERNAL, {
          event: "click-option",
          option: ExternalPaymentOptions.Venmo,
        });
      },
    },
    {
      id: "CashApp",
      title: "Pay with Cashapp",
      icons: [<CashApp />],
      onClick: () => {
        context.paymentState.setSelectedExternalOption({
          id: ExternalPaymentOptions.CashApp,
          cta: "Pay with Cashapp",
          logo: <CashApp />,
          logoShape: "squircle",
          paymentToken: dpBaseUSDC,
          disabled: false,
        });
        context.setRoute(ROUTES.WAITING_EXTERNAL, {
          event: "click-option",
          option: ExternalPaymentOptions.CashApp,
        });
      },
    },
    {
      id: "MercadoPago",
      title: "Pay with MercadoPago",
      icons: [<MercadoPago />],
      onClick: () => {
        context.paymentState.setSelectedExternalOption({
          id: ExternalPaymentOptions.MercadoPago,
          cta: "Pay with MercadoPago",
          logo: <MercadoPago />,
          logoShape: "squircle",
          paymentToken: dpBaseUSDC,
          disabled: false,
        });
        context.setRoute(ROUTES.WAITING_EXTERNAL, {
          event: "click-option",
          option: ExternalPaymentOptions.MercadoPago,
        });
      },
    },
    {
      id: "Revolut",
      title: "Pay with Revolut",
      icons: [<Revolut />],
      onClick: () => {
        context.paymentState.setSelectedExternalOption({
          id: ExternalPaymentOptions.Revolut,
          cta: "Pay with Revolut",
          logo: <Revolut />,
          logoShape: "squircle",
          paymentToken: dpBaseUSDC,
          disabled: false,
        });
        context.setRoute(ROUTES.WAITING_EXTERNAL, {
          event: "click-option",
          option: ExternalPaymentOptions.Revolut,
        });
      },
    },
    {
      id: "Wise",
      title: "Pay with Wise",
      icons: [<Wise />],
      onClick: () => {
        context.paymentState.setSelectedExternalOption({
          id: ExternalPaymentOptions.Wise,
          cta: "Pay with Wise",
          logo: <Wise />,
          logoShape: "squircle",
          paymentToken: dpBaseUSDC,
          disabled: false,
        });
        context.setRoute(ROUTES.WAITING_EXTERNAL, {
          event: "click-option",
          option: ExternalPaymentOptions.Wise,
        });
      },
    },
  ];

  return (
    <PageContent>
      <OrderHeader minified showZKP2P />
      <OptionsList options={defaultOptions} />
    </PageContent>
  );
};

export default SelectZKP2P;
