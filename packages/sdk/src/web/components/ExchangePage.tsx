import type { NavNodeCashApp, NavNodeExchange } from "../api/navTree.js";

import { isDesktopBrowser } from "../isDesktopBrowser.js";
import { ExternalLinkIcon, PrimaryButton, SecondaryButton } from "./buttons.js";
import { Countdown, useCountdown } from "./Countdown.js";
import { t } from "../hooks/locale.js";
import { CenteredContent, PageHeader, PageLogo, resolveIconUrl } from "./shared.js";
import { QRCode } from "./QRCode.js";

/** Lightning invoices expire in ~2 minutes */
const LIGHTNING_LIFETIME_S = 120;

type ExchangePageProps = {
  node: NavNodeExchange | NavNodeCashApp;
  exchangeUrl?: string;
  waitingMessage?: string;
  expiresAt?: number;
  isLoading?: boolean;
  onBack: () => void;
  onRetry?: () => void;
  baseUrl: string;
};

export function ExchangePage({
  node,
  exchangeUrl,
  waitingMessage,
  expiresAt,
  isLoading,
  onBack,
  onRetry,
  baseUrl,
}: ExchangePageProps) {
  const desktop = isDesktopBrowser();
  const exchangeId = node.type === "CashApp" ? "CashApp" : node.exchangeId;
  const showQR = desktop && exchangeId !== "Coinbase";

  const placeholderDensity =
    exchangeId === "Binance" ? "medium" as const :
    "short" as const;

  const { remainingS, isExpired } = useCountdown(
    expiresAt ?? 0,
    LIGHTNING_LIFETIME_S,
  );

  const openExchange = () => {
    if (!exchangeUrl) return;
    if (desktop && exchangeId === "Coinbase") {
      window.open(exchangeUrl, "coinbase", "width=300,height=600");
    } else {
      window.open(exchangeUrl, "_blank");
    }
  };

  // Desktop QR view for Binance, Lemon, CashApp
  if (showQR) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PageHeader title={node.title} onBack={onBack} />
        <CenteredContent>
          {isExpired ? (
            <div className="h-24 flex items-center justify-center">
              <SecondaryButton onClick={onRetry}>
                {t.refreshInvoice}
              </SecondaryButton>
            </div>
          ) : (
            <div className="w-full max-w-[200px] sm:max-w-[260px]">
              <QRCode
                value={exchangeUrl}
                placeholderDensity={placeholderDensity}
                image={
                  node.icon ? (
                    <img
                      src={resolveIconUrl(node.icon, baseUrl)}
                      alt={node.title}
                      className="w-full h-full object-contain rounded-[25%]"
                    />
                  ) : undefined
                }
              />
            </div>
          )}
          {exchangeUrl && !isExpired && (
            <p className="text-[var(--daimo-text-secondary)] text-center max-w-xs text-sm whitespace-pre-line">
              {waitingMessage || t.scanWithPhone}
            </p>
          )}
          {expiresAt && (
            <Countdown
              remainingS={remainingS}
              isExpired={isExpired}
              totalS={LIGHTNING_LIFETIME_S}
            />
          )}
        </CenteredContent>
      </div>
    );
  }

  // Mobile (all exchanges) and desktop Coinbase (popup)
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} />
      <CenteredContent>
        {node.icon && <PageLogo icon={node.icon} alt={node.title} baseUrl={baseUrl} />}
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 max-w-xs w-full">
            <div className="h-4 w-4/5 rounded bg-[var(--daimo-surface-secondary)] animate-pulse" />
            <div className="h-4 w-3/5 rounded bg-[var(--daimo-surface-secondary)] animate-pulse" />
          </div>
        ) : (
          <p className="text-[var(--daimo-text-secondary)] text-center max-w-xs whitespace-pre-line">
            {waitingMessage ||
              `${t.continueTo} ${node.title} ${t.toCompleteYourDeposit}`}
          </p>
        )}
        {expiresAt && isExpired ? (
          <SecondaryButton onClick={onRetry}>
            {t.refreshInvoice}
          </SecondaryButton>
        ) : (
          <PrimaryButton
            onClick={openExchange}
            icon={<ExternalLinkIcon />}
            disabled={isLoading}
          >
            {t.open} {node.title}
          </PrimaryButton>
        )}
        {expiresAt && (
          <Countdown
            remainingS={remainingS}
            isExpired={isExpired}
            totalS={LIGHTNING_LIFETIME_S}
          />
        )}
      </CenteredContent>
    </div>
  );
}
