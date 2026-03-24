import { useEffect, useRef, useState } from "react";

import type { AccountRegion, DepositPaymentInfo } from "../../common/account.js";
import type { DaimoClient } from "../../client/createDaimoClient.js";
import type { AccountFlowState } from "./useAccountFlow.js";

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
  const [isCreating, setIsCreating] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current || !accountFlow || !depositAmount) return;
    started.current = true;

    (async () => {
      try {
        const token = await accountFlow.getAccessToken();
        if (!token) throw new Error("not authenticated");
        const auth = { bearerToken: token };

        // 1. Get EIP-712 typed data for routing + delivery signatures
        const { routingSignData, deliverySignData } =
          await client.account.prepareDeposit(
            { sessionId, depositAmount, region },
            auth,
          );

        // 2. Sign both (sequential — Privy can't handle concurrent signing)
        const routingSig = await accountFlow.signTypedData(routingSignData);
        const deliverySig = await accountFlow.signTypedData(deliverySignData);

        // 3. Create deposit with provider
        const { deposit, payment } = await client.account.createDeposit(
          {
            sessionId,
            region,
            depositAmount,
            deliverySig,
            routingSig,
            routingSigData: routingSignData,
          },
          auth,
        );

        // 4. Update deposit state
        accountFlow.setDepositState({
          depositAmount,
          depositId: deposit.id,
          payment,
        });
        setIsCreating(false);
      } catch (err) {
        console.error("[create-deposit] failed:", err);
        setError(
          err instanceof Error ? err.message : "failed to create deposit",
        );
        setIsCreating(false);
      }
    })();
  }, [accountFlow, client, sessionId, depositAmount, region]);

  const payment = accountFlow?.depositState?.payment ?? null;
  return { isCreating, error, payment };
}
