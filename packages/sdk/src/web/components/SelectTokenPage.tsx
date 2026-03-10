import { getChainName } from "../../common/chain.js";
import type { DaimoPayToken, WalletPaymentOption } from "../api/walletTypes.js";

import { t } from "../hooks/locale.js";
import {
  LIST_ROW_CLASS,
  ListRow,
  PageHeader,
  ScrollContent,
  TokenIconWithChainBadge,
  useScrollBorder,
} from "./shared.js";

type SelectTokenPageProps = {
  /** Token options, or null if not yet loaded */
  options: WalletPaymentOption[] | null;
  /** Loading state - show skeletons */
  isLoading?: boolean;
  /** Number of skeleton rows to show while loading */
  skeletonCount?: number;
  /** Show the required payment amount instead of the user's balance */
  showRequired?: boolean;
  onSelect: (option: WalletPaymentOption) => void;
  onBack?: (() => void) | null;
  baseUrl: string;
};

/** Token selection page for wallet payment flow */
export function SelectTokenPage({
  options,
  isLoading = false,
  skeletonCount = 11,
  showRequired = false,
  onSelect,
  onBack,
  baseUrl,
}: SelectTokenPageProps) {
  const { scrolled, atBottom, onScroll } = useScrollBorder();

  // Show skeletons while loading
  if (isLoading || options === null) {
    return (
      <div className="flex flex-col flex-1 min-h-0">
        <PageHeader
          title={t.selectToken}
          onBack={onBack}
          borderVisible={scrolled}
        />
        <ScrollContent onScroll={onScroll} atBottom={atBottom} fade>
          <div className="flex flex-col gap-3">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </ScrollContent>
      </div>
    );
  }

  const validOptions = options.filter(
    (opt) => opt.balance.usd >= opt.minimumRequired.usd && !opt.disabledReason,
  );
  const disabledOptions = options.filter(
    (opt) => opt.balance.usd < opt.minimumRequired.usd || opt.disabledReason,
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader
        title={t.selectToken}
        onBack={onBack}
        borderVisible={scrolled}
      />
      <ScrollContent onScroll={onScroll} atBottom={atBottom} fade>
        {options.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-[var(--daimo-text-secondary)]">
              {t.noTokensFound}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {validOptions.map((option) => (
              <TokenRow
                key={getTokenKey(option.balance.token)}
                option={option}
                showRequired={showRequired}
                onSelect={onSelect}
                baseUrl={baseUrl}
              />
            ))}
            {disabledOptions.map((option) => (
              <TokenRow
                key={getTokenKey(option.balance.token)}
                option={option}
                showRequired={showRequired}
                onSelect={onSelect}
                disabled
                baseUrl={baseUrl}
              />
            ))}
          </div>
        )}
      </ScrollContent>
    </div>
  );
}

/** Skeleton loading row - matches TokenRow dimensions with token + chain badge */
function SkeletonRow() {
  return (
    <div className={`${LIST_ROW_CLASS} animate-pulse`}>
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
  showRequired?: boolean;
  onSelect: (option: WalletPaymentOption) => void;
  disabled?: boolean;
  baseUrl: string;
};

/**
 * Token option row - 64px height, matching ChooseOptionPage row style.
 * Shows "$X TOKEN on Chain" with "Y TOKEN" subtitle.
 */
function TokenRow({ option, showRequired = false, onSelect, disabled = false, baseUrl }: TokenRowProps) {
  const display = showRequired ? option.required : option.balance;
  const chainName = getChainName(display.token.chainId);
  const tokenAmount = formatTokenAmount(display.amount, display.token);
  const usdAmount = formatUsdAmount(display.usd);
  const disabledReason =
    option.disabledReason ??
    (option.balance.usd < option.minimumRequired.usd
      ? `$${option.minimumRequired.usd.toFixed(2)} ${t.minimum.toLowerCase()}`
      : null);

  const title = `$${usdAmount} ${display.token.symbol} ${t.onChain} ${chainName}`;
  const subtitle =
    disabled && disabledReason
      ? disabledReason
      : `${tokenAmount} ${display.token.symbol}`;

  return (
    <ListRow
      label={title}
      subtitle={subtitle}
      right={<TokenIconWithChainBadge token={display.token} size="sm" baseUrl={baseUrl} />}
      onClick={() => onSelect(option)}
      disabled={disabled}
    />
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
