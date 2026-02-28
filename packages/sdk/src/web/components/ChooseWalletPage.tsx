import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";
import type { EthereumProvider } from "../hooks/walletProvider.js";

import { t } from "../hooks/locale.js";
import { PageHeader, resolveIconUrl } from "./shared.js";

type ChooseWalletPageProps = {
  node: NavNodeChooseOption;
  injectedWallets: InjectedWallet[];
  onInjectedWalletSelect: (provider: EthereumProvider, walletName: string, walletIcon: string) => void;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
};

const MAX_VISIBLE_ROWS = 4;
const ROW_HEIGHT = 64;
const ROW_GAP = 12;

/** Wallet selection page: EIP-6963 browser wallets at top, deeplink wallets below. */
export function ChooseWalletPage({
  node,
  injectedWallets,
  onInjectedWalletSelect,
  onNavigate,
  onBack,
}: ChooseWalletPageProps) {
  const totalRows = injectedWallets.length + node.options.length;
  const needsScroll = totalRows > MAX_VISIBLE_ROWS;
  const maxListHeight =
    MAX_VISIBLE_ROWS * ROW_HEIGHT + (MAX_VISIBLE_ROWS - 1) * ROW_GAP;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} />

      <div className="px-6 pb-4">
        <div
          className={`flex flex-col gap-3 ${needsScroll ? "overflow-y-auto scroll-fade" : ""}`}
          style={needsScroll ? { maxHeight: maxListHeight } : undefined}
        >
          {injectedWallets.map((w) => (
            <InjectedWalletRow
              key={w.info.rdns}
              wallet={w}
              onClick={() => onInjectedWalletSelect(w.provider, w.info.name, w.info.icon)}
            />
          ))}

          {node.options.map((option) => (
            <DeeplinkWalletRow
              key={option.id}
              option={option}
              onClick={() => onNavigate(option.id)}
            />
          ))}
        </div>
      </div>
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
