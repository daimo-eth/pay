export type DaimoPlatform =
  | "desktop"
  | "mobile"
  | "ios"
  | "android"
  | "other";

export function isDesktop(platform: DaimoPlatform): boolean {
  return platform === "desktop" || platform === "other";
}

export function toServerPlatform(
  platform: DaimoPlatform,
): "ios" | "android" | "other" {
  switch (platform) {
    case "desktop":
      return "other";
    case "mobile":
      return "android";
    default:
      return platform;
  }
}

export function detectPlatform(): "desktop" | "mobile" {
  if (typeof navigator === "undefined") return "mobile";
  return navigator.maxTouchPoints === 0 ? "desktop" : "mobile";
}
