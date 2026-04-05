import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";

import { t } from "../hooks/locale.js";
import { OptionIcons } from "./ChooseOptionPage.js";
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
  isDesktop?: boolean;
  onInjectedWalletSelect: (wallet: InjectedWallet) => void;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
  baseUrl: string;
};

/** Wallet selection page: EIP-6963 browser wallets at top, deeplink wallets below. */
export function ChooseWalletPage({
  node,
  injectedWallets,
  isDesktop = false,
  onInjectedWalletSelect,
  onNavigate,
  onBack,
  baseUrl,
}: ChooseWalletPageProps) {
  const { scrolled, onScroll } = useScrollBorder();
  const injectedNames = new Set(
    injectedWallets.map((w) => w.info.name.toLowerCase()),
  );
  const deeplinkOptions = isDesktop
    ? flattenWalletOptions(node.options)
    : node.options.filter(
        (option) =>
          option.type !== "Deeplink" ||
          !injectedNames.has(option.title.toLowerCase()),
      );
  const title = isDesktop ? t.mobileWallets : node.title;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={title} onBack={onBack} borderVisible={scrolled} />

      <ScrollContent onScroll={onScroll} grow={false}>
        <div className="daimo-flex daimo-flex-col daimo-gap-3">
          {!isDesktop &&
            injectedWallets.map((w) => (
              <InjectedWalletRow
                key={w.info.rdns}
                wallet={w}
                onClick={() => onInjectedWalletSelect(w)}
              />
            ))}

          {deeplinkOptions.map((option) => (
            <WalletOptionRow
              key={option.id}
              option={option}
              onClick={() => onNavigate(option.id)}
              baseUrl={baseUrl}
            />
          ))}
        </div>
      </ScrollContent>
    </div>
  );
}

function flattenWalletOptions(options: NavNode[]): NavNode[] {
  return options.flatMap((option) =>
    option.type === "ChooseOption"
      ? flattenWalletOptions(option.options)
      : [option],
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
          className="daimo-w-8 daimo-h-8 daimo-object-contain daimo-rounded-[25%]"
        />
      }
      onClick={onClick}
    />
  );
}

function WalletOptionRow({
  option,
  onClick,
  baseUrl,
}: {
  option: NavNode;
  onClick: () => void;
  baseUrl: string;
}) {
  const label = option.label ?? option.title;
  const icon = "icon" in option && option.icon ? option.icon : null;

  // For nodes with multiple icons (e.g. OtherWallets), use OptionIcons
  if (option.icons && option.icons.length > 0) {
    return (
      <ListRow
        label={label}
        right={<OptionIcons option={option} baseUrl={baseUrl} />}
        onClick={onClick}
      />
    );
  }

  return (
    <ListRow
      label={label}
      right={
        icon ? (
          <img
            src={resolveIconUrl(icon, baseUrl)}
            alt={label}
            className="daimo-w-8 daimo-h-8 daimo-object-contain daimo-rounded-[25%]"
          />
        ) : undefined
      }
      onClick={onClick}
    />
  );
}
