import { DaimoPayIntentStatus, writeDaimoPayOrderID } from "@daimo/pay-common";
import { usePayContext } from "./usePayContext";

/** Returns the current payment, or undefined if there is none.
 *
 * Status values:
 * - `payment_unpaid` - the user has not paid yet
 * - `payment_started` - the user has paid & payment is in progress. This status
 *    typically lasts a few seconds.
 * - `payment_completed` - the final call or transfer succeeded
 * - `payment_bounced` - the final call or transfer reverted. Funds were sent
 *    to the payment's configured refund address on the destination chain.
 */
export function useDaimoPayStatus():
  | { paymentId: string; status: DaimoPayIntentStatus }
  | undefined {
  const { paymentState } = usePayContext();
  if (!paymentState || !paymentState.daimoPayOrder) return undefined;

  const order = paymentState.daimoPayOrder;
  const paymentId = writeDaimoPayOrderID(order.id);

  return { paymentId, status: order.intentStatus };
}
