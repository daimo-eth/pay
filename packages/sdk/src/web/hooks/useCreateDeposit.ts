import { useEffect, useRef, useState } from "react";

import type { DaimoClient } from "../../client/createDaimoClient.js";
import type { AccountRegion, DepositPaymentInfo } from "../../common/account.js";
import {
  type AccountFlowState,
  useSessionDepositState,
} from "./useAccountFlow.js";

export type CreateDepositResult = {
  isCreating: boolean;
  error: string | null;
  payment: DepositPaymentInfo | null;
};

/**
 * Signs EIP-712 typed data and creates a deposit in the background.
 * Returns loading state, error, and payment info when ready.
 */
export function useCreateDeposit(opts: {
  client: DaimoClient;
  accountFlow: AccountFlowState | null;
  sessionId: string;
  depositAmount: string;
  region: AccountRegion;
}): CreateDepositResult {
  const { client, accountFlow, sessionId, depositAmount, region } = opts;
  const { depositState, setDepositState } = useSessionDepositState(sessionId);
  const matchesAmount =
    depositState != null && depositState.depositAmount === depositAmount;
  const hasExistingDeposit =
    matchesAmount
    && depositState.createStatus === "created"
    && depositState.depositId !== ""
    && depositState.payment != null;
  const isCreateInFlight =
    matchesAmount && depositState.createStatus === "creating";

  const [isCreating, setIsCreating] = useState(
    !hasExistingDeposit && (depositAmount !== "" || isCreateInFlight),
  );
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (hasExistingDeposit) {
      setIsCreating(false);
      setError(null);
      return;
    }
    if (isCreateInFlight) {
      setIsCreating(true);
      setError(null);
      return;
    }
    if (started.current || !accountFlow || !depositAmount) return;
    started.current = true;

    (async () => {
      let request = depositState?.createRequest ?? null;
      const selectedInstitutionId = depositState?.selectedInstitutionId;
      try {
        const token = await accountFlow.getAccessToken();
        if (!token) throw new Error("not authenticated");
        const auth = { bearerToken: token };

        if (request == null) {
          setDepositState({
            depositAmount,
            depositId: "",
            payment: null,
            createStatus: "creating",
            createRequest: null,
            selectedInstitutionId,
          });

          // 1. Get EIP-712 typed data for routing + delivery signatures
          const { routingSignData, deliverySignData } =
            await client.account.prepareDeposit(
              { sessionId, depositAmount, region },
              auth,
            );

          // 2. Sign both (sequential — Privy can't handle concurrent signing)
          const routingSig = await accountFlow.signTypedData({
            ...routingSignData,
          });
          const deliverySig = await accountFlow.signTypedData({
            ...deliverySignData,
          });

          request = {
            region,
            depositAmount,
            deliverySig,
            deliverySigData: deliverySignData,
            routingSig,
            routingSigData: routingSignData,
          };

          setDepositState({
            depositAmount,
            depositId: "",
            payment: null,
            createStatus: "creating",
            createRequest: request,
            selectedInstitutionId,
          });
        } else {
          setDepositState({
            depositAmount,
            depositId: "",
            payment: null,
            createStatus: "creating",
            createRequest: request,
            selectedInstitutionId,
          });
        }

        // 3. Create deposit with provider
        const { deposit, payment } = await client.account.createDeposit(
          {
            sessionId,
            ...request,
          },
          auth,
        );

        // 4. Update deposit state
        setDepositState({
          depositAmount,
          depositId: deposit.id,
          payment,
          createStatus: "created",
          createRequest: request,
          selectedInstitutionId,
        });
        setIsCreating(false);
      } catch (err) {
        console.error("[create-deposit] failed:", err);
        if (request != null) {
          setDepositState({
            depositAmount,
            depositId: "",
            payment: null,
            createStatus: "failed",
            createRequest: request,
            selectedInstitutionId,
          });
        } else {
          setDepositState({
            depositAmount,
            depositId: "",
            payment: null,
            createStatus: "draft",
            createRequest: null,
            selectedInstitutionId,
          });
        }
        setError(
          err instanceof Error ? err.message : "failed to create deposit",
        );
        setIsCreating(false);
      }
    })();
  }, [
    accountFlow,
    client,
    depositAmount,
    hasExistingDeposit,
    isCreateInFlight,
    region,
    sessionId,
    setDepositState,
    depositState,
  ]);

  const payment = depositState?.payment ?? null;
  return { isCreating, error, payment };
}
