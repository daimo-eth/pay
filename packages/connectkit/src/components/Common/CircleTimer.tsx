import React, { ReactNode, useEffect, useState } from "react";

// CircleTimer – compact circular countdown indicator.
// Mirrors SquareTimer logic but uses a circle SVG path.
// All maths intentionally integer-based to avoid float precision loss.

export type CircleTimerProps = {
  /** Total seconds in the countdown */
  total: number;
  /** Diameter (outer) in px – should be an even integer */
  size?: number;
  /** Stroke width in px – integer */
  stroke?: number;
  /** Externally controlled seconds left */
  currentTime?: number;
  /** Fired each second with updated seconds left */
  onTimeChange?: (seconds: number) => void;
  /** Child can be placed at the centre (e.g. an icon) */
  children?: ReactNode;
};

const CircleTimer: React.FC<CircleTimerProps> = ({
  total,
  size = 24,
  stroke = 3,
  currentTime,
  onTimeChange,
  children,
}) => {
  // timestamp (ms) when timer ends
  const [target, setTarget] = useState<number>(
    Date.now() + (currentTime ?? total) * 1000,
  );

  const [left, setLeft] = useState<number>(currentTime ?? total);

  // react to external currentTime updates
  useEffect(() => {
    if (currentTime !== undefined) {
      setTarget(Date.now() + currentTime * 1000);
      setLeft(currentTime);
    }
  }, [currentTime]);

  // interval tick
  useEffect(() => {
    const id = setInterval(() => {
      const secs = Math.max(0, Math.ceil((target - Date.now()) / 1000));
      setLeft(secs);
      onTimeChange?.(secs);
      if (secs === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [target, onTimeChange]);

  const ratio = Math.round((left * 100) / total); // 0-100

  const radius = Math.round((size - stroke) / 2); // integer radius
  const circumference = Math.round((2 * 314 * radius) / 100); // 2πr, π≈3.14
  const dashoffset = Math.round((circumference * (100 - ratio)) / 100);

  // colour transition: green → orange → red
  const color =
    ratio <= 10
      ? "var(--timer-red, #D92D20)"
      : ratio <= 40
        ? "var(--timer-orange, #F79009)"
        : "var(--timer-green, #12D18E)";

  const center = Math.round(size / 2);

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label={`Timer: ${left}s left of ${total}s`}
    >
      {/* background circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke="var(--ck-body-background-secondary, #EEE)"
        strokeWidth={stroke}
      />
      {/* progress circle */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        fill="transparent"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={dashoffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s linear" }}
        transform={`rotate(-90 ${center} ${center})`}
      />
      {/* optional child */}
      {children && (
        <foreignObject x="0" y="0" width={size} height={size}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
            }}
          >
            {children}
          </div>
        </foreignObject>
      )}
    </svg>
  );
};

export default CircleTimer;
