import { useEffect, useRef, useState } from "react";

import { useDaimoClient } from "./DaimoClientContext.js";
import type { SessionWithNav } from "../api/navTree.js";

/**
 * Creates an EVM payment method on mount to obtain the deposit address.
 * Returns the receiver address once available, or null while loading.
 */
export function useDepositAddress(session: SessionWithNav): string | null {
  const client = useDaimoClient();

  const [depositAddress, setDepositAddress] = useState<string | null>(() => {
    if (session.paymentMethod?.type === "evm") {
      return (
        (session.paymentMethod as { receiverAddress?: string })
          .receiverAddress ?? null
      );
    }
    return null;
  });

  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current || depositAddress) return;
    initRef.current = true;
    client.sessions.paymentMethods
      .create(session.sessionId, {
        clientSecret: session.clientSecret,
        paymentMethod: { type: "evm" },
      })
      .then((result) => {
        const pm = result.session.paymentMethod;
        if (pm?.type === "evm") {
          setDepositAddress(
            (pm as { receiverAddress: string }).receiverAddress,
          );
        }
      })
      .catch((err) => console.error("failed to init evm payment method:", err));
  }, [session.sessionId, session.clientSecret, depositAddress, client]);

  return depositAddress;
}
