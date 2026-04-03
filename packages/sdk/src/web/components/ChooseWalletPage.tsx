import type { NavNode, NavNodeChooseOption } from "../api/navTree.js";
import type { InjectedWallet } from "../hooks/useInjectedWallets.js";

import { t } from "../hooks/locale.js";
import { ChooseOptionPage, OptionIcons, getOptionIcons } from "./ChooseOptionPage.js";
import {
  IconImage,
  ListRow,
  PageHeader,
  ScrollContent,
  useScrollBorder,
} from "./shared.js";

type ChooseWalletPageProps = {
  node: NavNodeChooseOption;
  variant: "wallet-list" | "mobile-wallet-grid";
  injectedWallets: InjectedWallet[];
  isDesktop: boolean;
  onInjectedWalletSelect: (wallet: InjectedWallet) => void;
  onShowMobileWallets?: () => void;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
  baseUrl: string;
};

/** Wallet selection page with two variants:
 *  - wallet-list: shows injected wallets + deeplink rows (desktop/mobile)
 *  - mobile-wallet-grid: desktop-only flattened grid of all deeplink wallets
 */
export function ChooseWalletPage({
  node,
  variant,
  injectedWallets,
  isDesktop,
  onInjectedWalletSelect,
  onShowMobileWallets,
  onNavigate,
  onBack,
  baseUrl,
}: ChooseWalletPageProps) {
  if (variant === "mobile-wallet-grid") {
    return (
      <MobileWalletGrid
        node={node}
        onNavigate={onNavigate}
        onBack={onBack}
        baseUrl={baseUrl}
      />
    );
  }

  if (isDesktop) {
    return (
      <DesktopWalletList
        node={node}
        injectedWallets={injectedWallets}
        onInjectedWalletSelect={onInjectedWalletSelect}
        onShowMobileWallets={onShowMobileWallets}
        onNavigate={onNavigate}
        onBack={onBack}
        baseUrl={baseUrl}
      />
    );
  }

  return (
    <MobileWalletList
      node={node}
      injectedWallets={injectedWallets}
      onInjectedWalletSelect={onInjectedWalletSelect}
      onNavigate={onNavigate}
      onBack={onBack}
      baseUrl={baseUrl}
    />
  );
}

/** Desktop wallet-list: injected wallets + "Mobile Wallets" row, or direct grid if none. */
function DesktopWalletList({
  node,
  injectedWallets,
  onInjectedWalletSelect,
  onShowMobileWallets,
  onNavigate,
  onBack,
  baseUrl,
}: {
  node: NavNodeChooseOption;
  injectedWallets: InjectedWallet[];
  onInjectedWalletSelect: (wallet: InjectedWallet) => void;
  onShowMobileWallets?: () => void;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
  baseUrl: string;
}) {
  // No injected wallets: render mobile-wallet grid directly in-place
  if (injectedWallets.length === 0) {
    return (
      <MobileWalletGrid
        node={node}
        onNavigate={onNavigate}
        onBack={onBack}
        baseUrl={baseUrl}
      />
    );
  }

  const { scrolled, onScroll } = useScrollBorder();
  const mobileWalletIcons = getNestedOptionIcons(node.options);

  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={node.title} onBack={onBack} borderVisible={scrolled} />

      <ScrollContent onScroll={onScroll} grow={false}>
        <div className="daimo-flex daimo-flex-col daimo-gap-3">
          {injectedWallets.map((w) => (
            <InjectedWalletRow
              key={w.info.rdns}
              wallet={w}
              onClick={() => onInjectedWalletSelect(w)}
            />
          ))}
          <MobileWalletsRow
            icons={mobileWalletIcons}
            onClick={() => onShowMobileWallets?.()}
            baseUrl={baseUrl}
          />
        </div>
      </ScrollContent>
    </div>
  );
}

/** Mobile wallet-list: injected wallets first, then de-duped server rows. */
function MobileWalletList({
  node,
  injectedWallets,
  onInjectedWalletSelect,
  onNavigate,
  onBack,
  baseUrl,
}: {
  node: NavNodeChooseOption;
  injectedWallets: InjectedWallet[];
  onInjectedWalletSelect: (wallet: InjectedWallet) => void;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
  baseUrl: string;
}) {
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
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      <PageHeader title={node.title} onBack={onBack} borderVisible={scrolled} />

      <ScrollContent onScroll={onScroll} grow={false}>
        <div className="daimo-flex daimo-flex-col daimo-gap-3">
          {injectedWallets.map((w) => (
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

/** Desktop-only: flattened grid of all deeplink wallets.
 *  Reuses ChooseOptionPage with a synthetic grid node. */
function MobileWalletGrid({
  node,
  onNavigate,
  onBack,
  baseUrl,
}: {
  node: NavNodeChooseOption;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
  baseUrl: string;
}) {
  const gridNode: NavNodeChooseOption = {
    ...node,
    title: t.mobileWallets,
    options: flattenWalletOptions(node.options),
    layout: "grid",
  };

  return (
    <ChooseOptionPage
      node={gridNode}
      onNavigate={onNavigate}
      onBack={onBack}
      baseUrl={baseUrl}
    />
  );
}

function flattenWalletOptions(options: NavNode[]): NavNode[] {
  return options.flatMap((option) =>
    option.type === "ChooseOption"
      ? flattenWalletOptions(option.options)
      : [option],
  );
}

function getNestedOptionIcons(options: NavNode[], maxIcons = 4): string[] {
  return flattenWalletOptions(options)
    .flatMap(getOptionIcons)
    .slice(0, maxIcons);
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

/** "Mobile Wallets" row shown on desktop when injected wallets exist. */
function MobileWalletsRow({
  icons,
  onClick,
  baseUrl,
}: {
  icons: string[];
  onClick: () => void;
  baseUrl: string;
}) {
  return (
    <ListRow
      label={t.mobileWallets}
      right={
        icons.length >= 4 ? (
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
        ) : icons.length > 0 ? (
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
        ) : undefined
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
          <IconImage
            icon={icon}
            baseUrl={baseUrl}
            alt={label}
            className="daimo-w-8 daimo-h-8 daimo-object-contain daimo-rounded-[25%]"
          />
        ) : undefined
      }
      onClick={onClick}
    />
  );
}
