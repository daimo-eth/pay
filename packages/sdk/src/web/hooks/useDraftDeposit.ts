import { useEffect, useRef, useState } from "react";

import type { DaimoClient } from "../../client/createDaimoClient.js";
import type {
  AccountRail,
  CreateDepositResponse,
  DepositPaymentInfo,
} from "../../common/account.js";
import {
  type AccountFlowState,
  useSessionDepositState,
} from "./useAccountFlow.js";

type UseDraftDepositArgs = {
  client: DaimoClient;
  accountFlow: AccountFlowState | null;
  sessionId: string;
  rail: AccountRail;
  depositAmount: string;
  enabled: boolean;
};

type UseDraftDepositResult = {
  payment: DepositPaymentInfo | null;
  isCreating: boolean;
  error: string | null;
  retry: () => void;
};

/**
 * Debounced draft-deposit upsert. Fires `upsertDeposit` each time the amount
 * settles, stores the result on the session deposit state. Used by every
 * rail: Apple Pay shows the hosted widget, bank rails render institutions.
 */
export function useDraftDeposit({
  client,
  accountFlow,
  sessionId,
  rail,
  depositAmount,
  enabled,
}: UseDraftDepositArgs): UseDraftDepositResult {
  const { depositState, setDepositState } = useSessionDepositState(sessionId);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const matchesAmount =
    depositState != null && depositState.depositAmount === depositAmount;
  const isCommitted = depositState?.kind === "committed";
  const isCreating = matchesAmount && depositState?.kind === "drafting";
  const payment =
    matchesAmount && depositState?.kind === "drafted"
      ? depositState.payment
      : null;

  useEffect(() => {
    if (!enabled || isCommitted) {
      setError(null);
      return;
    }
    if (matchesAmount && depositState?.kind !== "idle") return;
    if (!accountFlow || !depositAmount) return;

    const timeout = window.setTimeout(() => {
      const seq = ++requestSeqRef.current;
      setError(null);
      setDepositState({ depositAmount, kind: "drafting" });

      void (async () => {
        try {
          const token = await accountFlow.getAccessToken();
          if (!token) throw new Error("not authenticated");
          const result = await client.account.upsertDeposit(
            { mode: "draft", sessionId, rail, depositAmount },
            { bearerToken: token },
          );
          if (seq !== requestSeqRef.current) return;
          setDepositState({
            depositAmount,
            kind: "drafted",
            depositId: result.deposit.id,
            payment: result.payment,
          });
        } catch (err) {
          if (seq !== requestSeqRef.current) return;
          setDepositState({ depositAmount, kind: "idle" });
          setError(
            err instanceof Error ? err.message : "failed to create deposit",
          );
        }
      })();
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [
    accountFlow,
    client,
    depositAmount,
    depositState,
    enabled,
    isCommitted,
    matchesAmount,
    rail,
    sessionId,
    setDepositState,
  ]);

  return {
    payment,
    isCreating,
    error,
    retry: () => {
      setError(null);
      setDepositState({ depositAmount, kind: "idle" });
    },
  };
}

type CreateSignedDepositArgs = {
  client: DaimoClient;
  accountFlow: AccountFlowState;
  sessionId: string;
  depositAmount: string;
  rail: AccountRail;
};

/** Prepare typed data, sign delivery + routing, commit the deposit. */
export async function createSignedDeposit({
  client,
  accountFlow,
  sessionId,
  depositAmount,
  rail,
}: CreateSignedDepositArgs): Promise<CreateDepositResponse> {
  const token = await accountFlow.getAccessToken();
  if (!token) throw new Error("not authenticated");
  const auth = { bearerToken: token };

  const { routingSignData, deliverySignData } =
    await client.account.prepareDeposit(
      { sessionId, depositAmount, rail },
      auth,
    );

  const routingSig = await accountFlow.signTypedData({ ...routingSignData });
  const deliverySig = await accountFlow.signTypedData({ ...deliverySignData });

  return client.account.upsertDeposit(
    {
      mode: "commit",
      sessionId,
      rail,
      depositAmount,
      deliverySig,
      deliverySigData: deliverySignData,
      routingSig,
      routingSigData: routingSignData,
    },
    auth,
  );
}
