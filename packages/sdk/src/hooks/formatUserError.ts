import { t } from "./locale.js";

/** Known error patterns mapped to user-friendly messages */
function getErrorMappings(): [pattern: string | RegExp, message: string][] {
  return [
    ["Failed to fetch", t.networkErrorOffline],
  ];
}

/** Convert error to user-friendly display message */
export function formatUserError(
  err: unknown,
  fallback = t.somethingWentWrong,
): string {
  let raw: string;
  if (err instanceof Error) {
    raw = err.message;
  } else if (err && typeof err === "object" && "message" in err) {
    raw = String((err as { message: unknown }).message);
  } else if (typeof err === "string") {
    raw = err;
  } else {
    raw = "";
  }

  for (const [pattern, message] of getErrorMappings()) {
    if (typeof pattern === "string" ? raw === pattern : pattern.test(raw)) {
      return message;
    }
  }

  return raw || fallback;
}
