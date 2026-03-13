import { ReactNode, useEffect, useRef } from "react";

import { t } from "../hooks/locale.js";
import { CloseIcon } from "./icons.js";

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
    ? "daimo-modal-backdrop daimo-fixed daimo-inset-0 daimo-z-50 daimo-bg-black/50"
    : "daimo-fixed daimo-inset-0 daimo-z-50 daimo-bg-black/50";

  const overflow = maxHeight
    ? "daimo-overflow-hidden"
    : "daimo-max-h-[90vh] daimo-overflow-y-auto";
  const baseContentClass = `daimo-relative daimo-w-full daimo-max-w-[420px] ${overflow} daimo-bg-[var(--daimo-surface)] daimo-rounded-t-[var(--daimo-radius-xl)] sm:daimo-rounded-[var(--daimo-radius-xl)] daimo-shadow-lg daimo-flex daimo-flex-col`;
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
      <div className="daimo-fixed daimo-inset-x-0 daimo-bottom-0 daimo-z-50 daimo-flex daimo-justify-center daimo-pointer-events-none daimo-px-0 sm:daimo-px-4 sm:daimo-pb-4">
        <div
          ref={contentRef}
          className={`daimo-pointer-events-auto ${contentClass}`}
          style={maxHeight ? { maxHeight } : undefined}
          onClick={(e) => e.stopPropagation()}
        >
          {onClose && (
            <button
              onClick={onClose}
              className="daimo-absolute daimo-right-[17px] daimo-top-[22px] daimo-z-20 daimo-w-8 daimo-h-8 daimo-flex daimo-items-center daimo-justify-center daimo-rounded-full daimo-bg-[var(--daimo-surface)] hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-secondary)] active:daimo-scale-[0.9] daimo-transition-[background-color,transform] daimo-[transition-duration:200ms,100ms] daimo-ease daimo-touch-action-manipulation"
              aria-label={t.close}
            >
              <CloseIcon />
            </button>
          )}
          <div className="daimo-flex-1 daimo-min-h-0 daimo-flex daimo-flex-col">{children}</div>
          {showFooterSpacer && <div className="daimo-h-8 daimo-shrink-0" />}
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
    <div className="daimo-bg-transparent daimo-flex daimo-flex-col daimo-items-center">
      <div
        className="daimo-w-full daimo-max-w-[512px] daimo-bg-[var(--daimo-surface)] daimo-flex daimo-flex-col"
      >
        {children}
        {showFooterSpacer && <div className="daimo-h-8" />}
      </div>
    </div>
  );
}
