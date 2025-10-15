import { worldchainUSDC } from "@daimo/pay-common";
import { MiniKit } from "@worldcoin/minikit-js";
import { useCallback, useEffect, useState } from "react";
import { Address, getAddress } from "viem";
import { ROUTES } from "../constants/routes";
import { useDaimoPay } from "../hooks/useDaimoPay";
import { usePayContext } from "../hooks/usePayContext";
import { DaimoPayModalOptions } from "../types";
import { useWorldSignIn } from "./useWorldSignIn";

export function useWithdrawToWorld() {
  const { signInWithWorld } = useWorldSignIn();
  const [isMiniKitReady, setIsMiniKitReady] = useState(false);

  const pay = useDaimoPay();
  const context = usePayContext();
  const { paymentState, log } = context;
  const [modalOptions, setModalOptions] = useState<DaimoPayModalOptions>({
    closeOnSuccess: false,
    resetOnSuccess: false,
  });

  // Install Minikit if not already installed
  useEffect(() => {
    log("[WORLD] Installing MiniKit");
    const result = MiniKit.install();
    log("[WORLD] MiniKit install result", result);
    log("[WORLD] MiniKit is installed", MiniKit.isInstalled());
    setIsMiniKitReady(MiniKit.isInstalled());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showSpinner = useCallback(() => {
    log(`[WORLD] showing spinner ${pay.order?.id}`);
    context.showPayment(modalOptions);
    context.setRoute(ROUTES.CONFIRMATION);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay.order?.id, modalOptions]);

  // Auto-open spinner when payment starts
  useEffect(() => {
    if (pay.paymentState === "payment_started") {
      showSpinner();
    }
  }, [pay.paymentState, showSpinner]);

  const withdrawToWorld = useCallback(
    async ({
      appId,
      toUnits,
      closeOnSuccess = false,
      resetOnSuccess = false,
    }: {
      appId: string;
      toUnits: string;
      closeOnSuccess?: boolean;
      resetOnSuccess?: boolean;
    }): Promise<Address | null> => {
      if (!isMiniKitReady) {
        console.error("[WORLD_WITHDRAW] MiniKit is not installed");
        return null;
      }

      const worldUser = await signInWithWorld();

      if (!worldUser?.walletAddress) {
        log("[WORLD_WITHDRAW] user is not signed in");
        return null;
      }

      // Create a payment to withdraw to the user's world wallet
      await paymentState.setPayParams({
        appId,
        toChain: worldchainUSDC.chainId,
        toToken: getAddress(worldchainUSDC.token),
        toUnits,
        toAddress: getAddress(worldUser.walletAddress),
        intent: "Withdraw to World App",
      });

      // Hydrate the order and return the intent address
      const hydratedState = await pay.hydrateOrder();
      const intentAddress = hydratedState.order.intentAddr;
      log(
        `[WORLD_WITHDRAW] hydrated order ${pay.order?.id} with intent address ${intentAddress}. Polling for payment`,
      );
      setModalOptions({ closeOnSuccess, resetOnSuccess });
      return intentAddress;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isMiniKitReady, signInWithWorld, pay, log],
  );

  return { withdrawToWorld };
}
