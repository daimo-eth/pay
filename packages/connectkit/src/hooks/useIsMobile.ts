import { useMemo } from "react";
import { isAndroid, isIOS } from "../utils";

export default function useIsMobile() {
  const isI = useMemo(isIOS, []);
  const isA = useMemo(isAndroid, []);
  return { isMobile: isI || isA, isIOS: isI, isAndroid: isA };
}
