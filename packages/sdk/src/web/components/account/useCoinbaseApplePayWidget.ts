import { useCallback, useEffect, useRef, useState } from "react";

type CoinbaseEventName =
  | "onramp_api.load_pending"
  | "onramp_api.load_success"
  | "onramp_api.load_error"
  | "onramp_api.apple_pay_button_pressed"
  | "onramp_api.commit_success"
  | "onramp_api.commit_error"
  | "onramp_api.cancel"
  | "onramp_api.apple_pay_session_cancelled"
  | "onramp_api.polling_start"
  | "onramp_api.polling_success"
  | "onramp_api.polling_error";

type CoinbaseEvent = {
  eventName: CoinbaseEventName;
  data?: { errorCode?: string; errorMessage?: string; txHash?: string };
};

type UseCoinbaseApplePayWidgetArgs = {
  onCommitPayment: () => Promise<void>;
  onRefreshDeposit: () => Promise<void>;
  paymentLinkUrl: string | null;
};

type UseCoinbaseApplePayWidgetResult = {
  iframeExpanded: boolean;
  iframeReady: boolean;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  resetWidget: () => void;
  widgetError: string | null;
};

/**
 * Coinbase iframe lifecycle and postMessage handling. Keeps the account page
 * focused on amount entry / layout while this hook owns hosted-widget state.
 */
export function useCoinbaseApplePayWidget({
  onCommitPayment,
  onRefreshDeposit,
  paymentLinkUrl,
}: UseCoinbaseApplePayWidgetArgs): UseCoinbaseApplePayWidgetResult {
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeExpanded, setIframeExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const commitRef = useRef(onCommitPayment);
  const refreshRef = useRef(onRefreshDeposit);

  const resetWidget = useCallback(() => {
    setWidgetError(null);
    setIframeReady(false);
    setIframeExpanded(false);
  }, []);

  useEffect(() => {
    commitRef.current = onCommitPayment;
  }, [onCommitPayment]);

  useEffect(() => {
    refreshRef.current = onRefreshDeposit;
  }, [onRefreshDeposit]);

  useEffect(() => {
    resetWidget();
  }, [paymentLinkUrl, resetWidget]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (typeof event.origin !== "string" || !isCoinbaseOrigin(event.origin)) {
        return;
      }
      const iframeWindow = iframeRef.current?.contentWindow;
      if (iframeWindow && event.source !== iframeWindow) {
        return;
      }
      const parsed = parseCoinbaseEvent(event.data);
      if (!parsed) return;

      switch (parsed.eventName) {
        case "onramp_api.load_pending":
          setIframeReady(false);
          return;
        case "onramp_api.load_success":
          setWidgetError(null);
          setIframeReady(true);
          return;
        case "onramp_api.load_error":
          if (
            parsed.data?.errorCode ===
            "ERROR_CODE_GUEST_APPLE_PAY_NOT_SUPPORTED"
          ) {
            setIframeReady(false);
            return;
          }
          setWidgetError(
            parsed.data?.errorMessage ?? "failed to load payment widget",
          );
          return;
        case "onramp_api.apple_pay_button_pressed":
          setIframeExpanded(true);
          return;
        case "onramp_api.commit_success":
          setIframeExpanded(false);
          void commitRef.current();
          void refreshRef.current();
          return;
        case "onramp_api.commit_error":
          setIframeExpanded(false);
          setWidgetError(parsed.data?.errorMessage ?? "payment failed");
          return;
        case "onramp_api.cancel":
        case "onramp_api.apple_pay_session_cancelled":
          setIframeExpanded(false);
          return;
        case "onramp_api.polling_start":
          setIframeExpanded(true);
          void commitRef.current();
          void refreshRef.current();
          return;
        case "onramp_api.polling_success":
          setIframeExpanded(false);
          void commitRef.current();
          void refreshRef.current();
          return;
        case "onramp_api.polling_error":
          setIframeExpanded(false);
          setWidgetError(
            parsed.data?.errorMessage ?? "transaction processing error",
          );
          return;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  return {
    iframeExpanded,
    iframeReady,
    iframeRef,
    resetWidget,
    widgetError,
  };
}

/**
 * Coinbase sends postMessage payloads as JSON strings. Parse and narrow them
 * before the page reacts to lifecycle events.
 */
function parseCoinbaseEvent(raw: unknown): CoinbaseEvent | null {
  let parsed: unknown;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const maybe = parsed as Record<string, unknown>;
  if (typeof maybe.eventName !== "string") return null;
  if (!maybe.eventName.startsWith("onramp_api.")) return null;
  return maybe as CoinbaseEvent;
}

function isCoinbaseOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "coinbase.com" || hostname.endsWith(".coinbase.com");
  } catch {
    return false;
  }
}
