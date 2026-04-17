import type { Address } from "viem";
import { z } from "zod";

/**
 * Fiat method identifier. Exposed publicly as `fiatMethod` on
 * `PaymentMethodFiat` and `NavNodeFiat`; persisted internally as the rail
 * on account deposit rows.
 */
export const zAccountRail = z.enum(["interac", "ach", "apple_pay"]);
export type AccountRail = z.infer<typeof zAccountRail>;

/** What the user needs to do next in the account onboarding flow. */
export type NextAction = "create_account" | "enrollment" | "ready_for_payment";
export type ExistingAccountNextAction = Exclude<NextAction, "create_account">;

/** Enrollment state machine response from startEnrollment. */
export type EnrollmentResponse =
  | { action: "kyc_required"; kycToken: string }
  | { action: "kyc_retry"; kycToken: string; reason: string }
  | { action: "kyc_pending_review" }
  | { action: "kyc_rejected_final"; reason: string }
  | { action: "not_eligible"; reason: string }
  | { action: "provider_pending" }
  /** User must verify a phone number before continuing. */
  | { action: "phone_required"; reason?: string }
  | { action: "active" }
  | { action: "suspended"; reason: string }
  | { action: "error"; message: string; retryable: boolean };

/** Account public info returned by the API. */
export interface AccountInfo {
  id: string;
  email: string;
  walletAddress: Address;
}

/** GET /v1/internal/account response. */
export type GetAccountResponse =
  | {
      account: null;
      nextAction: "create_account";
    }
  | {
      account: AccountInfo;
      nextAction: ExistingAccountNextAction;
    };

/** POST /v1/internal/account response. */
export type CreateAccountResponse = {
  account: AccountInfo;
};

/** GET /v1/internal/account/deposit/constraints response. */
export type DepositConstraints = {
  currency: { code: string; symbol: string };
  minAmount: string;
  maxAmount: string;
};

/** Deposit status progression. */
export type AccountDepositStatus =
  | "initiated"
  | "awaiting_payment"
  | "payment_received"
  | "token_delivered"
  | "completed"
  | "expired"
  | "failed";

/** Deposit record returned by the API. */
export interface AccountDeposit {
  id: string;
  sessionId: string;
  fiatAmount: string;
  fiatCurrency: string;
  status: AccountDepositStatus;
  errorMessage: string | null;
}

/** EIP-712 typed data structure. Extends Record so it can be passed to signTypedData directly. */
export type EIP712TypedData = Record<string, unknown> & {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
};

/** POST /v1/internal/account/deposit/prepare response. */
export type RoutingSignDataResponse = {
  /** Typed data for the on-chain routing authorization (relayer permission). */
  routingSignData: EIP712TypedData;
  /** Typed data for the delivery commitment (destination chain/token/amount). */
  deliverySignData: EIP712TypedData;
};

/**
 * Discriminated union for deposit deeplink strategies.
 * - `redirect`: open a URL directly.
 * - `form-post`: warm a URL first, then POST a form.
 */
export type DepositDeeplink =
  | { type: "redirect"; url: string }
  | {
      type: "form-post";
      /** URL to open first, allowing WAF/JS challenges to complete. */
      warmUrl: string;
      /** Delay (ms) before submitting the form, to let warmUrl finish loading. */
      warmDelayMs: number;
      /** Form POST target URL. */
      formAction: string;
      /** Hidden form fields to submit. */
      formFields: Record<string, string>;
    };

/** A financial institution the user can pay through. */
export type DepositInstitution = {
  /** Stable institution identifier. Server must always provide this. */
  id: string;
  name: string;
  /** Absolute URL to institution logo, or null for text-only display. */
  logoURI: string | null;
  /** When true, shown as a prominent tile (vs. text-only list item). */
  featured?: boolean;
  deeplink: DepositDeeplink;
};

/**
 * Server-provided payment flow configuration.
 * - `bank-picker`: user picks an institution, then continues in their bank flow
 * - `wallet-pay-widget`: user completes payment in an embedded wallet-pay widget
 */
export type DepositPaymentInfo =
  | (DepositConstraints & {
      flow: "bank-picker";
      instructions: string;
      institutions: DepositInstitution[];
      qrUrl: string | null;
    })
  | (DepositConstraints & {
      flow: "wallet-pay-widget";
      instructions: string;
      paymentLinkUrl: string;
      paymentLinkKind: "apple_pay" | "google_pay";
      /** Total fee in fiat units (e.g. "0.12"). */
      totalFeeUnits: string;
      /** Amount charged to card, inclusive of fees. */
      paymentTotal: string;
      /** Amount of crypto delivered to the destination. */
      purchaseAmount: string;
    });

/** POST /v1/internal/account/deposit response. */
export type CreateDepositResponse = {
  deposit: AccountDeposit;
  payment: DepositPaymentInfo;
};

/** GET /v1/internal/account/deposit response. */
export type GetDepositResponse = {
  deposit: AccountDeposit | null;
};
