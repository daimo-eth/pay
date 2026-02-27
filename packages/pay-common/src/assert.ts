import { debugJson } from "./debug";

export function assert(condition: boolean, ...args: any[]): asserts condition {
  if (condition) return;
  let msg: string;
  if (args.length === 1 && typeof args[0] === "function") {
    msg = args[0]();
  } else {
    msg = args.map((a) => debugJson(a)).join(", ");
  }
  throw new Error("Assertion failed: " + msg);
}

export function assertNotNull<T>(
  value: T | null | undefined,
  ...args: any[]
): T {
  assert(value !== null && value !== undefined, ...args);
  return value;
}

export function assertEqual<T>(a: T, b: T, ...args: any[]): void {
  assert(a === b, ...args);
}

/** Used to compile-time check that switch statements are exhaustive, etc. */
export function assertUnreachable(_: never): never {
  throw new Error("Unreachable");
}
