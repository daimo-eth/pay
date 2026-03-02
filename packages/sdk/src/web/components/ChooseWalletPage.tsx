import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";

import { PageHeader, ScrollContent, resolveIconUrl } from "./shared.js";

type ChooseWalletPageProps = {
  node: NavNodeChooseOption;
  injectedWallets: InjectedWallet[];
  onInjectedWalletSelect: (wallet: InjectedWallet) => void;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
};

/** Wallet selection page: EIP-6963 browser wallets at top, deeplink wallets below. */
export function ChooseWalletPage({
  node,
  injectedWallets,
  onInjectedWalletSelect,
  onNavigate,
  onBack,
}: ChooseWalletPageProps) {
  const injectedNames = new Set(
    injectedWallets.map((w) => w.info.name.toLowerCase()),
  );
  const deeplinkOptions = node.options.filter(
    (option) => !injectedNames.has(option.title.toLowerCase()),
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} />

      <ScrollContent>
        <div className="flex flex-col gap-3">
          {injectedWallets.map((w) => (
            <InjectedWalletRow
              key={w.info.rdns}
              wallet={w}
              onClick={() => onInjectedWalletSelect(w)}
            />
          ))}

          {deeplinkOptions.map((option) => (
            <DeeplinkWalletRow
              key={option.id}
              option={option}
              onClick={() => onNavigate(option.id)}
            />
          ))}
        </div>
      </ScrollContent>
    </div>
  );
}

function InjectedWalletRow({
  wallet,
  onClick,
}: {
  wallet: InjectedWallet;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full h-16 shrink-0 flex items-center justify-between px-5 rounded-[var(--daimo-radius-lg)] bg-[var(--daimo-surface-secondary)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] transition-colors text-left"
    >
      <span className="text-[var(--daimo-text)] font-semibold">
        {wallet.info.name}
      </span>
      <img
        src={wallet.info.icon}
        alt={wallet.info.name}
        className="w-8 h-8 object-contain rounded-[25%]"
      />
    </button>
  );
}

function DeeplinkWalletRow({
  option,
  onClick,
}: {
  option: NavNode;
  onClick: () => void;
}) {
  const label = option.label ?? option.title;
  const icon = "icon" in option && option.icon ? option.icon : null;

  return (
    <button
      onClick={onClick}
      className="w-full h-16 shrink-0 flex items-center justify-between px-5 rounded-[var(--daimo-radius-lg)] bg-[var(--daimo-surface-secondary)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] transition-colors text-left"
    >
      <span className="text-[var(--daimo-text)] font-semibold">{label}</span>
      {icon && (
        <img
          src={resolveIconUrl(icon)}
          alt={label}
          className="w-8 h-8 object-contain rounded-[25%]"
        />
      )}
    </button>
  );
}
