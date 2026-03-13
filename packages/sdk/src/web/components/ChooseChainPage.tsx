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
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={walletName} onBack={onBack} />

      <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-6 daimo-px-6 daimo-py-4">
        {walletIcon && (
          <img
            src={walletIcon}
            alt={walletName}
            className="daimo-w-16 daimo-h-16 daimo-object-contain daimo-rounded-[25%]"
          />
        )}

        <div className="daimo-flex daimo-flex-col daimo-gap-3 daimo-w-full">
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
          className="daimo-w-8 daimo-h-8 daimo-object-contain daimo-rounded-full"
        />
      }
      onClick={onClick}
    />
  );
}
