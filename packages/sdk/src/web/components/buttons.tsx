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
    "w-full max-w-xs min-h-[44px] py-4 px-6 rounded-[var(--daimo-radius-lg)] font-medium flex items-center justify-center gap-2 touch-action-manipulation transition-[background-color] duration-100 ease";
  const enabledStyles =
    "bg-[var(--daimo-surface-secondary)] text-[var(--daimo-text)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)]";
  const disabledStyles =
    "bg-[var(--daimo-surface-secondary)] text-[var(--daimo-text-muted)] cursor-not-allowed";

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
    "min-h-[44px] py-3 px-8 rounded-[var(--daimo-radius-md)] font-medium flex items-center justify-center gap-2 touch-action-manipulation transition-[background-color] duration-100 ease";
  const enabledStyles =
    "bg-[var(--daimo-surface-secondary)] text-[var(--daimo-text)] hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)]";
  const disabledStyles =
    "bg-[var(--daimo-surface-secondary)] text-[var(--daimo-text-muted)] cursor-not-allowed";

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
