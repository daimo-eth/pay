import type { DepositDeeplink } from "../../../common/account.js";
import { isDesktop, type DaimoPlatform } from "../../platform.js";

/** Execute a provider deeplink in the user's browser. */
export function openDeeplink(
  deeplink: DepositDeeplink,
  platform: DaimoPlatform,
): void {
  const desktop = isDesktop(platform);

  if (!desktop) {
    const url =
      deeplink.type === "form-post" ? deeplink.warmUrl : deeplink.url;
    // In a native WKWebView, use the bridge to open in Safari directly.
    if (postNativeOpenUrl(url)) return;
    // Fallback: trigger navigation for the native delegate to intercept.
    window.location.href = url;
    return;
  }

  switch (deeplink.type) {
    case "redirect":
      window.open(deeplink.url, "_blank");
      break;
    case "form-post":
      openFormPost(deeplink);
      break;
  }
}

function openFormPost(deeplink: DepositDeeplink & { type: "form-post" }) {
  const popup = window.open(deeplink.warmUrl, "_blank");
  if (!popup) return;

  setTimeout(() => {
    popup.location.href = "about:blank";
    setTimeout(() => {
      popup.document.open();
      const fields = Object.entries(deeplink.formFields)
        .map(([k, v]) => `<input type="hidden" name="${escAttr(k)}" value="${escAttr(v)}"/>`)
        .join("\n");
      popup.document.write(
        `<html><body>` +
        `<p style="font-family:system-ui;color:#666;text-align:center;margin-top:40vh">` +
        `Connecting to your bank\u2026</p>` +
        `<form id="f" method="POST" action="${escAttr(deeplink.formAction)}">` +
        `${fields}</form>` +
        `<script>document.getElementById('f').submit();</script>` +
        `</body></html>`,
      );
      popup.document.close();
    }, 500);
  }, deeplink.warmDelayMs);
}

/** Escape a string for safe embedding in an HTML attribute (double-quoted). */
function escAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Post an openUrl message to the native WKWebView bridge. Returns true if sent. */
function postNativeOpenUrl(url: string): boolean {
  const w = window as {
    webkit?: {
      messageHandlers?: { daimoPay?: { postMessage(m: unknown): void } };
    };
  };
  const handler = w.webkit?.messageHandlers?.daimoPay;
  if (!handler) return false;
  handler.postMessage({ type: "openUrl", url });
  return true;
}
