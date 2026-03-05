import { ReactNode, useEffect, useRef } from "react";

import { t } from "../hooks/locale.js";
import { CloseIcon } from "./icons.js";

const DEFAULT_MIN_HEIGHT = 320;

type ContainerProps = {
  children: ReactNode;
  showFooterSpacer?: boolean;
};

type ModalContainerProps = ContainerProps & {
  /** Handler for closing the modal (backdrop click + close button) */
  onClose?: () => void;
  /** Whether to animate the modal entrance. Default: true */
  animate?: boolean;
  /** Key identifying current page — height morphs on change */
  pageKey?: string;
  /** Fixed max height in pixels. When set, content may scroll. */
  maxHeight?: number;
};

/**
 * Quick height morph on discrete page changes.
 * Snapshots current height, measures new, tweens between.
 * Does NOT run on continuous resizes (QR spacer handles its own).
 */
function usePageHeightMorph(
  ref: React.RefObject<HTMLDivElement | null>,
  pageKey: string | undefined,
) {
  const prevKey = useRef(pageKey);

  useEffect(() => {
    if (prevKey.current === pageKey) return;
    prevKey.current = pageKey;

    const el = ref.current;
    if (!el) return;

    // Snapshot current rendered height
    const from = el.offsetHeight;

    // Remove any leftover explicit height so we can measure natural size
    el.style.transition = "none";
    el.style.height = "auto";

    // Read new natural height
    const to = el.scrollHeight;
    if (from === to) return;

    // FLIP: set to old height, then animate to new
    el.style.height = `${from}px`;
    // Force reflow so the browser registers the start value
    void el.offsetHeight;

    el.style.transition = "height 180ms cubic-bezier(0.23, 1, 0.32, 1)";
    el.style.height = `${to}px`;

    const cleanup = () => {
      el.style.transition = "";
      el.style.height = "";
      el.removeEventListener("transitionend", cleanup);
    };
    el.addEventListener("transitionend", cleanup);
  }, [ref, pageKey]);
}

export function ModalContainer({
  children,
  showFooterSpacer = true,
  onClose,
  animate = true,
  pageKey,
  maxHeight,
}: ModalContainerProps) {
  const backdropClass = animate
    ? "daimo-modal-backdrop fixed inset-0 z-50 bg-black/50"
    : "fixed inset-0 z-50 bg-black/50";

  const overflow = maxHeight
    ? "overflow-hidden"
    : "max-h-[90vh] overflow-y-auto";
  const baseContentClass = `relative w-full max-w-md ${overflow} bg-[var(--daimo-surface)] rounded-t-[var(--daimo-radius-lg)] sm:rounded-[var(--daimo-radius-lg)] shadow-lg flex flex-col`;
  const contentClass = animate
    ? `daimo-modal-content ${baseContentClass}`
    : baseContentClass;

  const contentRef = useRef<HTMLDivElement>(null);
  usePageHeightMorph(contentRef, pageKey);

  return (
    <>
      {animate && <style>{modalAnimationStyles}</style>}
      {/* Backdrop with fade-in - click to close */}
      <div className={backdropClass} onClick={onClose} />
      {/* Modal container - bottom aligned for thumb reachability */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none px-0 sm:px-4 sm:pb-4">
        <div
          ref={contentRef}
          className={`pointer-events-auto ${contentClass}`}
          style={{
            minHeight: maxHeight
              ? Math.min(DEFAULT_MIN_HEIGHT, maxHeight)
              : DEFAULT_MIN_HEIGHT,
            ...(maxHeight ? { maxHeight } : {}),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {onClose && (
            <button
              onClick={onClose}
              className="absolute right-2 top-6 z-20 px-4 py-2"
              aria-label={t.close}
            >
              <CloseIcon size={30} />
            </button>
          )}
          <div className="flex-1 min-h-0 flex flex-col">{children}</div>
          {showFooterSpacer && <div className="h-8 shrink-0" />}
        </div>
      </div>
    </>
  );
}

const modalAnimationStyles = `
  .daimo-modal-backdrop {
    animation: daimo-backdrop-in 200ms ease-out forwards;
  }
  @keyframes daimo-backdrop-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .daimo-modal-content {
    animation: daimo-modal-slide-up 200ms ease-out forwards;
  }
  @keyframes daimo-modal-slide-up {
    from { opacity: 0; transform: translateY(100%); }
    to { opacity: 1; transform: translateY(0); }
  }
  @media (prefers-reduced-motion: reduce) {
    .daimo-modal-backdrop, .daimo-modal-content { animation: none; }
  }
`;

export function EmbeddedContainer({
  children,
  showFooterSpacer = true,
}: ContainerProps) {
  return (
    <div className="bg-transparent flex flex-col items-center">
      <div
        className="w-full max-w-[512px] bg-[var(--daimo-surface)] flex flex-col"
        style={{ minHeight: DEFAULT_MIN_HEIGHT }}
      >
        {children}
        {showFooterSpacer && <div className="h-8" />}
      </div>
    </div>
  );
}
