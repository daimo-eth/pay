import { DaimoPayEvent, getChainExplorerByChainId } from "@daimo/pay-common";
import { useState, useCallback, useEffect } from "react";
import { isAddress } from "viem";

export const APP_ID = "daimopay-demo";

export const DAIMOPAY_API_URL =
  process.env.NEXT_PUBLIC_DAIMOPAY_API_URL || "https://pay-api.daimo.xyz";

export const DAIMO_ADDRESS = "0xFBfa6A0D1F44b60d7CCA4b95d5a2CfB15246DB0D";

export function Container({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`flex flex-col gap-4 ${className}`}>{children}</div>;
}

export function Columns({ children }: { children: React.ReactNode }) {
  return <div className="flex gap-4 items-baseline">{children}</div>;
}

export function printEvent(e: DaimoPayEvent) {
  const url = getChainExplorerByChainId(e.chainId);
  console.log(`${e.type} payment ${e.paymentId}: ${url}/tx/${e.txHash}`);
}

// Type-safe localStorage hook for configs
export function usePersistedConfig<T>(
  key: string,
  initialConfig: T,
): [T, (config: T) => void] {
  // Start with initialConfig
  const [config, setConfigState] = useState<T>(initialConfig);

  // Load from localStorage only after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      // Validate address if present
      if ("recipientAddress" in parsed && !isAddress(parsed.recipientAddress)) {
        return;
      }
      setConfigState(parsed);
    } catch {
      // If there's any error, keep using initialConfig
      return;
    }
  }, [key]);

  const setConfig = (newConfig: T) => {
    setConfigState(newConfig);
    try {
      localStorage.setItem(key, JSON.stringify(newConfig));
    } catch {
      // Handle localStorage errors silently
    }
  };

  return [config, setConfig];
}
