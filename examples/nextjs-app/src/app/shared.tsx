import { RozoPayEvent, getChainExplorerByChainId } from "@rozoai/intent-common";
import { useEffect, useState } from "react";
import { isAddress } from "viem";

export const APP_ID = "daimopay-demo"; // Your public app ID. Use pay-demo for prototyping only.

export const ROZOPAY_API_URL =
  process.env.NEXT_PUBLIC_ROZOPAY_API_URL || "https://intentapi.rozo.ai";

export const ROZO_ADDRESS = "";

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

export function printEvent(e: RozoPayEvent) {
  const url = getChainExplorerByChainId(e.chainId);
  console.log(`${e.type} payment ${e.paymentId}: ${url}/tx/${e.txHash}`);
}

// Type-safe localStorage hook for configs
export function usePersistedConfig<T>(
  key: string,
  initialConfig: T
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
