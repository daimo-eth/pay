import {
  CreateTRPCClient,
  createTRPCClient,
  httpBatchLink,
} from "@trpc/client";

export type TrpcClient = CreateTRPCClient<any>;

export function createTrpcClient(
  apiUrl: string,
  sessionId: string
): TrpcClient {
  return createTRPCClient({
    links: [
      httpBatchLink({
        url: apiUrl,
        headers: {
          // TODO: The version here must use the latest version of @daimo/pay, so that the API can function for the payment confirmation flow.
          "x-pay-version": "1.11.6",
          "x-session-id": sessionId,
        },
      }),
    ],
  });
}
