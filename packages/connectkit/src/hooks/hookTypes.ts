import {
  DaimoPayOrder,
  DaimoPayOrderWithOrg,
  ExternalPaymentOptionData,
  ExternalPaymentOptions,
} from "@daimo/pay-common";

export type CreateOrHydrateFn = (opts: {
  order: DaimoPayOrder;
  refundAddress?: string;
  externalPaymentOption?: ExternalPaymentOptions;
}) => Promise<{
  hydratedOrder: DaimoPayOrderWithOrg;
  externalPaymentOptionData: ExternalPaymentOptionData | null;
}>;
