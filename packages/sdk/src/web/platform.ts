export type DaimoPlatform =
  | "desktop"
  | "mobile"
  | "ios"
  | "android"
  | "other";

const NON_SAFARI_BROWSER_RE =
  /(?:chrome|chromium|crios|edg|edgios|firefox|fxios|opr|opera|opt)/i;

export function isDesktop(platform: DaimoPlatform): boolean {
  return platform === "desktop" || platform === "other";
}

export function detectPlatform(): "desktop" | "mobile" {
  if (typeof navigator === "undefined") return "mobile";
  return navigator.maxTouchPoints === 0 ? "desktop" : "mobile";
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;

  const { userAgent, vendor } = navigator;
  if (!/Safari/i.test(userAgent)) return false;
  if (NON_SAFARI_BROWSER_RE.test(userAgent)) return false;
  return /Apple/i.test(vendor);
}
