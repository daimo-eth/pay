import {
  CreateTRPCClient,
  createTRPCClient,
  httpBatchLink,
} from "@trpc/client";
import { rozoPayVersion } from "./exports";

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
          "x-pay-version": rozoPayVersion,
          "x-session-id": sessionId,
        },
      }),
    ],
  });
}
