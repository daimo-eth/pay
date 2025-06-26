import { DaimoPayUserMetadata } from "@daimo/pay-common";
import { ReactElement, useCallback, useEffect, useState } from "react";
import { Address, Hex } from "viem";
import ThemedButton, {
  ThemeContainer,
} from "../components/Common/ThemedButton";
import { DaimoPayButtonInner } from "../components/DaimoPayButton";
import { ROUTES } from "../constants/routes";
import { useDaimoPay } from "../hooks/useDaimoPay";
import { usePayContext } from "../hooks/usePayContext";
import { ResetContainer } from "../styles";
import { CustomTheme, Mode, Theme } from "../types";
import { promptWorldcoinPayment } from "./promptWorldPayment";

import { MiniKit } from "@worldcoin/minikit-js";

export type WorldPayButtonPaymentProps = {
  /**
   * Your public app ID. Specify either (payId) or (appId + parameters).
   */
  appId: string;
  /**
   * Destination chain ID.
   */
  toChain: number;
  /**
   * The destination token to send, completing payment. Must be an ERC-20
   * token or the zero address, indicating the native token / ETH.
   */
  toToken: Address;
  /**
   * The amount of destination token to send (transfer or approve).
   */
  toUnits: string;
  /**
   * The destination address to transfer to, or contract to call.
   */
  toAddress: Address;
  /**
   * Optional calldata to call an arbitrary function on `toAddress`.
   */
  toCallData?: Hex;
  /**
   * The intent verb, such as "Pay", "Deposit", or "Purchase".
   */
  intent?: string;
  /**
   * External ID. E.g. a correlation ID.
   */
  externalId?: string;
  /**
   * Developer metadata. E.g. correlation ID.
   * */
  metadata?: DaimoPayUserMetadata;
  /**
   * The address to refund to if the payment bounces.
   */
  refundAddress?: Address;
};

type WorldPayButtonCommonProps = WorldPayButtonPaymentProps & {
  /** Automatically close the modal after a successful payment. */
  closeOnSuccess?: boolean;
  /** Reset the payment after a successful payment. */
  resetOnSuccess?: boolean;
};

export type WorldPayButtonProps = WorldPayButtonCommonProps & {
  /** Light mode, dark mode, or auto. */
  mode?: Mode;
  /** Named theme. See docs for options. */
  theme?: Theme;
  /** Custom theme. See docs for options. */
  customTheme?: CustomTheme;
  /** Disable interaction. */
  disabled?: boolean;
};

export type WorldPayButtonCustomProps = WorldPayButtonCommonProps & {
  children: (renderProps: {
    show: () => void;
    isMiniKitReady: boolean;
  }) => ReactElement;
};

export function WorldPayButton(props: WorldPayButtonProps) {
  const { theme, mode, customTheme } = props;
  const context = usePayContext();

  return (
    <WorldPayButtonCustom {...props}>
      {({ show, isMiniKitReady }) => (
        <ResetContainer
          $useTheme={theme ?? context.theme}
          $useMode={mode ?? context.mode}
          $customTheme={customTheme ?? context.customTheme}
        >
          <ThemeContainer
            onClick={props.disabled || !isMiniKitReady ? undefined : show}
          >
            <ThemedButton>
              <DaimoPayButtonInner />
            </ThemedButton>
          </ThemeContainer>
        </ResetContainer>
      )}
    </WorldPayButtonCustom>
  );
}

function WorldPayButtonCustom(props: WorldPayButtonCustomProps) {
  const pay = useDaimoPay();
  const context = usePayContext();
  const { log } = context;
  const [isMiniKitReady, setIsMiniKitReady] = useState(false);

  useEffect(() => {
    log("[WORLD] Installing MiniKit");
    const result = MiniKit.install();
    log("[WORLD] MiniKit install result", result);
    log("[WORLD] MiniKit is installed", MiniKit.isInstalled());
    setIsMiniKitReady(MiniKit.isInstalled());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    log("[WORLD] Creating preview order");
    pay.createPreviewOrder(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay, JSON.stringify(props)]);

  const showSpinner = useCallback(() => {
    log(`[WORLD] showing spinner ${pay.order?.id}`);
    const modalOptions = {
      closeOnSuccess: props.closeOnSuccess,
      resetOnSuccess: props.resetOnSuccess,
    };
    context.showPayment(modalOptions);
    context.setRoute(ROUTES.CONFIRMATION);
  }, [context, pay.order?.id, log, props.closeOnSuccess, props.resetOnSuccess]);

  const show = useCallback(async () => {
    log(`[WORLD] showing payment ${pay.order?.id}`);
    if (!isMiniKitReady) {
      console.error(
        "[WORLD] MiniKit is not installed. Please install @worldcoin/minikit-js to use this feature.",
      );
      return;
    }

    if (
      ["payment_started", "payment_completed", "payment_bounced"].includes(
        pay.paymentState,
      )
    ) {
      showSpinner();
      return;
    }

    log(`[WORLD] hydrating order ${pay.order?.id}`);
    const { order } = await pay.hydrateOrder();
    log(
      `[WORLD] hydrated order ${pay.order?.id}. Prompting payment with MiniKit`,
    );
    const payRes = await promptWorldcoinPayment(order, context.trpc);
    if (payRes == null || payRes.finalPayload.status == "error") {
      log("[WORLD] Failed to prompt Worldcoin payment: ", payRes);
      return;
    }

    log(`[WORLD] triggering payment search on ${pay.order?.id}`);
    pay.paySource();

    // Optimistically assume the source payment is correct and show the
    // confirmation spinner
    showSpinner();
  }, [pay, showSpinner, context.trpc, isMiniKitReady, log]);

  return props.children({ show, isMiniKitReady });
}

WorldPayButtonCustom.displayName = "WorldPayButton.Custom";

WorldPayButton.Custom = WorldPayButtonCustom;
