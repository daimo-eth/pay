/**
 * Contract an Ethereum address to a shorter string.
 *
 * Example:
 * 0x1234567890123456789012345678901234567890
 * becomes
 * 0x1234…7890
 */
export function getAddressContraction(address: string, length = 4): string {
  return address.slice(0, 2 + length) + "…" + address.slice(-length);
}

/** Convert a JS Date object to a UNIX timestamp. */
export function dateToUnix(d: Date): number {
  return Math.floor(d.getTime() / 1000);
}

/** Convert a UNIX timestamp to a JS Date object. */
export function unixToDate(unix: number): Date {
  return new Date(unix * 1000);
}

/** Returns a time like "Dec 11, 2:46 PM" */
export function formatTime(unixS: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(unixS * 1000));
  } catch {
    return "";
  }
}
