/**
 * Loading skeleton for the session modal.
 * Shows header + scrollable token rows layout (matches SelectTokenPage).
 * Respects prefers-reduced-motion for accessibility.
 */
export function ModalSkeleton() {
  return (
    <div className="daimo-flex daimo-flex-col daimo-flex-1 daimo-min-h-0">
      {/* Header placeholder */}
      <div className="daimo-flex daimo-items-center daimo-justify-center daimo-h-14 daimo-px-6">
        <div
          className="daimo-h-5 daimo-w-32 daimo-rounded motion-safe:daimo-animate-daimo-pulse"
          style={{ backgroundColor: "var(--daimo-skeleton)" }}
        />
      </div>

      {/* Token rows placeholder - uses motion-safe for reduced motion support */}
      <div className="daimo-flex-1 daimo-px-6 daimo-pb-4 daimo-flex daimo-flex-col daimo-gap-3">
        {[...Array(11)].map((_, i) => (
          <div
            key={i}
            className="daimo-h-16 daimo-rounded-[var(--daimo-radius-lg)] motion-safe:daimo-animate-daimo-pulse"
            style={{
              backgroundColor: "var(--daimo-skeleton)",
              animationDelay: `${i * 100}ms`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
