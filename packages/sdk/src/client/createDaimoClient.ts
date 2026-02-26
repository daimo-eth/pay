import type {
  CheckSessionRequest,
  CheckSessionResponse,
  CreatePaymentMethodRequest,
  CreatePaymentMethodResponse,
  CreateSessionRequest,
  CreateSessionResponse,
  LogNavEventRequest,
  RetrieveSessionResponse,
  RetrySessionResponse,
  TokenOptionsRequest,
  TokenOptionsResponse,
} from "../common/api.js";

import { createTransport, type TransportConfig } from "./transport.js";

export type DaimoClient = {
  sessions: {
    create(input: CreateSessionRequest): Promise<CreateSessionResponse>;
    retry(sessionId: string): Promise<RetrySessionResponse>;
    retrieve(
      sessionId: string,
      useSecretKey?: boolean,
    ): Promise<RetrieveSessionResponse>;
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
      navEvents: {
        create(sessionId: string, input: LogNavEventRequest): Promise<void>;
      };
    };
  };
};

export function createDaimoClient(config: TransportConfig): DaimoClient {
  const transport = createTransport(config);

  return {
    sessions: {
      create(input) {
        return transport.request<CreateSessionResponse>({
          method: "POST",
          path: "/v1/sessions",
          auth: "secret",
          body: input,
        });
      },

      retry(sessionId) {
        return transport.request<RetrySessionResponse>({
          method: "POST",
          path: `/v1/sessions/${sessionId}/retry`,
          auth: "secret",
        });
      },

      retrieve(sessionId, useSecretKey) {
        return transport.request<RetrieveSessionResponse>({
          method: "GET",
          path: `/v1/sessions/${sessionId}`,
          auth: useSecretKey === false ? "none" : "secret",
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
        navEvents: {
          async create(sessionId, input) {
            await transport.request<void>({
              method: "POST",
              path: `/internal/sessions/${sessionId}/navEvents`,
              body: input,
            });
          },
        },
      },
    },
  };
}
