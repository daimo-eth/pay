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
  draftMode: "plain" | "signed";
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
  draftMode,
}: UseDraftDepositArgs): UseDraftDepositResult {
  const { depositState, setDepositState } = useSessionDepositState(sessionId);
  const [error, setError] = useState<string | null>(null);
  const requestSeqRef = useRef(0);

  const matchesAmount =
    depositState != null && depositState.depositAmount === depositAmount;
  const hasStartedCurrentAmount =
    matchesAmount && depositState?.kind === "started";
  const isCreating = matchesAmount && depositState?.kind === "drafting";
  const payment =
    matchesAmount && depositState?.kind === "drafted"
      ? depositState.payment
      : null;

  useEffect(() => {
    if (!enabled || hasStartedCurrentAmount) {
      setError(null);
      return;
    }
    if (matchesAmount && depositState?.kind !== "idle") return;
    // Hold the failed amount in-place until the user edits it or explicitly
    // retries. Otherwise the hook re-enters drafting immediately and the UI
    // flashes between loading and error states.
    if (matchesAmount && error != null) return;
    if (!accountFlow || !depositAmount) return;

    setError(null);
    const timeout = window.setTimeout(() => {
      const seq = ++requestSeqRef.current;
      setDepositState({ depositAmount, kind: "drafting" });

      void (async () => {
        try {
          const result = draftMode === "signed"
            ? await createSignedDraftDeposit({
                client,
                accountFlow,
                sessionId,
                rail,
                depositAmount,
              })
            : await upsertPlainDraftDeposit({
                client,
                accountFlow,
                sessionId,
                rail,
                depositAmount,
              });
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
    error,
    hasStartedCurrentAmount,
    matchesAmount,
    rail,
    sessionId,
    setDepositState,
    draftMode,
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

type SignAndUpsertDepositArgs = {
  client: DaimoClient;
  accountFlow: AccountFlowState;
  sessionId: string;
  depositAmount: string;
  authorizedAmount?: string;
  rail: AccountRail;
};

export async function signAndUpsertDeposit({
  client,
  accountFlow,
  sessionId,
  depositAmount,
  authorizedAmount,
  rail,
}: SignAndUpsertDepositArgs): Promise<CreateDepositResponse> {
  const token = await accountFlow.getAccessToken();
  if (!token) throw new Error("not authenticated");
  const auth = { bearerToken: token };
  const signedAmount = authorizedAmount ?? depositAmount;
  const { routingSignData, deliverySignData } =
    await client.account.prepareDeposit(
      { sessionId, rail, depositAmount: signedAmount },
      auth,
    );
  const routingSig = await accountFlow.signTypedData({
    ...routingSignData,
  });
  const deliverySig = await accountFlow.signTypedData({
    ...deliverySignData,
  });
  return client.account.upsertDeposit(
    {
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

async function upsertPlainDraftDeposit({
  client,
  accountFlow,
  sessionId,
  rail,
  depositAmount,
}: SignAndUpsertDepositArgs): Promise<CreateDepositResponse> {
  const token = await accountFlow.getAccessToken();
  if (!token) throw new Error("not authenticated");
  return client.account.upsertDeposit(
    {
      sessionId,
      rail,
      depositAmount,
    },
    { bearerToken: token },
  );
}

async function createSignedDraftDeposit({
  client,
  accountFlow,
  sessionId,
  rail,
  depositAmount,
}: SignAndUpsertDepositArgs): Promise<CreateDepositResponse> {
  const preview = await upsertPlainDraftDeposit({
    client,
    accountFlow,
    sessionId,
    rail,
    depositAmount,
  });
  const signedAmount =
    preview.payment.flow === "wallet-pay-widget"
      ? preview.payment.purchaseAmount
      : depositAmount;
  return signAndUpsertDeposit({
    client,
    accountFlow,
    sessionId,
    rail,
    depositAmount,
    authorizedAmount: signedAmount,
  });
}
