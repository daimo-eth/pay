type IconProps = {
  className?: string;
  size?: number;
};

/** Green checkmark icon for success states */
export function CheckIcon({ className, size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "text-[var(--daimo-success)]"}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

/** Clock icon for expired/timeout states */
export function ExpiredIcon({ className, size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "text-[var(--daimo-error)]"}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

/** X icon for error states */
export function ErrorIcon({ className, size = 40 }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "text-[var(--daimo-error)]"}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6" />
      <path d="M9 9l6 6" />
    </svg>
  );
}

/** Back arrow for navigation */
export function BackArrowIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size * 0.6}
      height={size}
      viewBox="0 0 12 20"
      fill="none"
      className={className ?? "text-[var(--daimo-text-muted)]"}
    >
      <path
        d="M10 18L2 10L10 2"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Close X icon for modal dismiss - matches BackArrowIcon style */
export function CloseIcon({ className, size = 20 }: IconProps) {
  return (
    <svg
      width={size * 0.6}
      height={size * 0.6}
      viewBox="0 0 12 12"
      fill="none"
      className={className ?? "text-[var(--daimo-text-muted)]"}
    >
      <path
        d="M2 2L10 10M10 2L2 10"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Copy icon with checkmark state */
export function CopyIcon({
  className,
  size = 20,
  copied = false,
}: IconProps & { copied?: boolean }) {
  if (copied) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className ?? "text-[var(--daimo-accent)]"}
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    );
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className ?? "text-[var(--daimo-text-muted)]"}
    >
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

/** External link icon */
export function ExternalLinkIcon({ className, size = 16 }: IconProps) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M4 4C2.89543 4 2 4.89543 2 6V12C2 13.1046 2.89543 14 4 14H10C11.1046 14 12 13.1046 12 12V9.66667C12 9.11438 12.4477 8.66667 13 8.66667C13.5523 8.66667 14 9.11438 14 9.66667V12C14 14.2091 12.2091 16 10 16H4C1.79086 16 0 14.2091 0 12V6C0 3.79086 1.79086 2 4 2H6.33333C6.88562 2 7.33333 2.44772 7.33333 3C7.33333 3.55228 6.88562 4 6.33333 4H4Z"
        fill="currentColor"
        fillOpacity={0.4}
      />
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9.5 1C9.5 0.447715 9.94772 0 10.5 0H15C15.5523 0 16 0.447715 16 1V5.5C16 6.05228 15.5523 6.5 15 6.5C14.4477 6.5 14 6.05228 14 5.5V3.41421L8.70711 8.70711C8.31658 9.09763 7.68342 9.09763 7.29289 8.70711C6.90237 8.31658 6.90237 7.68342 7.29289 7.29289L12.5858 2H10.5C9.94772 2 9.5 1.55228 9.5 1Z"
        fill="currentColor"
        fillOpacity={0.4}
      />
    </svg>
  );
}
