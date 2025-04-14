import {
  DaimoPayHydratedOrder,
  DaimoPayOrder,
  ExternalPaymentOptionData,
  PaymentMethod,
} from "@daimo/pay-common";

export type CreateOrHydrateFn = (opts: {
  order: DaimoPayOrder;
  refundAddress?: string;
  paymentMethod?: PaymentMethod;
}) => Promise<{
  hydratedOrder: DaimoPayHydratedOrder;
  externalPaymentOptionData: ExternalPaymentOptionData | null;
}>;
