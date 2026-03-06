import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";

import {
  ListRow,
  PageHeader,
  ScrollContent,
  resolveIconUrl,
  useScrollBorder,
} from "./shared.js";

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
  const { scrolled, onScroll } = useScrollBorder();
  const injectedNames = new Set(
    injectedWallets.map((w) => w.info.name.toLowerCase()),
  );
  const deeplinkOptions = node.options.filter(
    (option) =>
      option.type !== "Deeplink" ||
      !injectedNames.has(option.title.toLowerCase()),
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} borderVisible={scrolled} />

      <ScrollContent onScroll={onScroll} grow={false}>
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
    <ListRow
      label={wallet.info.name}
      right={
        <img
          src={wallet.info.icon}
          alt={wallet.info.name}
          className="w-8 h-8 object-contain rounded-[25%]"
        />
      }
      onClick={onClick}
    />
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
    <ListRow
      label={label}
      right={
        icon ? (
          <img
            src={resolveIconUrl(icon)}
            alt={label}
            className="w-8 h-8 object-contain rounded-[25%]"
          />
        ) : undefined
      }
      onClick={onClick}
    />
  );
}
