import { useCallback, useEffect, useRef, useState } from "react";

import type {
  AccountRail,
  DepositConstraints,
  DepositPaymentInfo,
} from "../../../common/account.js";
import { useDaimoClient } from "../../hooks/DaimoClientContext.js";
import { t } from "../../hooks/locale.js";
import { useSessionDepositState } from "../../hooks/useAccountFlow.js";
import { useDraftDeposit } from "../../hooks/useDraftDeposit.js";
import { useDepositPoller } from "../../hooks/useDepositPoller.js";
import { ErrorPage } from "../ErrorPage.js";
import { SecondaryButton } from "../buttons.js";
import { AmountInput, PageHeader, useAmountInput } from "../shared.js";
import { useCoinbaseApplePayWidget } from "./useCoinbaseApplePayWidget.js";

type AccountApplePayPageProps = {
  rail: AccountRail;
  sessionId: string;
  clientSecret: string;
  actionVerb: string;
  initialAmount?: string;
  onBack: () => void;
  onAdvance: () => void;
};

const APPLE_PAY_BUTTON_WIDTH = 296;
const APPLE_PAY_BUTTON_HEIGHT = 44;
const APPLE_PAY_SHELL_MAX_WIDTH = 344;
const APPLE_PAY_EXPANDED_WIDTH = 576;
const APPLE_PAY_EXPANDED_HEIGHT = 576;
const APPLE_PAY_COLLAPSED_SCALE_MAX = 1.18;
const APPLE_PAY_COLLAPSED_CROP_X = 22;
const APPLE_PAY_COLLAPSED_CROP_Y = 6;

/**
 * Coinbase Headless payment page — amount entry + Apple Pay in a single
 * screen. Amount edits keep the backend preview + signatures up to date.
 * Coinbase webhooks drive the deposit lifecycle; iframe events only affect
 * the widget layout.
 *
 * **Iframing + CSP**: pay.coinbase.com serves a `frame-ancestors` CSP
 * header that only allows specific allowlisted domains. In sandbox we append
 * `useApplePaySandbox=true`, but Coinbase may still require the current host
 * to be allowlisted for the iframe to load.
 */
export function AccountApplePayPage({
  rail,
  sessionId,
  clientSecret,
  actionVerb,
  initialAmount,
  onBack,
  onAdvance,
}: AccountApplePayPageProps) {
  const client = useDaimoClient();
  const { accountFlow, depositState } = useSessionDepositState(sessionId);
  const didAdvanceRef = useRef(false);

  const initialAmountValue =
    depositState?.depositAmount ?? initialAmount;

  // --- Static constraints ---
  const [constraints, setConstraints] = useState<DepositConstraints | null>(
    null,
  );
  const constraintsFetchedRef = useRef(false);
  useEffect(() => {
    if (constraintsFetchedRef.current || !accountFlow?.isAuthenticated) return;
    constraintsFetchedRef.current = true;
    void (async () => {
      try {
        const token = await accountFlow.getAccessToken();
        if (!token) {
          constraintsFetchedRef.current = false;
          return;
        }
        const result = await client.account.getDepositConstraints(
          { sessionId, rail },
          { bearerToken: token },
        );
        setConstraints(result);
      } catch (err) {
        constraintsFetchedRef.current = false;
        console.error("[apple-pay] failed to fetch constraints:", err);
      }
    })();
  }, [accountFlow, client, sessionId, rail]);

  const minimum = parseAmountBound(constraints?.minAmount) ?? 5;
  const maximum = parseAmountBound(constraints?.maxAmount) ?? 500;
  const currencySymbol = constraints?.currency.symbol ?? "$";

  // --- Amount entry + staged createDeposit ---
  const { amount, isValid, handleChange } = useAmountInput(
    minimum,
    maximum,
    initialAmountValue,
  );
  const normalizedAmount = amount.toFixed(2);
  const matchesAmount =
    depositState != null && depositState.depositAmount === normalizedAmount;
  const hasStartedDeposit = depositState?.kind === "started";
  const {
    payment: draftPayment,
    isCreating: isCreatingDraft,
    error: draftError,
    retry: retryDraft,
  } = useDraftDeposit({
    client,
    accountFlow,
    sessionId,
    rail,
    depositAmount: normalizedAmount,
    enabled: isValid,
    draftMode: "signed",
  });
  const startedPayment =
    hasStartedDeposit && matchesAmount ? depositState.payment : null;
  const payment: DepositPaymentInfo | null = startedPayment ?? draftPayment;
  const error = draftError;
  const isCreating = isCreatingDraft;
  const paymentLinkUrl =
    payment?.flow === "wallet-pay-widget" ? payment.paymentLinkUrl : null;
  const buttonShellRef = useRef<HTMLDivElement | null>(null);
  const [buttonShellWidth, setButtonShellWidth] = useState(
    APPLE_PAY_SHELL_MAX_WIDTH,
  );
  const refreshFromServer = useCallback(async () => {
    try {
      await client.account.getDeposit({ sessionId, clientSecret, refresh: true });
    } catch (err) {
      console.error("[apple-pay] refreshDeposit failed:", err);
    }
  }, [client, sessionId, clientSecret]);
  const {
    iframeExpanded,
    onIframeLoad,
    iframeReady,
    iframeRef,
    resetWidget,
    widgetError,
  } = useCoinbaseApplePayWidget({
    onRefreshDeposit: refreshFromServer,
    paymentLinkUrl,
  });

  useEffect(() => {
    if (!isValid) {
      didAdvanceRef.current = false;
      return;
    }
    if (!hasStartedDeposit) {
      didAdvanceRef.current = false;
      resetWidget();
    }
  }, [
    normalizedAmount,
    hasStartedDeposit,
    isValid,
    resetWidget,
  ]);

  useEffect(() => {
    const el = buttonShellRef.current;
    if (!el) return;

    const updateWidth = () => {
      const nextWidth = el.getBoundingClientRect().width;
      if (nextWidth > 0) setButtonShellWidth(nextWidth);
    };

    updateWidth();

    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useDepositPoller({
    client,
    sessionId,
    clientSecret,
    onUpdate(deposit) {
      if (
        deposit.status !== "initiated" &&
        deposit.status !== "awaiting_payment"
      ) {
        if (!didAdvanceRef.current) {
          didAdvanceRef.current = true;
          onAdvance();
        }
      }
    },
  });

  if (widgetError) {
    return (
      <ErrorPage
        message={widgetError}
        retryText={t.tryAgain}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const feeUnits =
    payment?.flow === "wallet-pay-widget" ? payment.totalFeeUnits : null;
  const totalUnits =
    payment?.flow === "wallet-pay-widget" ? payment.purchaseAmount : null;
  const isExpanded = iframeExpanded;
  const scaledButtonRatio = buttonShellWidth / APPLE_PAY_BUTTON_WIDTH;
  const buttonScale =
    Number.isFinite(scaledButtonRatio) && scaledButtonRatio > 0
      ? Math.min(scaledButtonRatio, APPLE_PAY_COLLAPSED_SCALE_MAX)
      : 1;
  const collapsedShellHeight = Math.max(
    56,
    Math.round(APPLE_PAY_BUTTON_HEIGHT * buttonScale),
  );
  const collapsedShellRadius = Math.round(collapsedShellHeight / 2);
  const collapsedViewportWidth = Math.max(
    0,
    buttonShellWidth - APPLE_PAY_COLLAPSED_CROP_X * 2,
  );
  const collapsedViewportHeight = Math.max(
    0,
    collapsedShellHeight - APPLE_PAY_COLLAPSED_CROP_Y * 2,
  );
  const shellMaxWidth = isExpanded
    ? `${APPLE_PAY_EXPANDED_WIDTH}px`
    : `${APPLE_PAY_SHELL_MAX_WIDTH}px`;
  const iframeShellHeight = isExpanded
    ? `${APPLE_PAY_EXPANDED_HEIGHT}px`
    : `${collapsedShellHeight}px`;
  const iframeViewportStyle = isExpanded
    ? {
        left: 0,
        top: 0,
        width: "100%",
        height: APPLE_PAY_EXPANDED_HEIGHT,
        borderRadius: "0px",
        transform: "none",
      }
    : {
        left: "50%",
        top: "50%",
        width: collapsedViewportWidth,
        height: collapsedViewportHeight,
        borderRadius: Math.max(
          0,
          collapsedShellRadius - APPLE_PAY_COLLAPSED_CROP_Y,
        ),
        transform: "translate(-50%, -50%)",
      };
  const iframeStyle = isExpanded
    ? {
        left: 0,
        top: 0,
        width: "100%",
        height: APPLE_PAY_EXPANDED_HEIGHT,
        transform: "none",
        transformOrigin: "center center",
      }
    : {
        left: "50%",
        top: "50%",
        width: APPLE_PAY_BUTTON_WIDTH,
        height: APPLE_PAY_BUTTON_HEIGHT,
        transform: `translate(-50%, -50%) scale(${buttonScale})`,
        transformOrigin: "center center",
      };

  return (
    <div className="daimo-relative daimo-isolate daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={`${actionVerb} with Apple Pay`} onBack={onBack} />

      <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-5 daimo-px-6 daimo-pt-2 daimo-pb-4">
        <AmountInput
          minimum={minimum}
          maximum={maximum}
          currencySymbol={currencySymbol}
          initialValue={initialAmountValue}
          disabled={hasStartedDeposit}
          onSubmit={() => {
            /* no-op — payment info is debounced */
          }}
          onChange={handleChange}
        />

        <div className="daimo-w-full daimo-max-w-[320px] daimo-flex daimo-flex-col daimo-gap-1 daimo-text-sm">
          <div className="daimo-flex daimo-items-center daimo-justify-between daimo-text-[var(--daimo-text-muted)]">
            <span>Fee</span>
            {feeUnits != null ? (
              <span>
                {currencySymbol}
                {feeUnits}
              </span>
            ) : (
              <span>{isValid && isCreating ? "…" : "—"}</span>
            )}
          </div>
          <div className="daimo-flex daimo-items-center daimo-justify-between daimo-text-[var(--daimo-text)]">
            <span>You receive</span>
            <span className="daimo-font-semibold">
              {totalUnits != null
                ? `${currencySymbol}${totalUnits}`
                : isValid
                  ? `${currencySymbol}${amount.toFixed(2)}`
                  : `${currencySymbol}0.00`}
            </span>
          </div>
        </div>

        {error && (
          <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-2 daimo-max-w-[320px]">
            <p className="daimo-text-xs daimo-text-[var(--daimo-error)] daimo-text-center">
              {error}
            </p>
            {draftError && (
              <SecondaryButton onClick={retryDraft}>
                {t.tryAgain}
              </SecondaryButton>
            )}
          </div>
        )}
      </div>

      {/* Apple Pay button area — iframe when ready, custom placeholder until then */}
      <div className="daimo-flex-1 daimo-min-h-0 daimo-px-4 daimo-pb-6 daimo-flex daimo-flex-col daimo-items-center daimo-justify-end">
        <div
          ref={buttonShellRef}
          className="daimo-relative daimo-w-full daimo-overflow-hidden"
          style={{
            maxWidth: shellMaxWidth,
            height: iframeShellHeight,
            borderRadius: isExpanded ? "24px" : `${collapsedShellRadius}px`,
            transition:
              "opacity 160ms ease, max-width 160ms ease, height 160ms ease",
          }}
        >
          {paymentLinkUrl ? (
            <>
              {!iframeReady && (
                <div
                  className="daimo-absolute daimo-inset-0 daimo-flex daimo-items-center daimo-justify-center daimo-transition-opacity"
                  style={{
                    opacity: 1,
                    pointerEvents: "none",
                  }}
                >
                  <ApplePayPlaceholderButton
                    disabled={false}
                    loading
                    label="Preparing Apple Pay"
                    height={collapsedShellHeight}
                    radius={collapsedShellRadius}
                  />
                </div>
              )}
              <div
                className="daimo-absolute daimo-overflow-hidden daimo-transition-opacity"
                style={{
                  ...iframeViewportStyle,
                  opacity: iframeReady ? 1 : 0,
                  pointerEvents: iframeReady ? "auto" : "none",
                }}
              >
                <iframe
                  key={paymentLinkUrl}
                  ref={iframeRef}
                  src={paymentLinkUrl}
                  title="Apple Pay Checkout"
                  allow="payment"
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer"
                  onLoad={onIframeLoad}
                  className="daimo-absolute daimo-border-0 daimo-overflow-hidden"
                  style={iframeStyle}
                />
              </div>
            </>
          ) : (
            <ApplePayPlaceholderButton
              disabled={!isValid || isCreating}
              loading={isValid && isCreating}
              label={
                isValid
                  ? isCreating
                    ? "Preparing Apple Pay"
                    : "Apple Pay Ready"
                  : "Enter amount to continue"
              }
              height={collapsedShellHeight}
              radius={collapsedShellRadius}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function parseAmountBound(value: string | undefined): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Daimo-owned CTA shown before the Coinbase iframe is ready so the Apple Pay
 * step feels native to the modal instead of dropping in third-party chrome
 * immediately.
 */
function ApplePayPlaceholderButton({
  disabled,
  loading,
  label,
  height,
  radius,
  onClick,
}: {
  disabled: boolean;
  loading: boolean;
  label: string;
  height?: number;
  radius?: number;
  onClick?: () => void;
}) {
  const content = (
    <>
      {loading && <Spinner />}
      <span>{label}</span>
    </>
  );

  const className =
    "daimo-w-full daimo-flex daimo-items-center daimo-justify-center daimo-gap-2 daimo-px-5 daimo-text-[15px] daimo-font-medium daimo-select-none daimo-touch-action-manipulation daimo-transition-[background-color,transform,opacity] daimo-duration-150 daimo-ease";
  const style = {
    height: height != null ? `${height}px` : undefined,
    borderRadius: radius != null ? `${radius}px` : undefined,
    backgroundColor: "var(--daimo-surface-secondary)",
    color: disabled ? "var(--daimo-text-muted)" : "var(--daimo-text)",
    border: "1px solid var(--daimo-border)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.04), 0 12px 24px rgba(0,0,0,0.06)",
    opacity: loading ? 0.92 : 1,
    fontVariantNumeric: "tabular-nums",
  } satisfies React.CSSProperties;

  if (!onClick) {
    return (
      <div className={className} style={style} aria-disabled>
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${className} hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-hover)] active:daimo-scale-[0.99]`}
      style={style}
    >
      {content}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="daimo-animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
