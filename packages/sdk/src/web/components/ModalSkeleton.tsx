/**
 * Loading skeleton for the session modal.
 * Shows header + scrollable token rows layout (matches SelectTokenPage).
 * Respects prefers-reduced-motion for accessibility.
 */
export function ModalSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Header placeholder */}
      <div className="flex items-center justify-center h-14 px-6">
        <div
          className="h-5 w-32 rounded motion-safe:animate-pulse"
          style={{ backgroundColor: "var(--daimo-skeleton)" }}
        />
      </div>

      {/* Token rows placeholder - uses motion-safe for reduced motion support */}
      <div className="flex-1 px-6 pb-4 flex flex-col gap-3">
        {[...Array(11)].map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-[var(--daimo-radius-lg)] motion-safe:animate-pulse"
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
