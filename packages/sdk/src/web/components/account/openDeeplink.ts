import type { DepositDeeplink } from "../../../common/account.js";

/** Execute a provider deeplink in the user's browser. */
export function openDeeplink(deeplink: DepositDeeplink): void {
  switch (deeplink.type) {
    case "redirect":
      window.open(deeplink.url, "_blank");
      break;
    case "form-post": {
      const popup = window.open(deeplink.warmUrl, "_blank");
      if (!popup) return;
      // Wait for WAF JS challenge to complete, then POST form
      setTimeout(() => {
        popup.location.href = "about:blank";
        setTimeout(() => {
          popup.document.open();
          const fields = Object.entries(deeplink.formFields)
            .map(([k, v]) => `<input type="hidden" name="${esc(k)}" value="${esc(v)}"/>`)
            .join("\n");
          popup.document.write(
            `<html><body>` +
            `<p style="font-family:system-ui;color:#666;text-align:center;margin-top:40vh">` +
            `Connecting to your bank\u2026</p>` +
            `<form id="f" method="POST" action="${esc(deeplink.formAction)}">` +
            `${fields}</form>` +
            `<script>document.getElementById('f').submit();</script>` +
            `</body></html>`,
          );
          popup.document.close();
        }, 500);
      }, deeplink.warmDelayMs);
      break;
    }
  }
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
