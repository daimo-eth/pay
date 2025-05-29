import { debugJson } from "./debug";

export async function awaitOrNull<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    return null;
  }
}

export function tryOrNull<T>(fn: () => T): T | null {
  try {
    return fn();
  } catch (e) {
    return null;
  }
}

export async function awaitDebug<T>(fn: () => Promise<T>): Promise<string> {
  try {
    return debugJson(await fn());
  } catch (e: any) {
    return `<error: ${e}>`;
  }
}
