import {
  CreateTRPCClient,
  createTRPCClient,
  httpBatchLink,
} from "@trpc/client";

// Type definition that allows accessing any tRPC procedure with query/mutate methods
export type TrpcClient = CreateTRPCClient<any> & Record<string, any>;

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
          "x-pay-version": "1.14.4",
          "x-session-id": sessionId,
        },
      }),
    ],
  });
}
