import { ethereum, solana } from "../../common/chain.js";

import { ListRow, PageHeader, getChainLogoUrl } from "./shared.js";

type ChooseChainPageProps = {
  walletName: string;
  walletIcon: string;
  onSelectChain: (chain: "evm" | "solana") => void;
  onBack: (() => void) | null;
  baseUrl: string;
};

export function ChooseChainPage({
  walletName,
  walletIcon,
  onSelectChain,
  onBack,
  baseUrl,
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
            icon={getChainLogoUrl(ethereum.chainId, baseUrl)}
            onClick={() => onSelectChain("evm")}
          />
          <ChainRow
            label="Solana"
            icon={getChainLogoUrl(solana.chainId, baseUrl)}
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
    <ListRow
      label={label}
      right={
        <img
          src={icon}
          alt={label}
          className="w-8 h-8 object-contain rounded-full"
        />
      }
      onClick={onClick}
    />
  );
}
