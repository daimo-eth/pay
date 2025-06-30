import { RozoPayOrderID } from "@rozoai/intent-common";
import { rozoPayVersion } from "./exports";

export function getSupportUrl(payId: RozoPayOrderID, screen: string): string {
  const email = "support@daimo.com";
  const subject = `Support${payId ? ` #${payId}` : ""}`;
  let body = [
    `Transaction: ${screen}`,
    `Version: ${rozoPayVersion}`,
    ``,
    `Tell us how we can help`,
  ].join("\n");

  return `mailto:${email}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
