type ConfirmationSpinnerProps = {
  done: boolean;
};

/** Spinner → checkmark transition for payment confirmation. */
export function ConfirmationSpinner({ done }: ConfirmationSpinnerProps) {
  return (
    <div className="daimo-relative daimo-w-[100px] daimo-h-[100px]">
      <div
        className="daimo-absolute daimo-inset-[6px] daimo-rounded-full daimo-flex daimo-items-center daimo-justify-center daimo-overflow-hidden"
        style={{ backgroundColor: "var(--daimo-bg)" }}
      >
        {/* Spinner - visible when not done */}
        <LoadingCircle
          className={`daimo-absolute daimo-w-full daimo-h-full daimo-transition-opacity daimo-duration-200 ${
            done ? "daimo-opacity-0" : "daimo-opacity-100"
          }`}
          spinning={!done}
        />

        {/* Checkmark - visible when done */}
        <TickIcon
          className={`daimo-absolute daimo-w-full daimo-h-full daimo-transition-[opacity,transform] daimo-duration-200 ${
            done ? "daimo-opacity-100 daimo-scale-100" : "daimo-opacity-0 daimo-scale-50"
          }`}
          style={{ color: "var(--daimo-checkmark)" }}
        />
      </div>
    </div>
  );
}

function LoadingCircle({
  className,
  spinning,
}: {
  className?: string;
  spinning?: boolean;
}) {
  return (
    <svg
      className={className}
      style={{
        color: "var(--daimo-accent)",
        animation: spinning ? "daimo-spin 400ms linear infinite" : "none",
      }}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <style>{`
        @keyframes daimo-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      <circle cx="50" cy="50" r="50" fill="currentColor" fillOpacity="0.15" />
      <circle
        cx="50"
        cy="50"
        r="30"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="16"
      />
      <path
        d="M50 20V20C66.5685 20 80 33.4315 80 50V50"
        stroke="currentColor"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TickIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 18C13.9706 18 18 13.9706 18 9C18 4.02944 13.9706 0 9 0C4.02944 0 0 4.02944 0 9C0 13.9706 4.02944 18 9 18ZM13.274 7.13324C13.6237 6.70579 13.5607 6.07577 13.1332 5.72604C12.7058 5.37632 12.0758 5.43932 11.726 5.86676L7.92576 10.5115L6.20711 8.79289C5.81658 8.40237 5.18342 8.40237 4.79289 8.79289C4.40237 9.18342 4.40237 9.81658 4.79289 10.2071L7.29289 12.7071C7.49267 12.9069 7.76764 13.0128 8.04981 12.9988C8.33199 12.9847 8.59505 12.8519 8.77396 12.6332L13.274 7.13324Z"
        fill="currentColor"
      />
    </svg>
  );
}
