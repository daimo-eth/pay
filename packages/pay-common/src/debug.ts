import { formatUnits } from "viem";
import { getChainName } from "./chain";
import { DaimoPayTokenAmount } from "./daimoPay";

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

export function debugDPTA(dpta: DaimoPayTokenAmount) {
  const strUnits = formatUnits(BigInt(dpta.amount), dpta.token.decimals);
  const chainName = getChainName(dpta.token.chainId);
  return `${strUnits} ${dpta.token.symbol} / ${dpta.usd.toFixed(2)} on ${chainName}`;
}
