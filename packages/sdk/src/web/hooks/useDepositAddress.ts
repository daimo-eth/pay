import { useEffect, useRef, useState } from "react";

import { useDaimoClient } from "./DaimoClientContext.js";
import type { SessionWithNav } from "../api/navTree.js";
import type { NavNode } from "../api/navTree.js";

function navTreeNeedsEvmPaymentMethod(nodes: NavNode[]): boolean {
  for (const node of nodes) {
    if (node.type === "DepositAddress" || node.type === "ConnectedWallet") {
      return true;
    }
    if (
      node.type === "ChooseOption" &&
      navTreeNeedsEvmPaymentMethod(node.options)
    ) {
      return true;
    }
  }
  return false;
}

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
  const shouldInitEvmPaymentMethod = navTreeNeedsEvmPaymentMethod(
    session.navTree,
  );
  useEffect(() => {
    if (!shouldInitEvmPaymentMethod || initRef.current || depositAddress) return;
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
  }, [
    session.sessionId,
    session.clientSecret,
    depositAddress,
    client,
    shouldInitEvmPaymentMethod,
  ]);

  return depositAddress;
}
