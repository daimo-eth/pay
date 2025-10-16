import { useContext } from "react";
import { PayParams } from "../payment/paymentFsm";
import { PayContext } from "../provider/PayContext";

type UseRozoPayUI = {
  resetPayment: (payParams?: Partial<PayParams>) => Promise<void>;
};

export function useRozoPayUI(): UseRozoPayUI {
  const context = useContext(PayContext);
  if (!context) {
    throw new Error("useRozoPayUI must be used within a RozoPayProvider");
  }

  return {
    resetPayment: context.paymentState.resetOrder,
  };
}
