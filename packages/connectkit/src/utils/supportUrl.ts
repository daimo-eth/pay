import { DaimoPayOrderID } from "@daimo/pay-common";
import { daimoPayVersion } from "./exports";

export function getSupportUrl(payId: DaimoPayOrderID, screen: string): string {
  const email = "support@daimo.com";
  const subject = `Support${payId ? ` #${payId}` : ""}`;
  let body = [
    `Transaction: ${screen}`,
    `Version: ${daimoPayVersion}`,
    ``,
    `Tell us how we can help`,
  ].join("\n");

  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
