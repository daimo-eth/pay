type ProgressDotsStatus = "confirming" | "processing" | "done" | "refunding";

type ProgressDotsProps = {
  status: ProgressDotsStatus;
  label: string;
};

/**
 * Two-dot progress indicator with connecting line.
 *
 * Confirming: both dots grey (unfilled), line grey
 * Processing: first dot blue, second gray, line gray
 * Done: both dots green, line green
 * Refunding: both dots red, line red
 */
export function ProgressDots({ status, label }: ProgressDotsProps) {
  const colors = getColors(status);

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Dots and line */}
      <div className="flex items-center gap-0">
        <Dot filled={status !== "confirming"} color={colors.first} />
        <Line color={colors.line} />
        <Dot
          filled={status === "done" || status === "refunding"}
          color={colors.second}
        />
      </div>

      {/* Label */}
      <span className="text-sm font-medium" style={{ color: colors.text }}>
        {label}
      </span>
    </div>
  );
}

type DotProps = {
  filled: boolean;
  color: string;
};

function Dot({ filled, color }: DotProps) {
  return (
    <div
      className="w-3 h-3 rounded-full border-2"
      style={{
        borderColor: color,
        backgroundColor: filled ? color : "transparent",
      }}
    />
  );
}

function Line({ color }: { color: string }) {
  return <div className="w-12 h-0.5" style={{ backgroundColor: color }} />;
}

type Colors = {
  first: string;
  second: string;
  line: string;
  text: string;
};

function getColors(status: ProgressDotsStatus): Colors {
  switch (status) {
    case "confirming":
      return {
        first: "var(--daimo-placeholder)",
        second: "var(--daimo-placeholder)",
        line: "var(--daimo-placeholder)",
        text: "var(--daimo-text-secondary)",
      };
    case "processing":
      return {
        first: "var(--daimo-accent)",
        second: "var(--daimo-placeholder)",
        line: "var(--daimo-placeholder)",
        text: "var(--daimo-text-secondary)",
      };
    case "done":
      return {
        first: "var(--daimo-success)",
        second: "var(--daimo-success)",
        line: "var(--daimo-success)",
        text: "var(--daimo-success)",
      };
    case "refunding":
      return {
        first: "var(--daimo-error)",
        second: "var(--daimo-error)",
        line: "var(--daimo-error)",
        text: "var(--daimo-error)",
      };
  }
}
