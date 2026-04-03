import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";

import { t } from "../hooks/locale.js";
import { DaimoLogoIcon } from "./icons.js";
import {
  IconImage,
  ListRow,
  PageHeader,
  ScrollContent,
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
  const allOptions = node.options
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

  const enabledOptions = allOptions.filter((o) => !o.disabledReason);
  const disabledOptions = allOptions.filter((o) => o.disabledReason);

  const useGridLayout = node.layout === "grid";
  const isRootPage = onBack === null;

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={node.title} onBack={onBack} borderVisible={scrolled} />

      <ScrollContent onScroll={onScroll} grow={false}>
        {useGridLayout ? (
          <div className="daimo-grid daimo-grid-cols-4 daimo-gap-2">
            {enabledOptions.map((option) => (
              <GridOptionCell
                key={option.id}
                option={option}
                onClick={() => onNavigate(option.id)}
                baseUrl={baseUrl}
              />
            ))}
            {disabledOptions.map((option) => (
              <GridOptionCell
                key={option.id}
                option={option}
                onClick={() => {}}
                baseUrl={baseUrl}
                disabled
              />
            ))}
          </div>
        ) : (
          <div className="daimo-flex daimo-flex-col daimo-gap-3">
            {enabledOptions.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onClick={() => onNavigate(option.id)}
                baseUrl={baseUrl}
              />
            ))}
            {disabledOptions.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onClick={() => {}}
                baseUrl={baseUrl}
                disabled
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
          className="daimo-mt-auto daimo-py-4 daimo-flex daimo-items-center daimo-justify-center daimo-gap-1.5 daimo-no-underline"
        >
          <DaimoLogoIcon size={14} />
          <span className="daimo-text-sm daimo-font-semibold daimo-text-[var(--daimo-text-muted)]">
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
  disabled,
}: {
  option: NavNode;
  onClick: () => void;
  baseUrl: string;
  disabled?: boolean;
}) {
  const icons = getOptionIcons(option);
  const label = option.label ?? option.title;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`daimo-flex daimo-flex-col daimo-items-center daimo-gap-2 daimo-p-1 daimo-rounded-[var(--daimo-radius-md)] hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-secondary)] daimo-transition-colors daimo-min-w-0 ${
        disabled
          ? "daimo-opacity-50 daimo-cursor-not-allowed hover:[@media(hover:hover)]:!daimo-bg-transparent"
          : ""
      }`}
    >
      {icons.length > 0 && (
        <IconImage
          icon={icons[0]}
          baseUrl={baseUrl}
          alt={label}
          className="daimo-w-full daimo-aspect-square daimo-max-w-16 daimo-object-contain daimo-rounded-[25%]"
        />
      )}
      <span className="daimo-text-xs daimo-font-medium daimo-text-[var(--daimo-text)] daimo-text-center daimo-leading-tight">
        {label}
      </span>
    </button>
  );
}

function OptionRow({
  option,
  onClick,
  baseUrl,
  disabled,
}: {
  option: NavNode;
  onClick: () => void;
  baseUrl: string;
  disabled?: boolean;
}) {
  const label = option.label ?? option.title;

  return (
    <ListRow
      label={label}
      subtitle={disabled ? option.disabledReason : undefined}
      right={<OptionIcons option={option} baseUrl={baseUrl} />}
      onClick={onClick}
      disabled={disabled}
    />
  );
}

/** Get icons array for an option: explicit icons[], single icon, or empty */
export function getOptionIcons(option: NavNode): string[] {
  if (option.icons && option.icons.length > 0) {
    return option.icons;
  }
  if ("icon" in option && option.icon) {
    return [option.icon];
  }
  return [];
}

/** Render icons for a list row option */
export function OptionIcons({
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
      <div className="daimo-w-8 daimo-h-8 daimo-grid daimo-grid-cols-2 daimo-gap-0.5">
        {icons.slice(0, 4).map((icon, i) => (
          <IconImage
            key={i}
            icon={icon}
            baseUrl={baseUrl}
            className="daimo-w-[15px] daimo-h-[15px] daimo-object-contain daimo-rounded-[25%]"
          />
        ))}
      </div>
    );
  }

  // Stacked overlapped icons for <4
  return (
    <div className="daimo-flex daimo-items-center">
      {icons.map((icon, i) => (
        <IconImage
          key={i}
          icon={icon}
          baseUrl={baseUrl}
          className="daimo-w-8 daimo-h-8 daimo-object-contain daimo-rounded-[25%] daimo-relative"
          style={{
            marginLeft: i > 0 ? -10 : 0,
            zIndex: icons.length - i,
          }}
        />
      ))}
    </div>
  );
}
