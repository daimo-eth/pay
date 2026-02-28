import type { NavNodeExchange } from "../api/navTree.js";

import { ExternalLinkIcon, PrimaryButton } from "./buttons.js";
import { t } from "../hooks/locale.js";
import { CenteredContent, PageHeader, PageLogo } from "./shared.js";

type ExchangePageProps = {
  node: NavNodeExchange;
  exchangeUrl?: string;
  waitingMessage?: string;
  isLoading?: boolean;
  onBack: () => void;
};

export function ExchangePage({
  node,
  exchangeUrl,
  waitingMessage,
  isLoading,
  onBack,
}: ExchangePageProps) {
  const openExchange = () => {
    if (exchangeUrl) window.open(exchangeUrl, "_blank");
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} />
      <CenteredContent>
        {node.icon && <PageLogo icon={node.icon} alt={node.title} />}
        {isLoading ? (
          <div className="flex flex-col items-center gap-2 max-w-xs w-full">
            <div className="h-4 w-4/5 rounded bg-[var(--daimo-surface-secondary)] animate-pulse" />
            <div className="h-4 w-3/5 rounded bg-[var(--daimo-surface-secondary)] animate-pulse" />
          </div>
        ) : (
          <p className="text-[var(--daimo-text-secondary)] text-center max-w-xs">
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
