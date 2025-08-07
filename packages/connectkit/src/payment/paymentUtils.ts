import { DaimoPayHydratedOrder } from "@daimo/pay-common";

/**
 * Display payments as "expired" 1h before their actual expiration.
 * This ensures that users don't send payments that may arrive post-expiry.
 */
export function getDisplayExpiresAt(order: DaimoPayHydratedOrder) {
  if (order.expirationTs == null) {
    return 1e9; // past expiration
  }
  const expirationTs = Number(order.expirationTs);
  return expirationTs - 3600;
}
