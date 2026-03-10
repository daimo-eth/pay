import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";

import { t } from "../hooks/locale.js";
import { DaimoLogoIcon } from "./icons.js";
import {
  ListRow,
  PageHeader,
  ScrollContent,
  resolveIconUrl,
  useScrollBorder,
} from "./shared.js";

type ChooseOptionPageProps = {
  node: NavNodeChooseOption;
  injectedWallets?: InjectedWallet[];
  connectedAddress?: string | null;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
  baseUrl: string;
};

export function ChooseOptionPage({
  node,
  injectedWallets = [],
  connectedAddress,
  onNavigate,
  onBack,
  baseUrl,
}: ChooseOptionPageProps) {
  const { scrolled, onScroll } = useScrollBorder();
  const injectedNames = new Set(
    injectedWallets.map((w) => w.info.name.toLowerCase()),
  );
  const options = node.options
    .filter(
      (o) => o.type !== "Deeplink" || !injectedNames.has(o.title.toLowerCase()),
    )
    // Replace generic ConnectedWallet icon/label with actual wallet info
    .map((o) => {
      if (o.type !== "ConnectedWallet") return o;
      let updated = o;
      if (injectedWallets.length > 0) {
        const walletIcon = injectedWallets[0].info.icon;
        if (walletIcon) updated = { ...updated, icon: walletIcon };
      }
      if (connectedAddress) {
        const verb = node.title.split(" ")[0] || "Pay";
        const short = `${connectedAddress.slice(0, 6)}...${connectedAddress.slice(-4)}`;
        updated = { ...updated, label: `${verb} with ${short}` };
      }
      return updated;
    });
  const useGridLayout = node.layout === "grid";
  const isRootPage = onBack === null;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} borderVisible={scrolled} />

      <ScrollContent onScroll={onScroll} grow={false}>
        {useGridLayout ? (
          <div className="grid grid-cols-4 gap-2">
            {options.map((option) => (
              <GridOptionCell
                key={option.id}
                option={option}
                onClick={() => onNavigate(option.id)}
                baseUrl={baseUrl}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onClick={() => onNavigate(option.id)}
                baseUrl={baseUrl}
              />
            ))}
          </div>
        )}
      </ScrollContent>

      {isRootPage && (
        <a
          href="https://daimo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-auto py-4 flex items-center justify-center gap-1.5 no-underline"
        >
          <DaimoLogoIcon size={14} />
          <span className="text-sm font-semibold text-[var(--daimo-text-muted)]">
            {t.poweredByDaimo}
          </span>
        </a>
      )}
    </div>
  );
}

function GridOptionCell({
  option,
  onClick,
  baseUrl,
}: {
  option: NavNode;
  onClick: () => void;
  baseUrl: string;
}) {
  const icons = getOptionIcons(option);
  const label = option.label ?? option.title;

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-1 rounded-[var(--daimo-radius-md)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-secondary)] transition-colors min-w-0"
    >
      {icons.length > 0 && (
        <img
          src={resolveIconUrl(icons[0], baseUrl)}
          alt={label}
          className="w-full aspect-square max-w-16 object-contain rounded-[25%]"
        />
      )}
      <span className="text-xs font-medium text-[var(--daimo-text)] text-center leading-tight">
        {label}
      </span>
    </button>
  );
}

function OptionRow({
  option,
  onClick,
  baseUrl,
}: {
  option: NavNode;
  onClick: () => void;
  baseUrl: string;
}) {
  const label = option.label ?? option.title;

  return (
    <ListRow
      label={label}
      right={<OptionIcons option={option} baseUrl={baseUrl} />}
      onClick={onClick}
    />
  );
}

/** Get icons array for an option: explicit icons[], single icon, or empty */
function getOptionIcons(option: NavNode): string[] {
  if (option.icons && option.icons.length > 0) {
    return option.icons;
  }
  if ("icon" in option && option.icon) {
    return [option.icon];
  }
  return [];
}

/** Render icons for a list row option */
function OptionIcons({
  option,
  baseUrl,
}: {
  option: NavNode;
  baseUrl: string;
}) {
  const icons = getOptionIcons(option);
  if (icons.length === 0) return null;

  // 2x2 grid for 4+ icons
  if (icons.length >= 4) {
    return (
      <div className="w-8 h-8 grid grid-cols-2 gap-0.5">
        {icons.slice(0, 4).map((icon, i) => (
          <img
            key={i}
            src={resolveIconUrl(icon, baseUrl)}
            alt=""
            className="w-[15px] h-[15px] object-contain rounded-[25%]"
          />
        ))}
      </div>
    );
  }

  // Stacked overlapped icons for <4
  return (
    <div className="flex items-center">
      {icons.map((icon, i) => (
        <img
          key={i}
          src={resolveIconUrl(icon, baseUrl)}
          alt=""
          className="w-8 h-8 object-contain rounded-[25%] relative"
          style={{
            marginLeft: i > 0 ? -10 : 0,
            zIndex: icons.length - i,
          }}
        />
      ))}
    </div>
  );
}
