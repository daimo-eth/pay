import {
  DaimoPayHydratedOrderWithOrg,
  DaimoPayOrder,
  ExternalPaymentOptionData,
  ExternalPaymentOptions,
} from "@daimo/pay-common";

export type CreateOrHydrateFn = (opts: {
  order: DaimoPayOrder;
  refundAddress?: string;
  externalPaymentOption?: ExternalPaymentOptions;
}) => Promise<{
  hydratedOrder: DaimoPayHydratedOrderWithOrg;
  externalPaymentOptionData: ExternalPaymentOptionData | null;
}>;
