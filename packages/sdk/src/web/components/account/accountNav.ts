import type { AccountRegion } from "../../../common/account.js";

export function getAccountPaymentAdvanceTarget(region: AccountRegion) {
  switch (region) {
    case "US":
      return "account-us-ach-details";
    case "CA":
      return "account-canada-bank-picker";
  }
}
