import type {
  AccountRegion,
  CreateAccountResponse,
  CreateDepositResponse,
  DepositConstraints,
  EnrollmentResponse,
  GetAccountResponse,
  GetDepositResponse,
  RoutingSignDataResponse,
} from "../common/account.js";
import type {
  CheckSessionRequest,
  CheckSessionResponse,
  CreatePaymentMethodRequest,
  CreatePaymentMethodResponse,
  LogNavEventRequest,
  RetrieveSessionResponse,
  TokenOptionsRequest,
  TokenOptionsResponse,
} from "../common/api.js";
import type {
  RecreateSessionWithNavResponse,
  RetrieveSessionWithNavResponse,
  WalletOptionsResponse,
} from "../web/api/index.js";

import { createTransport, type TransportConfig } from "./transport.js";

type BearerAuth = { bearerToken: string };

function authHeaders(auth: BearerAuth): Record<string, string> {
  return { Authorization: `Bearer ${auth.bearerToken}` };
}

type SessionContext = { sessionId: string; clientSecret: string };

export type DaimoClient = {
  account: {
    /** Look up account by Privy auth. Returns nextAction for flow routing. */
    get(
      region: AccountRegion,
      session: SessionContext,
      auth: BearerAuth,
    ): Promise<GetAccountResponse>;
    /** Create a new account with an embedded wallet address. */
    create(
      input: { walletAddress: string },
      session: SessionContext,
      auth: BearerAuth,
    ): Promise<CreateAccountResponse>;
    /** Advance the enrollment state machine (KYC, provider registration). */
    startEnrollment(
      input: { region: AccountRegion },
      auth: BearerAuth,
    ): Promise<EnrollmentResponse>;
    /** Get currency, min/max amount constraints for a deposit. */
    getDepositConstraints(
      params: { sessionId: string; region: AccountRegion },
      auth: BearerAuth,
    ): Promise<DepositConstraints>;
    /** Get EIP-712 typed data for routing + delivery signatures. */
    prepareDeposit(
      params: {
        sessionId: string;
        depositAmount: string;
        region: AccountRegion;
      },
      auth: BearerAuth,
    ): Promise<RoutingSignDataResponse>;
    /** Submit signed deposit to the provider. Returns payment instructions. */
    createDeposit(
      input: {
        sessionId: string;
        region: AccountRegion;
        depositAmount: string;
        deliverySig: string;
        routingSig: string;
        routingSigData: Record<string, unknown>;
      },
      auth: BearerAuth,
    ): Promise<CreateDepositResponse>;
    /** Poll deposit status. No auth required — uses clientSecret. */
    getDeposit(
      params: { sessionId: string; clientSecret: string },
    ): Promise<GetDepositResponse>;
  };
  sessions: {
    retrieve(sessionId: string): Promise<RetrieveSessionResponse>;
    paymentMethods: {
      create(
        sessionId: string,
        input: CreatePaymentMethodRequest,
      ): Promise<CreatePaymentMethodResponse>;
    };
    check(
      sessionId: string,
      input: CheckSessionRequest,
    ): Promise<CheckSessionResponse>;
    tokenOptions: {
      list(
        sessionId: string,
        input: TokenOptionsRequest,
      ): Promise<TokenOptionsResponse>;
    };
  };
  internal: {
    sessions: {
      retrieveWithNav(
        sessionId: string,
        clientSecret: string,
      ): Promise<RetrieveSessionWithNavResponse>;
      recreate(
        sessionId: string,
        clientSecret: string,
      ): Promise<RecreateSessionWithNavResponse>;
      walletOptions(
        sessionId: string,
        params: {
          clientSecret: string;
          evmAddress?: string;
          solanaAddress?: string;
        },
      ): Promise<WalletOptionsResponse>;
      logNavEvent(
        sessionId: string,
        input: LogNavEventRequest,
      ): Promise<void>;
    };
  };
};

export function createDaimoClient(config: TransportConfig): DaimoClient {
  const transport = createTransport(config);

  return {
    account: {
      get(region, session, auth) {
        return transport.request<GetAccountResponse>({
          method: "GET",
          path: "/v1/internal/account",
          query: { region, ...session },
          headers: authHeaders(auth),
        });
      },
      create(input, session, auth) {
        return transport.request<CreateAccountResponse>({
          method: "POST",
          path: "/v1/internal/account",
          body: { ...input, ...session },
          headers: authHeaders(auth),
        });
      },
      startEnrollment(input, auth) {
        return transport.request<EnrollmentResponse>({
          method: "POST",
          path: "/v1/internal/account/enrollment/start",
          body: input,
          headers: authHeaders(auth),
        });
      },
      getDepositConstraints(params, auth) {
        return transport.request<DepositConstraints>({
          method: "GET",
          path: "/v1/internal/account/deposit/constraints",
          query: { sessionId: params.sessionId, region: params.region },
          headers: authHeaders(auth),
        });
      },
      prepareDeposit(params, auth) {
        return transport.request<RoutingSignDataResponse>({
          method: "POST",
          path: "/v1/internal/account/deposit/prepare",
          body: {
            sessionId: params.sessionId,
            depositAmount: params.depositAmount,
            region: params.region,
          },
          headers: authHeaders(auth),
        });
      },
      createDeposit(input, auth) {
        return transport.request<CreateDepositResponse>({
          method: "POST",
          path: "/v1/internal/account/deposit",
          body: input,
          headers: authHeaders(auth),
        });
      },
      getDeposit(params) {
        return transport.request<GetDepositResponse>({
          method: "GET",
          path: "/v1/internal/account/deposit",
          query: { sessionId: params.sessionId, clientSecret: params.clientSecret },
        });
      },
    },
    sessions: {
      retrieve(sessionId) {
        return transport.request<RetrieveSessionResponse>({
          method: "GET",
          path: `/v1/sessions/${sessionId}`,
        });
      },

      paymentMethods: {
        create(sessionId, input) {
          return transport.request<CreatePaymentMethodResponse>({
            method: "POST",
            path: `/v1/sessions/${sessionId}/paymentMethods`,
            body: input,
          });
        },
      },

      check(sessionId, input) {
        return transport.request<CheckSessionResponse>({
          method: "PUT",
          path: `/v1/sessions/${sessionId}/check`,
          body: input,
        });
      },

      tokenOptions: {
        list(sessionId, input) {
          return transport.request<TokenOptionsResponse>({
            method: "GET",
            path: `/v1/sessions/${sessionId}/tokenOptions`,
            query: {
              evmAddress: input.evmAddress,
              solanaAddress: input.solanaAddress,
              clientSecret: input.clientSecret,
            },
          });
        },
      },
    },

    internal: {
      sessions: {
        async retrieveWithNav(sessionId, clientSecret) {
          return transport.request<RetrieveSessionWithNavResponse>({
            method: "GET",
            path: `/v1/sessions/${sessionId}/internal/nav`,
            query: { clientSecret },
          });
        },
        async recreate(sessionId, clientSecret) {
          return transport.request<RecreateSessionWithNavResponse>({
            method: "POST",
            path: `/v1/sessions/${sessionId}/internal/recreate`,
            body: { clientSecret },
          });
        },
        async walletOptions(sessionId, params) {
          return transport.request<WalletOptionsResponse>({
            method: "GET",
            path: `/v1/sessions/${sessionId}/internal/walletOptions`,
            query: {
              clientSecret: params.clientSecret,
              evmAddress: params.evmAddress,
              solanaAddress: params.solanaAddress,
            },
          });
        },
        async logNavEvent(sessionId, input) {
          await transport.request<void>({
            method: "POST",
            path: `/v1/sessions/${sessionId}/internal/nav`,
            body: input,
          });
        },
      },
    },
  };
}
