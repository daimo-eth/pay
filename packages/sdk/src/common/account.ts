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

/** EIP-712 typed data for the delivery consent signature. */
export interface DeliverySignData {
  domain: { name: string; version: string; chainId: number };
  types: {
    DeliveryConsent: readonly [
      { name: "sessionId"; type: "string" },
      { name: "fiatAmount"; type: "string" },
      { name: "fiatCurrency"; type: "string" },
    ];
  };
  primaryType: "DeliveryConsent";
  message: { sessionId: string; fiatAmount: string; fiatCurrency: string };
}

/** EIP-712 typed data for EIP-3009 transferWithAuthorization (routing). */
export interface RoutingSignData {
  domain: {
    name: string;
    version: string;
    chainId: number;
    verifyingContract: string;
  };
  types: {
    TransferWithAuthorization: readonly [
      { name: "from"; type: "address" },
      { name: "to"; type: "address" },
      { name: "value"; type: "uint256" },
      { name: "validAfter"; type: "uint256" },
      { name: "validBefore"; type: "uint256" },
      { name: "nonce"; type: "bytes32" },
    ];
  };
  primaryType: "TransferWithAuthorization";
  message: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
}

/** POST /v1/internal/account/deposit/prepare response. */
export type RoutingSignDataResponse = {
  /** Typed data for the on-chain routing authorization (relayer permission). */
  routingSignData: RoutingSignData;
  /** Typed data for the delivery commitment (destination chain/token/amount). */
  deliverySignData: DeliverySignData;
};

/**
 * Discriminated union for provider-specific deeplink strategies.
 * - "redirect": simple URL open (new tab).
 * - "form-post": warm a URL first (e.g. WAF JS challenge), then POST a form.
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

/** Server-provided payment UI configuration. */
export type DepositPaymentInfo = DepositConstraints & {
  instructions: string;
  institutions: DepositInstitution[];
  qrUrl: string | null;
};

/** POST /v1/internal/account/deposit response. */
export type CreateDepositResponse = {
  deposit: AccountDeposit;
  payment: DepositPaymentInfo;
};

/** GET /v1/internal/account/deposit response. */
export type GetDepositResponse = {
  deposit: AccountDeposit | null;
};
