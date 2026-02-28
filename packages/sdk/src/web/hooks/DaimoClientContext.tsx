import { createContext, useContext, useMemo } from "react";
import { createDaimoClient, type DaimoClient } from "../../client/createDaimoClient.js";

const DaimoClientContext = createContext<DaimoClient | null>(null);

export function DaimoSDKProvider({
  apiUrl,
  children,
}: {
  apiUrl?: string;
  children: React.ReactNode;
}) {
  const client = useMemo(
    () => createDaimoClient({ baseUrl: apiUrl ?? "https://api.daimo.com" }),
    [apiUrl],
  );
  return (
    <DaimoClientContext.Provider value={client}>
      {children}
    </DaimoClientContext.Provider>
  );
}

export function useDaimoClient(): DaimoClient {
  const client = useContext(DaimoClientContext);
  if (!client) throw new Error("wrap your app in <DaimoSDKProvider>");
  return client;
}
