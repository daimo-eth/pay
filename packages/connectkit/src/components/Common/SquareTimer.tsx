import React, { ReactNode, useEffect, useState } from "react";

// SquareTimer displays a rounded-corner square progress bar around its children.
// Colour transitions: green → orange → red as time runs out.
// All dimensions are deterministic integers to avoid float precision.
// (floats avoided per custom instructions; we only work with ints.)

export type SquareTimerProps = {
  /** Total seconds in the countdown */
  total: number;
  /** Inner square size (without the stroke) in px */
  size?: number;
  /** Stroke width in px */
  stroke?: number;
  /** External control of the current time (seconds left). */
  currentTime?: number;
  /** Callback fired each second with updated seconds left */
  onTimeChange?: (seconds: number) => void;
  /** Children rendered inside the timer – typically a QR-code */
  children?: ReactNode;
  /** Corner radius in px */
  borderRadius?: number;
};

const SquareTimer: React.FC<SquareTimerProps> = ({
  total,
  size = 220,
  stroke = 6,
  currentTime,
  onTimeChange,
  children,
  borderRadius = 54,
}) => {
  // target timestamp (ms) when timer hits zero
  const [targetTs, setTargetTs] = useState<number>(
    Date.now() + (currentTime ?? total) * 1000,
  );

  const [left, setLeft] = useState<number>(currentTime ?? total);

  // update target when external currentTime changes
  useEffect(() => {
    if (currentTime !== undefined) {
      setTargetTs(Date.now() + currentTime * 1000);
      setLeft(currentTime);
    }
  }, [currentTime]);

  // tick using wall-clock difference so pauses don't freeze timer
  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = Math.max(
        0,
        Math.ceil((targetTs - Date.now()) / 1000),
      );
      setLeft(secondsLeft);
      onTimeChange?.(secondsLeft);
      if (secondsLeft === 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTs, onTimeChange]);

  const ratio = Math.round((left * 100) / total); // integer 0-100

  // Perimeter length (integer maths)
  const straight = size * 4 - borderRadius * 8;
  const curved = Math.round((2 * 314 * borderRadius) / 100); // π≈3.14 *2* r
  const length = straight + curved; // approx integer length

  // colour based on remaining ratio (avoid floats by comparing ints)
  const color =
    ratio <= 10
      ? "var(--timer-red, #D92D20)"
      : ratio <= 40
        ? "var(--timer-orange, #F79009)"
        : "var(--timer-green, #12D18E)";

  const half = size / 2;

  const path = [
    `M ${half} 0`,
    `H ${size - borderRadius}`,
    `Q ${size} 0 ${size} ${borderRadius}`,
    `V ${size - borderRadius}`,
    `Q ${size} ${size} ${size - borderRadius} ${size}`,
    `H ${borderRadius}`,
    `Q 0 ${size} 0 ${size - borderRadius}`,
    `V ${borderRadius}`,
    `Q 0 0 ${borderRadius} 0`,
    `H ${half}`,
  ].join(" ");

  const totalSize = size + stroke;
  const offset = stroke / 2;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        width: totalSize,
        height: totalSize,
      }}
    >
      <svg
        role="img"
        aria-label={`Timer with ${left} seconds left of ${total}`}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          position: "absolute",
          top: offset,
          left: offset,
          width: size,
          height: size,
          overflow: "visible",
        }}
      >
        <path
          d={path}
          fill="none"
          stroke="var(--ck-body-background-secondary, #EEE)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={length}
          strokeDashoffset={Math.round((length * (100 - ratio)) / 100)}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>

      {/* inner content */}
      <div
        style={{
          position: "absolute",
          top: stroke,
          left: stroke,
          right: stroke,
          bottom: stroke,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius,
          background: "var(--ck-body-background, #fff)",
        }}
      >
        {children}
      </div>
    </div>
  );
};

export default SquareTimer;
