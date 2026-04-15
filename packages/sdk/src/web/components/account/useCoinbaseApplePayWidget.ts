import { useCallback, useEffect, useRef, useState } from "react";

type CoinbaseEventName = string;

type CoinbaseEvent = {
  eventName: CoinbaseEventName;
  data?: { errorCode?: string; errorMessage?: string; txHash?: string };
};

type UseCoinbaseApplePayWidgetArgs = {
  onRefreshDeposit: () => Promise<void>;
  paymentLinkUrl: string | null;
};

type UseCoinbaseApplePayWidgetResult = {
  iframeExpanded: boolean;
  onIframeLoad: () => void;
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
  onRefreshDeposit,
  paymentLinkUrl,
}: UseCoinbaseApplePayWidgetArgs): UseCoinbaseApplePayWidgetResult {
  const [widgetError, setWidgetError] = useState<string | null>(null);
  const [iframeReady, setIframeReady] = useState(false);
  const [iframeExpanded, setIframeExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const refreshRef = useRef(onRefreshDeposit);

  const resetWidget = useCallback(() => {
    debugApplePay("reset widget", { paymentLinkUrl });
    setWidgetError(null);
    setIframeReady(false);
    setIframeExpanded(false);
  }, [paymentLinkUrl]);

  useEffect(() => {
    refreshRef.current = onRefreshDeposit;
  }, [onRefreshDeposit]);

  useEffect(() => {
    debugApplePay("payment link updated", { paymentLinkUrl });
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
      debugApplePay("coinbase event", {
        eventName: parsed.eventName,
        data: parsed.data,
      });

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
        case "onramp_api.pending_payment_auth":
        case "onramp_api.payment_authorized":
          setIframeExpanded(true);
          return;
        case "onramp_api.commit_success":
          setIframeExpanded(false);
          void refreshRef.current();
          return;
        case "onramp_api.commit_error":
          setIframeExpanded(false);
          setWidgetError(parsed.data?.errorMessage ?? "payment failed");
          return;
        case "onramp_api.cancel":
          debugApplePay("collapsing widget after cancel event");
          setIframeExpanded(false);
          return;
        case "onramp_api.apple_pay_session_cancelled":
          setIframeExpanded(false);
          return;
        case "onramp_api.polling_start":
          setIframeExpanded(true);
          void refreshRef.current();
          return;
        case "onramp_api.polling_success":
          setIframeExpanded(false);
          void refreshRef.current();
          return;
        case "onramp_api.polling_error":
          setIframeExpanded(false);
          setWidgetError(
            parsed.data?.errorMessage ?? "transaction processing error",
          );
          return;
        default:
          debugApplePay("unhandled coinbase event", {
            eventName: parsed.eventName,
            data: parsed.data,
          });
          return;
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  const onIframeLoad = useCallback(() => {
    debugApplePay("iframe load", { paymentLinkUrl });
  }, [paymentLinkUrl]);

  return {
    iframeExpanded,
    onIframeLoad,
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

function debugApplePay(
  message: string,
  fields?: Record<string, unknown>,
): void {
  console.info("[apple-pay]", message, fields ?? {});
}
