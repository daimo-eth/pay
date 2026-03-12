import { TokenLogo } from "../../common/token.js";
import type { NavNodeDepositAddress } from "../api/navTree.js";
import type { DaimoPayToken } from "../api/walletTypes.js";

import { t } from "../hooks/locale.js";
import { PrimaryButton } from "./buttons.js";
import {
  AmountInput,
  PageHeader,
  TokenIconWithChainBadge,
  resolveIconUrl,
  useAmountInput,
} from "./shared.js";

type SelectAmountPageProps = {
  node: NavNodeDepositAddress | { icon?: string; title: string };
  minimumUsd: number;
  maximumUsd: number;
  /** Token suffix for display (e.g., "USDC", "USDT") */
  tokenSuffix?: string;
  /** Chain ID for token badge display */
  chainId?: number;
  /** Optional back handler. If undefined, back button is hidden. */
  onBack?: () => void;
  onContinue: (amountUsd: number) => void;
  isLoading?: boolean;
  error?: string | null;
  baseUrl: string;
};

export function SelectAmountPage({
  node,
  minimumUsd,
  maximumUsd,
  tokenSuffix,
  chainId,
  onBack,
  onContinue,
  isLoading,
  error,
  baseUrl,
}: SelectAmountPageProps) {
  const { amountUsd, isValid, handleChange } = useAmountInput(
    minimumUsd,
    maximumUsd,
  );

  // Create pseudo-token for display if tokenSuffix is USDC or USDT and chainId is provided
  const selectedToken =
    tokenSuffix === "USDC" || tokenSuffix === "USDT" ? tokenSuffix : null;

  const displayToken: DaimoPayToken | null =
    selectedToken && chainId != null
      ? ({
          chainId,
          token: "0x0" as `0x${string}`,
          symbol: selectedToken,
          decimals: 6,
          logoURI: selectedToken === "USDC" ? TokenLogo.USDC : TokenLogo.USDT,
          logoSourceURI: "",
          usd: 1,
          priceFromUsd: 1,
          maxAcceptUsd: 1000000,
          maxSendUsd: 1000000,
          displayDecimals: 2,
        } as DaimoPayToken)
      : null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={t.selectAmount} onBack={onBack} />
      {/* Content */}
      <div className="flex-1 flex flex-col items-center p-6">
        {/* Logo - Token with chain badge when available */}
        <div className="h-24 flex items-center justify-center mb-3">
          {displayToken ? (
            <TokenIconWithChainBadge
              token={displayToken}
              size="lg"
              badgeBorderClass="border-2 bg-[var(--daimo-surface)] border-[var(--daimo-surface)]"
              baseUrl={baseUrl}
            />
          ) : (
            node.icon && (
              <img
                src={resolveIconUrl(node.icon, baseUrl)}
                alt={node.title}
                className="w-20 h-20 rounded-[25%]"
              />
            )
          )}
        </div>

        {/* Amount input */}
        <div className="mb-6">
          <AmountInput
            minimumUsd={minimumUsd}
            maximumUsd={maximumUsd}
            onSubmit={onContinue}
            onChange={handleChange}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="text-red-500 text-sm text-center mb-3">{error}</div>
        )}

        <PrimaryButton
          onClick={() => isValid && !isLoading && onContinue(amountUsd)}
          disabled={!isValid || isLoading}
          className="max-w-none"
        >
          {isLoading ? t.loading : t.continue}
        </PrimaryButton>
      </div>
    </div>
  );
}
