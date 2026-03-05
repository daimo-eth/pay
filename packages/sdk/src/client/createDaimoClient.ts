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
  RetrieveSessionWithNavResponse,
  WalletOptionsResponse,
} from "../web/api/index.js";

import { createTransport, type TransportConfig } from "./transport.js";

export type DaimoClient = {
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
      ): Promise<RetrieveSessionWithNavResponse>;
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
          return transport.request<RetrieveSessionWithNavResponse>({
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
