import QRCodeLib from "qrcode";
import { ReactElement, useMemo } from "react";

type QRDensity = "short" | "medium" | "long";

type QRCodeProps = {
  value?: string;
  image?: React.ReactNode;
  /** Hint for placeholder density. Longer = denser QR skeleton. */
  placeholderDensity?: QRDensity;
};

type QRPlaceholderProps = {
  image?: React.ReactNode;
  density?: QRDensity;
};

/** SVG viewBox size for quality (actual display size is controlled by CSS) */
const VIEW_SIZE = 288;
const LOGO_SIZE_PERCENT = 28;
const LOGO_SIZE_RATIO = LOGO_SIZE_PERCENT / 100;
const centerLogoStyle = {
  width: `${LOGO_SIZE_PERCENT}%`,
  height: `${LOGO_SIZE_PERCENT}%`,
} as const;

/** Dummy values of varying length to produce different QR densities */
const PLACEHOLDER_VALUES: Record<QRDensity, string> = {
  short: "https://daimo.com/x",
  medium: "https://daimo.com/deposit?session=abc123def456ghi789jkl012mno345pqr678stu901vwx",
  long: "https://daimo.com/deposit?session=abc123def456ghi789jkl012mno345pqr678stu901vwx234yza567bcd890efg123hij456klm789nop012qrs345tuv678wxy901zab234cde567fgh890ijk123lmn456opq789rst012uvw345xyz",
};

function QRCodeShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="daimo-qr-container daimo-relative daimo-w-full daimo-overflow-hidden daimo-rounded-2xl daimo-border daimo-border-[var(--daimo-border)] daimo-bg-[var(--daimo-qr-bg,white)]">
      <div className="daimo-relative daimo-w-full daimo-pb-[100%]">
        {children}
      </div>
    </div>
  );
}

function generateQRDots(
  value: string,
  clearCenter: boolean,
): ReactElement[] {
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

  // Calculate center clear area for logo
  const logoAreaSize = Math.floor((VIEW_SIZE * LOGO_SIZE_RATIO) / cellSize);
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

      // Skip center area
      if (clearCenter) {
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
}

function QRCodeContent({ value, image }: { value: string; image?: React.ReactNode }) {
  const dots = useMemo(
    () => generateQRDots(value, !!image),
    [value, image],
  );

  return (
    <div className="daimo-absolute daimo-inset-[13px]">
      <svg
        viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
        className="daimo-block daimo-h-auto daimo-w-full"
      >
        {dots}
      </svg>

      {image && (
        <div className="daimo-absolute daimo-inset-0 daimo-flex daimo-items-center daimo-justify-center">
          <div
            className="daimo-flex daimo-items-center daimo-justify-center"
            style={centerLogoStyle}
          >
            {image}
          </div>
        </div>
      )}
    </div>
  );
}

function QRPlaceholderContent({ image, density = "medium" }: QRPlaceholderProps) {
  const dots = useMemo(
    () => generateQRDots(PLACEHOLDER_VALUES[density], true),
    [density],
  );

  return (
    <>
      {/* Real QR code SVG at low opacity as skeleton */}
      <div className="daimo-absolute daimo-inset-[13px] daimo-qr-placeholder-qr">
        <svg
          viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
          className="daimo-block daimo-h-auto daimo-w-full"
        >
          {dots}
        </svg>
      </div>
      {/* Diagonal shimmer sweep */}
      <div className="daimo-absolute daimo-inset-[13px] daimo-overflow-hidden daimo-rounded-[5px] daimo-qr-shimmer" />
      {/* Logo on top, unaffected by shimmer */}
      {image && (
        <div className="daimo-qr-placeholder-logo">
          <div className="daimo-qr-placeholder-logo-inner">
            {image}
          </div>
        </div>
      )}
    </>
  );
}

export function QRPlaceholder({ image, density }: QRPlaceholderProps) {
  return (
    <QRCodeShell>
      <QRPlaceholderContent image={image} density={density} />
    </QRCodeShell>
  );
}

export function QRCode({ value, image, placeholderDensity }: QRCodeProps) {
  return (
    <QRCodeShell>
      <div className={value ? "daimo-qr-fade-out" : ""}>
        <QRPlaceholderContent image={image} density={placeholderDensity} />
      </div>
      {value && (
        <div className="daimo-qr-fade-in">
          <QRCodeContent value={value} image={image} />
        </div>
      )}
    </QRCodeShell>
  );
}
