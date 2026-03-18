import type { Address } from "viem";

/** Account deposit region. Server resolves to a provider. */
export type AccountRegion = "canada" | "us";

/** What the user needs to do next in the account onboarding flow. */
export type NextAction = "create_account" | "enrollment" | "ready_for_payment";
export type ExistingAccountNextAction = Exclude<NextAction, "create_account">;

/** Enrollment state machine response from startEnrollment. */
export type EnrollmentResponse =
  | { action: "active" }
  | { action: "kyc_required"; kycToken: string }
  | { action: "pending" }
  | { action: "error"; message: string };

/** Account public info returned by the API. */
export interface AccountInfo {
  id: string;
  email: string;
  walletAddress: Address;
}

/** GET /internal/account response. */
export type GetAccountResponse =
  | {
      account: null;
      nextAction: "create_account";
    }
  | {
      account: AccountInfo;
      nextAction: ExistingAccountNextAction;
    };

/** POST /internal/account response. */
export type CreateAccountResponse = {
  account: AccountInfo;
};

/** GET /internal/account/deposit/constraints response. */
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

/** EIP-712 typed data structure. */
export interface EIP712TypedData {
  domain: Record<string, unknown>;
  types: Record<string, { name: string; type: string }[]>;
  primaryType: string;
  message: Record<string, unknown>;
}

/** POST /internal/account/deposit/prepare response. */
export type RoutingSignDataResponse = {
  routingSignData: EIP712TypedData;
  deliverySignData: EIP712TypedData;
};

/** Discriminated union for provider-specific deeplink strategies. */
export type DepositDeeplink =
  | { type: "redirect"; url: string }
  | {
      type: "form-post";
      warmUrl: string;
      warmDelayMs: number;
      formAction: string;
      formFields: Record<string, string>;
    };

/** A financial institution the user can pay through. */
export type DepositInstitution = {
  /** Optional stable ID. Some providers expose fiId/cuId instead. */
  id?: string;
  /** Provider bank code. Used to derive a stable ID when id is absent. */
  fiId?: string;
  /** Provider credit union code. Used to derive a stable ID when id is absent. */
  cuId?: string | null;
  name: string;
  logo: string | null;
  featured?: boolean;
  deeplink: DepositDeeplink;
};

/** Server-provided payment UI configuration. */
export type DepositPaymentInfo = DepositConstraints & {
  instructions: string;
  institutions: DepositInstitution[];
  qrUrl: string | null;
};

/** POST /internal/account/deposit response. */
export type CreateDepositResponse = {
  deposit: AccountDeposit;
  payment: DepositPaymentInfo;
};

/** GET /internal/account/deposit response. */
export type GetDepositResponse = {
  deposit: AccountDeposit | null;
};
