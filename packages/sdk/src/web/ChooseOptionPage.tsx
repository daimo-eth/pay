import { NavNode, NavNodeChooseOption } from "../common/session.js";

import { t } from "../hooks/locale.js";
import { PageHeader, resolveIconUrl } from "./shared.js";

type ChooseOptionPageProps = {
  node: NavNodeChooseOption;
  onNavigate: (nodeId: string) => void;
  onBack: (() => void) | null;
};

/** Max visible rows before scrolling */
const MAX_VISIBLE_ROWS = 4;
/** Row height (h-16 = 64px) + gap (gap-3 = 12px) */
const ROW_HEIGHT = 64;
const ROW_GAP = 12;

export function ChooseOptionPage({
  node,
  onNavigate,
  onBack,
}: ChooseOptionPageProps) {
  const useGridLayout = node.layout === "grid";
  const isRootPage = onBack === null;

  // Calculate max height for list layout (4 rows + 3 gaps)
  const needsScroll = !useGridLayout && node.options.length > MAX_VISIBLE_ROWS;
  const maxListHeight =
    MAX_VISIBLE_ROWS * ROW_HEIGHT + (MAX_VISIBLE_ROWS - 1) * ROW_GAP;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={node.title} onBack={onBack} />

      {/* Options */}
      {useGridLayout ? (
        <div className="flex-1 overflow-y-auto scroll-fade px-6 pb-4">
          <div className="grid grid-cols-4 gap-2">
            {node.options.map((option) => (
              <GridOptionCell
                key={option.id}
                option={option}
                onClick={() => onNavigate(option.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-4">
          <div
            className={`flex flex-col gap-3 ${needsScroll ? "overflow-y-auto scroll-fade" : ""}`}
            style={needsScroll ? { maxHeight: maxListHeight } : undefined}
          >
            {node.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                onClick={() => onNavigate(option.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Footer - only on root page */}
      {isRootPage && (
        <div className="py-4 text-center">
          <span className="text-sm text-[var(--daimo-text-muted)]">
            {t.poweredByDaimo}
          </span>
        </div>
      )}
    </div>
  );
}

function GridOptionCell({
  option,
  onClick,
}: {
  option: NavNode;
  onClick: () => void;
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
          src={resolveIconUrl(icons[0])}
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
}: {
  option: NavNode;
  onClick: () => void;
}) {
  const label = option.label ?? option.title;

  return (
    <button
      onClick={onClick}
      className="w-full h-16 shrink-0 flex items-center justify-between px-5 rounded-[var(--daimo-radius-lg)] bg-[var(--daimo-surface-secondary)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] transition-colors text-left"
    >
      <span className="text-[var(--daimo-text)] font-semibold">{label}</span>
      <OptionIcons option={option} />
    </button>
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
function OptionIcons({ option }: { option: NavNode }) {
  const icons = getOptionIcons(option);
  if (icons.length === 0) return null;

  // 2x2 grid for 4+ icons
  if (icons.length >= 4) {
    return (
      <div className="w-8 h-8 grid grid-cols-2 gap-0.5">
        {icons.slice(0, 4).map((icon, i) => (
          <img
            key={i}
            src={resolveIconUrl(icon)}
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
          src={resolveIconUrl(icon)}
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
