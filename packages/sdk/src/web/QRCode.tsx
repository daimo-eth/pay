import QRCodeLib from "qrcode";
import { ReactElement, useMemo } from "react";

type QRCodeProps = {
  value: string;
  image?: React.ReactNode;
};

/** SVG viewBox size for quality (actual display size is controlled by CSS) */
const VIEW_SIZE = 288;

export function QRCode({ value, image }: QRCodeProps) {
  const dots = useMemo(() => {
    const dots: ReactElement[] = [];

    let matrix: number[][];
    try {
      const qr = QRCodeLib.create(value, { errorCorrectionLevel: "M" });
      const arr = Array.prototype.slice.call(qr.modules.data, 0);
      const sqrt = Math.sqrt(arr.length);
      matrix = arr.reduce(
        (rows: number[][], key: number, index: number) =>
          (index % sqrt === 0
            ? rows.push([key])
            : rows[rows.length - 1].push(key)) && rows,
        [],
      );
    } catch {
      return dots;
    }

    const cellSize = VIEW_SIZE / matrix.length;

    // Draw position finder patterns (3 corners) as nested rounded rectangles
    const finderPositions = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
    ];

    finderPositions.forEach(({ x, y }) => {
      const x1 = (matrix.length - 7) * cellSize * x;
      const y1 = (matrix.length - 7) * cellSize * y;
      // Draw 3 nested rectangles: outer (black), middle (white), inner (black)
      for (let i = 0; i < 3; i++) {
        dots.push(
          <rect
            key={`finder-${i}-${x}-${y}`}
            fill={
              i % 2 !== 0
                ? "var(--daimo-qr-bg, white)"
                : "var(--daimo-qr-dot, black)"
            }
            rx={(i - 2) * -5 + (i === 0 ? 2 : 3)}
            ry={(i - 2) * -5 + (i === 0 ? 2 : 3)}
            width={cellSize * (7 - i * 2)}
            height={cellSize * (7 - i * 2)}
            x={x1 + cellSize * i}
            y={y1 + cellSize * i}
          />,
        );
      }
    });

    // Calculate center clear area for logo (28% of QR)
    const logoAreaSize = Math.floor((VIEW_SIZE * 0.28) / cellSize);
    const matrixMiddleStart = matrix.length / 2 - logoAreaSize / 2;
    const matrixMiddleEnd = matrix.length / 2 + logoAreaSize / 2 - 1;

    // Draw data dots (circles)
    matrix.forEach((row, i) => {
      row.forEach((cell, j) => {
        if (!cell) return;

        // Skip position finder patterns
        const inTopLeft = i < 7 && j < 7;
        const inTopRight = i > matrix.length - 8 && j < 7;
        const inBottomLeft = i < 7 && j > matrix.length - 8;
        if (inTopLeft || inTopRight || inBottomLeft) return;

        // Skip center area if image is provided
        if (image) {
          const inCenter =
            i > matrixMiddleStart &&
            i < matrixMiddleEnd &&
            j > matrixMiddleStart &&
            j < matrixMiddleEnd;
          if (inCenter) return;
        }

        dots.push(
          <circle
            key={`dot-${i}-${j}`}
            cx={i * cellSize + cellSize / 2}
            cy={j * cellSize + cellSize / 2}
            fill="var(--daimo-qr-dot, black)"
            r={cellSize / 3}
          />,
        );
      });
    });

    return dots;
  }, [value, image]);

  return (
    <div className="qr-container relative w-full overflow-hidden rounded-2xl border border-[var(--daimo-border)] bg-[var(--daimo-qr-bg,white)]">
      {/* Square aspect ratio container */}
      <div className="relative w-full pb-[100%]">
        {/* QR content with padding */}
        <div className="absolute inset-[13px]">
          <svg
            viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
            className="block h-auto w-full"
          >
            {dots}
          </svg>

          {/* Logo/image overlay (centered, 28% size) */}
          {image && (
            <div className="absolute left-1/2 top-1/2 flex h-[28%] w-[28%] -translate-x-1/2 -translate-y-1/2 items-center justify-center">
              {image}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
