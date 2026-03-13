import { useEffect, useState } from "react";
import { t } from "../hooks/locale.js";

/** Countdown hook — ticks every second once expiresAt is set. */
export function useCountdown(expiresAt: number, defaultS: number) {
  const hasExpiry = expiresAt > 0;
  const [remainingS, setRemainingS] = useState(() =>
    hasExpiry
      ? Math.max(0, Math.floor(expiresAt - Date.now() / 1000))
      : defaultS,
  );

  useEffect(() => {
    if (!hasExpiry) return;
    const interval = setInterval(() => {
      setRemainingS(Math.max(0, Math.floor(expiresAt - Date.now() / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, hasExpiry]);

  return { remainingS, isExpired: hasExpiry && remainingS === 0 };
}

export function Countdown({
  remainingS,
  isExpired,
  totalS,
}: {
  remainingS: number;
  isExpired: boolean;
  totalS: number;
}) {
  const m = `${Math.floor(remainingS / 60)}`.padStart(2, "0");
  const s = `${remainingS % 60}`.padStart(2, "0");

  return (
    <div className="daimo-flex daimo-flex-col daimo-items-center daimo-gap-1">
      <span className="daimo-text-sm daimo-text-[var(--daimo-text)]">
        {isExpired ? t.expired : t.expiresIn}
      </span>
      <div className="daimo-flex daimo-items-center daimo-gap-2">
        <CircleTimer remainingS={remainingS} totalS={totalS} />
        <span
          className="daimo-font-semibold daimo-tabular-nums"
          style={{
            color: isExpired ? "var(--daimo-error)" : "var(--daimo-text)",
          }}
        >
          {isExpired ? t.expired : `${m}:${s}`}
        </span>
      </div>
    </div>
  );
}

function CircleTimer({
  remainingS,
  totalS,
}: {
  remainingS: number;
  totalS: number;
}) {
  const size = 18;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - (totalS > 0 ? remainingS / totalS : 0));

  return (
    <svg
      width={size}
      height={size}
      className="daimo-transform -daimo-rotate-90"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--daimo-placeholder)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={remainingS > 0 ? "var(--daimo-success)" : "var(--daimo-error)"}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
    </svg>
  );
}
