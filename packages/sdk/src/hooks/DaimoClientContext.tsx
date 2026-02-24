import { createContext, useContext, useMemo } from "react";
import { createDaimoClient, type DaimoClient } from "../common/client.js";

const DaimoClientContext = createContext<DaimoClient | null>(null);

export function DaimoSDKProvider({
  apiUrl,
  children,
}: {
  apiUrl?: string;
  children: React.ReactNode;
}) {
  const client = useMemo(
    () => createDaimoClient(apiUrl ?? "https://pay-api.daimo.xyz"),
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
