import { ReactNode } from "react";

import { ExternalLinkIcon } from "./icons.js";

export { ExternalLinkIcon };

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  icon?: ReactNode;
  className?: string;
};

/** Primary action button - full width, prominent styling */
export function PrimaryButton({
  children,
  onClick,
  disabled = false,
  icon,
  className = "",
}: ButtonProps) {
  // Base: min 44px tap target, prevent double-tap zoom
  const baseStyles =
    "daimo-w-full daimo-max-w-xs daimo-min-h-[44px] daimo-py-4 daimo-px-6 daimo-rounded-[var(--daimo-radius-lg)] daimo-font-medium daimo-flex daimo-items-center daimo-justify-center daimo-gap-2 daimo-touch-action-manipulation daimo-transition-[background-color] daimo-duration-100 daimo-ease";
  const enabledStyles =
    "daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text)] hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-hover)]";
  const disabledStyles =
    "daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text-muted)] daimo-cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${disabled ? disabledStyles : enabledStyles} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

/** Secondary action button - for less prominent actions like "Done", "Close" */
export function SecondaryButton({
  children,
  onClick,
  disabled = false,
  icon,
  className = "",
}: ButtonProps) {
  // Base: min 44px tap target, prevent double-tap zoom
  const baseStyles =
    "daimo-min-h-[44px] daimo-py-3 daimo-px-8 daimo-rounded-[var(--daimo-radius-md)] daimo-font-medium daimo-flex daimo-items-center daimo-justify-center daimo-gap-2 daimo-touch-action-manipulation daimo-transition-[background-color] daimo-duration-100 daimo-ease";
  const enabledStyles =
    "daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text)] hover:[@media(hover:hover)]:daimo-bg-[var(--daimo-surface-hover)]";
  const disabledStyles =
    "daimo-bg-[var(--daimo-surface-secondary)] daimo-text-[var(--daimo-text-muted)] daimo-cursor-not-allowed";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${disabled ? disabledStyles : enabledStyles} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}
