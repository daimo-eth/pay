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

export type WorldPayButtonPaymentProps = {
  /**
   * Your public app ID. Specify either (payId) or (appId + parameters).
   */
  appId: string;
  /**
   * Your World Mini App app ID.
   */
  worldAppId: string;
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

export type WorldPayButtonProps = WorldPayButtonPaymentProps & {
  /** Light mode, dark mode, or auto. */
  mode?: Mode;
  /** Named theme. See docs for options. */
  theme?: Theme;
  /** Custom theme. See docs for options. */
  customTheme?: CustomTheme;
  /** Disable interaction. */
  disabled?: boolean;
};

export type WorldPayButtonCustomProps = WorldPayButtonProps & {
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
          <ThemeContainer onClick={!props.disabled && isMiniKitReady && show}>
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
  const [isMiniKitReady, setIsMiniKitReady] = useState(false);

  useEffect(() => {
    // Dynamically import @worldcoin/minikit-js to avoid bundling it for
    // developers who don't use World Mini App features, as it's an optional
    // peer dependency.
    import(/* webpackIgnore: true */ "@worldcoin/minikit-js")
      .then(({ MiniKit }) => {
        if (MiniKit.isInstalled()) {
          setIsMiniKitReady(true);
        } else {
          setIsMiniKitReady(false);
        }
      })
      .catch(() => {
        setIsMiniKitReady(false);
      });
  }, []);

  useEffect(() => {
    pay.createPreviewOrder(props);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pay, JSON.stringify(props)]);

  const showSpinner = useCallback(() => {
    context.showPayment({});
    context.setRoute(ROUTES.CONFIRMATION);
  }, [context]);

  const show = useCallback(async () => {
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

    const { order } = await pay.hydrateOrder();
    const payRes = await promptWorldcoinPayment(order, context.trpc);
    if (payRes == null || payRes.finalPayload.status == "error") {
      console.error("[WORLD] Failed to prompt Worldcoin payment: ", payRes);
      return;
    }

    pay.paySource();

    // Optimistically assume the source payment is correct and show the
    // confirmation spinner
    showSpinner();
  }, [pay, showSpinner, context.trpc, isMiniKitReady]);

  return props.children({ show, isMiniKitReady });
}

WorldPayButton.displayName = "WorldPayButton";

WorldPayButton.Custom = WorldPayButtonCustom;
