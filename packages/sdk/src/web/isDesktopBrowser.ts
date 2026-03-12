export function isDesktopBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints === 0;
}
