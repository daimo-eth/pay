import { ethereum, solana } from "../../common/chain.js";

import { PageHeader, getChainLogoUrl } from "./shared.js";

type ChooseChainPageProps = {
  walletName: string;
  walletIcon: string;
  onSelectChain: (chain: "evm" | "solana") => void;
  onBack: (() => void) | null;
};

export function ChooseChainPage({
  walletName,
  walletIcon,
  onSelectChain,
  onBack,
}: ChooseChainPageProps) {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={walletName} onBack={onBack} />

      <div className="flex flex-col items-center gap-6 px-6 py-4">
        {walletIcon && (
          <img
            src={walletIcon}
            alt={walletName}
            className="w-16 h-16 object-contain rounded-[25%]"
          />
        )}

        <div className="flex flex-col gap-3 w-full">
          <ChainRow
            label="Ethereum"
            icon={getChainLogoUrl(ethereum.chainId)}
            onClick={() => onSelectChain("evm")}
          />
          <ChainRow
            label="Solana"
            icon={getChainLogoUrl(solana.chainId)}
            onClick={() => onSelectChain("solana")}
          />
        </div>
      </div>
    </div>
  );
}

function ChainRow({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-16 shrink-0 flex items-center justify-between px-5 rounded-[var(--daimo-radius-lg)] bg-[var(--daimo-surface-secondary)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] transition-colors text-left"
    >
      <span className="text-[var(--daimo-text)] font-semibold">{label}</span>
      <img
        src={icon}
        alt={label}
        className="w-8 h-8 object-contain rounded-full"
      />
    </button>
  );
}
