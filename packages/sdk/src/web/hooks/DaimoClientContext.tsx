import { createContext, useContext, useMemo } from "react";
import { createDaimoClient, type DaimoClient } from "../../client/createDaimoClient.js";
import { AccountFlowProvider } from "../components/account/AccountFlowProvider.js";

const DaimoClientContext = createContext<DaimoClient | null>(null);

export function DaimoSDKProvider({
  apiUrl,
  privyAppId,
  children,
}: {
  apiUrl?: string;
  /** Privy app ID. When provided, enables account deposit flow. */
  privyAppId?: string;
  children: React.ReactNode;
}) {
  const client = useMemo(
    () => createDaimoClient({ baseUrl: apiUrl ?? "https://api.daimo.com" }),
    [apiUrl],
  );

  let content = (
    <DaimoClientContext.Provider value={client}>
      {children}
    </DaimoClientContext.Provider>
  );

  if (privyAppId) {
    content = (
      <AccountFlowProvider privyAppId={privyAppId}>
        {content}
      </AccountFlowProvider>
    );
  }

  return content;
}

export function useDaimoClient(): DaimoClient {
  const client = useContext(DaimoClientContext);
  if (!client) throw new Error("wrap your app in <DaimoSDKProvider>");
  return client;
}
