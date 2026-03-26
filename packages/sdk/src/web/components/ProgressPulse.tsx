type ProgressPulseProps = {
  /** Label shown below the icon, e.g. "Deposit received" */
  label?: string;
};

/**
 * Pulsing progress indicator for intermediate loading states.
 * Use instead of ConfirmationSpinner for non-terminal progress like
 * "deposit received, routing funds" or "enrolling with provider".
 *
 * Three dots pulse in sequence to convey forward momentum.
 */
export function ProgressPulse({ label }: ProgressPulseProps) {
  return (
    <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-4">
      <div className="daimo-flex daimo-items-center daimo-gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="daimo-w-3 daimo-h-3 daimo-rounded-full"
            style={{
              backgroundColor: "var(--daimo-success)",
              animation: `daimo-pulse-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      {label && (
        <p className="daimo-text-sm daimo-font-medium daimo-text-[var(--daimo-text-secondary)] daimo-text-center">
          {label}
        </p>
      )}
    </div>
  );
}
