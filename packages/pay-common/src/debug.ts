/** Return compact JSON, 10000 chars max. Never throws. */
export function debugJson(obj: any) {
  try {
    let serialized = JSON.stringify(obj, (_, value) =>
      typeof value === "bigint" ? value.toString() : value,
    );
    if (typeof serialized !== "string") {
      serialized = "" + obj;
    }
    return serialized.slice(0, 10000);
  } catch (e: any) {
    return `<JSON error: ${e.message}>`;
  }
}
