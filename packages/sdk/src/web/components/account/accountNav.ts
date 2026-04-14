import type { AccountRail } from "../../../common/account.js";

/**
 * Pick the modal entry page for a rail. Each rail has its own payment UX:
 * - interac: two-step amount entry → bank picker
 * - ach: two-step amount entry → bank details
 * - apple_pay: single unified amount+Apple Pay page (Coinbase Headless)
 */
export function getAccountPaymentEntryTarget(rail: AccountRail) {
  switch (rail) {
    case "apple_pay":
      // Coinbase Headless: amount input + Apple Pay live in the same page.
      return "account-apple-pay" as const;
    case "interac":
    case "ach":
      // Old two-step flow: amount first, then picker/details.
      return "account-payment" as const;
  }
}

/**
 * Pick the modal page that follows the deposit amount screen (for rails
 * that use the two-step flow).
 */
export function getAccountPaymentAdvanceTarget(rail: AccountRail) {
  switch (rail) {
    case "interac":
      return "account-canada-bank-picker" as const;
    case "ach":
      return "account-us-ach-details" as const;
    case "apple_pay":
      // Never used — apple_pay skips account-payment entirely.
      return "account-apple-pay" as const;
  }
}
