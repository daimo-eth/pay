import { useContext } from "react";
import { PayParams } from "../payment/paymentFsm";
import { PayContext } from "../provider/PayContext";

type UseDaimoPayUI = {
  resetPayment: (payParams?: Partial<PayParams>) => Promise<void>;
};

export function useDaimoPayUI(): UseDaimoPayUI {
  const context = useContext(PayContext);
  if (!context) {
    throw new Error("useDaimoPayUI must be used within a DaimoPayUIProvider");
  }

  return {
    resetPayment: context.paymentState.resetOrder,
  };
}
