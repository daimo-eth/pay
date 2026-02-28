import type { DaimoPayToken, WalletPaymentOption } from "../api/walletTypes.js";
import { getChainName } from "../../common/chain.js";

import { t } from "../hooks/locale.js";
import { PageHeader, TokenIconWithChainBadge } from "./shared.js";

type SelectTokenPageProps = {
  /** Token options, or null if not yet loaded */
  options: WalletPaymentOption[] | null;
  /** Loading state - show skeletons */
  isLoading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonCount?: number;
  onSelect: (option: WalletPaymentOption) => void;
};

/** Token selection page for wallet payment flow */
export function SelectTokenPage({
  options,
  isLoading = false,
  skeletonCount = 11,
  onSelect,
}: SelectTokenPageProps) {
  // Show skeletons while loading
  if (isLoading || options === null) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="shrink-0">
          <PageHeader title={t.selectToken} />
        </div>
        {/* Scrollable container */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-fade px-6 pb-4">
          {/* Bottom-up layout: items align to bottom when few, scroll normally when full.
              - min-h-full ensures wrapper spans at least the full scroll area
              - justify-end pushes items to bottom for easier thumb reach on mobile
              - when items exceed container height, normal top-down scrolling kicks in */}
          <div className="min-h-full flex flex-col justify-end gap-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Filter options: valid tokens first, then disabled (insufficient balance or liquidity)
  const validOptions = options.filter(
    (opt) => opt.balance.usd >= opt.minimumRequired.usd && !opt.disabledReason,
  );
  const disabledOptions = options.filter(
    (opt) => opt.balance.usd < opt.minimumRequired.usd || opt.disabledReason,
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="shrink-0">
        <PageHeader title={t.selectToken} />
      </div>
      {/* Scrollable container */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-fade px-6 pb-4">
        {options.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-[var(--daimo-text-secondary)]">
              {t.noTokensFound}
            </p>
          </div>
        ) : (
          /* Bottom-up layout: items align to bottom when few, scroll normally when full.
             - min-h-full ensures wrapper spans at least the full scroll area
             - justify-end pushes items to bottom for easier thumb reach on mobile
             - when items exceed container height, normal top-down scrolling kicks in */
          <div className="min-h-full flex flex-col justify-end gap-3">
            {/* Valid options - selectable */}
            {validOptions.map((option) => (
              <TokenRow
                key={getTokenKey(option.balance.token)}
                option={option}
                onSelect={onSelect}
              />
            ))}
            {/* Disabled options - insufficient balance or liquidity */}
            {disabledOptions.map((option) => (
              <TokenRow
                key={getTokenKey(option.balance.token)}
                option={option}
                onSelect={onSelect}
                disabled
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Skeleton loading row - matches TokenRow dimensions with token + chain badge */
function SkeletonRow() {
  return (
    <div className="w-full h-16 shrink-0 flex items-center justify-between px-5 rounded-[var(--daimo-radius-lg)] bg-[var(--daimo-surface-secondary)] animate-pulse">
      <div className="flex-1 min-w-0 mr-3">
        <div
          className="h-5 w-48 rounded mb-2"
          style={{ backgroundColor: "var(--daimo-skeleton)" }}
        />
        <div
          className="h-4 w-32 rounded"
          style={{ backgroundColor: "var(--daimo-skeleton)" }}
        />
      </div>
      {/* Token icon + chain badge skeleton */}
      <div className="relative w-8 h-8 shrink-0">
        <div
          className="w-8 h-8 rounded-full"
          style={{ backgroundColor: "var(--daimo-skeleton)" }}
        />
        <div
          className="absolute -bottom-0.5 -right-0.5 w-[15px] h-[15px] rounded-full"
          style={{
            backgroundColor: "var(--daimo-skeleton)",
            border: "1px solid var(--daimo-surface-secondary)",
          }}
        />
      </div>
    </div>
  );
}

type TokenRowProps = {
  option: WalletPaymentOption;
  onSelect: (option: WalletPaymentOption) => void;
  disabled?: boolean;
};

/**
 * Token option row - 64px height, matching ChooseOptionPage row style.
 * Shows "$X TOKEN on Chain" with "Y TOKEN" subtitle.
 */
function TokenRow({ option, onSelect, disabled = false }: TokenRowProps) {
  const chainName = getChainName(option.balance.token.chainId);
  const tokenAmount = formatTokenAmount(
    option.balance.amount,
    option.balance.token,
  );
  const usdAmount = formatUsdAmount(option.balance.usd);
  const disabledReason =
    option.disabledReason ??
    (option.balance.usd < option.minimumRequired.usd
      ? `$${option.minimumRequired.usd.toFixed(2)} ${t.minimum.toLowerCase()}`
      : null);

  const title = `$${usdAmount} ${option.balance.token.symbol} ${t.onChain} ${chainName}`;
  const subtitle =
    disabled && disabledReason
      ? disabledReason
      : `${tokenAmount} ${option.balance.token.symbol}`;

  return (
    <button
      onClick={() => !disabled && onSelect(option)}
      disabled={disabled}
      className={`w-full h-16 shrink-0 flex items-center justify-between px-5 rounded-[var(--daimo-radius-lg)] text-left touch-action-manipulation transition-[background-color,transform] duration-150 ease-out ${
        disabled
          ? "opacity-50 cursor-not-allowed bg-[var(--daimo-surface-secondary)]"
          : "bg-[var(--daimo-surface-secondary)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] active:scale-[0.98]"
      }`}
    >
      <div className="flex-1 min-w-0 mr-3">
        {/* Use tabular-nums for consistent number widths */}
        <div
          className={`font-semibold truncate tabular-nums ${
            disabled
              ? "text-[var(--daimo-text-muted)]"
              : "text-[var(--daimo-text)]"
          }`}
        >
          {title}
        </div>
        <div className="text-sm text-[var(--daimo-text-secondary)] truncate tabular-nums">
          {subtitle}
        </div>
      </div>
      <TokenIconWithChainBadge token={option.balance.token} size="sm" />
    </button>
  );
}

// --- Helpers ---

/** Unique key for a token */
function getTokenKey(token: DaimoPayToken): string {
  return `${token.chainId}-${token.token}`;
}

/** Format token amount for display - shows full precision */
function formatTokenAmount(amount: string, token: DaimoPayToken): string {
  const num = parseFloat(amount) / Math.pow(10, token.decimals);
  if (num === 0) return "0";
  // Use displayDecimals from token, fallback to sensible defaults
  const decimals = token.displayDecimals ?? (num < 1 ? 6 : 2);
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** Format USD amount for display */
function formatUsdAmount(usd: number): string {
  return usd.toFixed(2);
}
