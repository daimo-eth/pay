import type { NavNodeCashApp, NavNodeExchange } from "../api/navTree.js";

import { isDesktopBrowser } from "../isDesktopBrowser.js";
import { ExternalLinkIcon, PrimaryButton } from "./buttons.js";
import { t } from "../hooks/locale.js";
import {
  CenteredContent,
  PageHeader,
  PageLogo,
  resolveIconUrl,
} from "./shared.js";
import { QRCode } from "./QRCode.js";

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
  isLoading,
  onBack,
  baseUrl,
}: ExchangePageProps) {
  const desktop = isDesktopBrowser();
  const exchangeId = node.type === "CashApp" ? "CashApp" : node.exchangeId;
  const showQR = desktop && exchangeId !== "Coinbase";

  const placeholderDensity =
    exchangeId === "Binance" ? ("medium" as const) : ("short" as const);

  const openExchange = () => {
    if (!exchangeUrl) return;
    if (desktop && exchangeId === "Coinbase") {
      window.open(exchangeUrl, "coinbase", "width=500,height=700");
    } else {
      window.open(exchangeUrl, "_blank");
    }
  };

  // Desktop QR view for Binance, Lemon, CashApp
  if (showQR) {
    return (
      <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
        <PageHeader title={node.title} onBack={onBack} />
        <CenteredContent>
          <div className="daimo-w-full daimo-max-w-[200px] sm:daimo-max-w-[260px]">
            <QRCode
              value={exchangeUrl}
              placeholderDensity={placeholderDensity}
              image={
                node.icon ? (
                  <img
                    src={resolveIconUrl(node.icon, baseUrl)}
                    alt={node.title}
                    className="daimo-w-full daimo-h-full daimo-object-contain daimo-rounded-[25%]"
                  />
                ) : undefined
              }
            />
          </div>
          {exchangeUrl && (
            <p className="daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs daimo-text-sm daimo-whitespace-pre-line">
              {waitingMessage || t.scanWithPhone}
            </p>
          )}
        </CenteredContent>
      </div>
    );
  }

  // Mobile (all exchanges) and desktop Coinbase (popup)
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={node.title} onBack={onBack} />
      <CenteredContent>
        {node.icon && (
          <PageLogo icon={node.icon} alt={node.title} baseUrl={baseUrl} />
        )}
        {isLoading ? (
          <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-2 daimo-max-w-xs daimo-w-full">
            <div className="daimo-h-4 daimo-w-4/5 daimo-rounded daimo-bg-[var(--daimo-surface-secondary)] daimo-animate-daimo-pulse" />
            <div className="daimo-h-4 daimo-w-3/5 daimo-rounded daimo-bg-[var(--daimo-surface-secondary)] daimo-animate-daimo-pulse" />
          </div>
        ) : (
          <p className="daimo-text-[var(--daimo-text-secondary)] daimo-text-center daimo-max-w-xs daimo-whitespace-pre-line">
            {waitingMessage ||
              `${t.continueTo} ${node.title} ${t.toCompleteYourDeposit}`}
          </p>
        )}
        <PrimaryButton
          onClick={openExchange}
          icon={<ExternalLinkIcon />}
          disabled={isLoading}
        >
          {t.open} {node.title}
        </PrimaryButton>
      </CenteredContent>
    </div>
  );
}
