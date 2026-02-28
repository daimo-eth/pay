import {
  arbitrum,
  base,
  bsc,
  celo,
  ethereum,
  getChainName,
  gnosis,
  hyperEvm,
  linea,
  monad,
  optimism,
  polygon,
  scroll,
  solana,
  supportedChains,
  tron,
  worldchain,
} from "../../common/chain.js";
import type { DaimoPayToken } from "../api/walletTypes.js";
import { ReactNode, useCallback, useState } from "react";

import { BackArrowIcon, CopyIcon } from "./icons.js";
import { t } from "../hooks/locale.js";

export { BackArrowIcon };

const PAY_BASE_URL = "https://daimo.com";

type SupportedChainId = (typeof supportedChains)[number]["chainId"];

const CHAIN_LOGOS: Record<SupportedChainId, string> = {
  [arbitrum.chainId]: "arbitrum.svg",
  [base.chainId]: "base.svg",
  [bsc.chainId]: "bsc.svg",
  [celo.chainId]: "celo.svg",
  [ethereum.chainId]: "ethereum.svg",
  [gnosis.chainId]: "gnosis.svg",
  [hyperEvm.chainId]: "hyperevm.svg",
  [linea.chainId]: "linea.svg",
  [monad.chainId]: "monad.svg",
  [optimism.chainId]: "optimism.svg",
  [polygon.chainId]: "polygon.svg",
  [scroll.chainId]: "scroll.svg",
  [solana.chainId]: "solana.svg",
  [tron.chainId]: "tron.svg",
  [worldchain.chainId]: "worldchain.svg",
};

// --- Copy to Clipboard Hook ---

function useCopyToClipboard(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelayMs);
      } catch {
        console.error("failed to copy to clipboard");
      }
    },
    [resetDelayMs],
  );

  return { copy, copied };
}

// --- Amount Input ---

type AmountInputProps = {
  minimumUsd: number;
  maximumUsd: number;
  /** Label shown below input (e.g., "Balance: $X.XX" or "Minimum $X.XX") */
  defaultLabel?: string;
  onSubmit: (amountUsd: number) => void;
  /** Called whenever the amount changes */
  onChange?: (amountUsd: number, isValid: boolean) => void;
};

/**
 * USD amount input with dynamic width and min/max validation.
 * Shows warning messages when amount is outside valid range.
 */
export function AmountInput({
  minimumUsd,
  maximumUsd,
  defaultLabel,
  onSubmit,
  onChange,
}: AmountInputProps) {
  const [inputValue, setInputValue] = useState("");

  const amountUsd = parseFloat(inputValue) || 0;
  const isValid = amountUsd >= minimumUsd && amountUsd <= maximumUsd;
  const showMinWarning = inputValue !== "" && amountUsd < minimumUsd;
  const showMaxWarning = inputValue !== "" && amountUsd > maximumUsd;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow empty, or digits with up to 2 decimal places
    if (value === "" || /^\d*\.?\d{0,2}$/.test(value)) {
      setInputValue(value);
      const newAmount = parseFloat(value) || 0;
      const newIsValid = newAmount >= minimumUsd && newAmount <= maximumUsd;
      onChange?.(newAmount, newIsValid);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && isValid) {
      onSubmit(amountUsd);
    }
  };

  // Dynamic width: shrink for decimal point, min 1ch, max 10ch
  const inputWidth =
    inputValue.length === 0
      ? "3.55ch"
      : `${Math.min(inputValue.length - (inputValue.match(/\./g) || []).length * 0.45, 10)}ch`;

  const label = showMinWarning
    ? `${t.minimum} $${minimumUsd.toFixed(2)}`
    : showMaxWarning
      ? `${t.maximum} $${maximumUsd.toFixed(0)}`
      : (defaultLabel ?? `${t.minimum} $${minimumUsd.toFixed(2)}`);

  const labelClass =
    showMinWarning || showMaxWarning
      ? "text-sm text-[var(--daimo-text)]"
      : "text-sm text-[var(--daimo-text-secondary)]";

  // $ sign color: placeholder when empty, text color when typed
  const dollarColor = inputValue
    ? "text-[var(--daimo-text)]"
    : "text-[var(--daimo-placeholder)]";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex items-center justify-center gap-1">
        <span className={`text-3xl font-semibold ${dollarColor}`}>$</span>
        <input
          type="text"
          inputMode="decimal"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="0.00"
          className="bg-transparent text-5xl font-semibold text-[var(--daimo-text)] placeholder-[var(--daimo-placeholder)] outline-none border-none ring-0 shadow-none caret-[var(--daimo-text-muted)] focus:outline-none"
          style={{
            width: inputWidth,
            minWidth: "1ch",
            maxWidth: "10ch",
          }}
          autoFocus
        />
      </div>
      <p className={labelClass}>{label}</p>
    </div>
  );
}

/** Hook to manage amount input state externally */
export function useAmountInput(minimumUsd: number, maximumUsd: number) {
  const [amountUsd, setAmountUsd] = useState(0);
  const [isValid, setIsValid] = useState(false);

  const handleChange = (amount: number, valid: boolean) => {
    setAmountUsd(amount);
    setIsValid(valid);
  };

  return { amountUsd, isValid, handleChange };
}

/** Resolve relative icon paths to absolute URLs */
export function resolveIconUrl(icon: string): string {
  if (
    icon.startsWith("http://") ||
    icon.startsWith("https://") ||
    icon.startsWith("data:")
  ) {
    return icon;
  }
  return `${PAY_BASE_URL}${icon}`;
}

/** Standard page header with optional back button and centered title */
type PageHeaderProps = {
  title: string;
  onBack?: (() => void) | null;
};

export function PageHeader({ title, onBack }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-center p-6 bg-[var(--daimo-surface)]">
      {onBack && (
        <button
          onClick={onBack}
          aria-label="Go back"
          className="absolute left-2 min-w-[44px] min-h-[44px] flex items-center justify-center px-4 py-2 rounded-lg touch-action-manipulation hover:[@media(hover:hover)]:bg-[var(--daimo-surface-secondary)] active:bg-[var(--daimo-surface-secondary)] active:scale-[0.95] transition-[background-color,transform] duration-150 ease-out"
        >
          <BackArrowIcon />
        </button>
      )}
      <h1 className="text-lg font-semibold text-[var(--daimo-title)] text-balance">
        {title}
      </h1>
    </div>
  );
}

/** Standard page logo display */
type PageLogoProps = {
  icon: string;
  alt: string;
  size?: "md" | "lg";
};

export function PageLogo({ icon, alt, size = "lg" }: PageLogoProps) {
  const sizeClass = size === "lg" ? "w-20 h-20" : "w-16 h-16";
  return (
    <img
      src={resolveIconUrl(icon)}
      alt={alt}
      className={`${sizeClass} object-contain rounded-[25%]`}
    />
  );
}

/** Scrollable content area for list pages. Fills remaining space after header. */
export function ScrollContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto scroll-fade px-6 pb-4">
      {children}
    </div>
  );
}

/** Centered content container for detail pages (icon + message + action). */
export function CenteredContent({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6 min-h-[320px]">
      {children}
    </div>
  );
}

/** Centered error message */
export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="text-sm text-[var(--daimo-text-secondary)] text-center max-w-xs truncate">
      {message}
    </p>
  );
}

type ContactSupportButtonProps = {
  subject: string;
  info: Record<string, string>;
};

/** Contact support mailto link button */
export function ContactSupportButton({
  subject,
  info,
}: ContactSupportButtonProps) {
  const email = "support@daimo.com";
  const bodyLines = [
    ...Object.entries(info).map(([key, value]) => `${key}: ${value}`),
    "",
    t.tellUsHowWeCanHelp,
  ];
  const body = bodyLines.join("\n");
  const href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  return (
    <a
      href={href}
      className="text-sm text-[var(--daimo-text-secondary)] hover:text-[var(--daimo-text)] underline"
    >
      {t.contactSupport}
    </a>
  );
}

/** Show receipt link button */
export function ShowReceiptButton({ sessionId }: { sessionId: string }) {
  return (
    <a
      href={`${PAY_BASE_URL}/receipt?id=${sessionId}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm text-[var(--daimo-text-muted)] underline"
    >
      {t.showReceipt}
    </a>
  );
}

// --- Token Icon with Chain Badge ---

type TokenIconWithChainBadgeProps = {
  /** Full token object (preferred — provides logoURI) */
  token?: DaimoPayToken;
  /** Alternative: just chainId, symbol, and logoURI (for cases without full token) */
  chainId?: number;
  symbol?: string;
  logoURI?: string;
  /** Size variant: "sm" (32px) for lists, "lg" (80px) for headers, "qr" (48px) for QR codes */
  size?: "sm" | "lg" | "qr";
  /** Border color class for the chain badge (defaults to row background colors) */
  badgeBorderClass?: string;
};

/**
 * Token icon with chain badge overlay.
 * - "sm": 32x32 token, 15x15 badge (for list rows)
 * - "lg": 80x80 token, 32x32 badge (for page headers)
 * - "qr": 48x48 token, 16x16 badge at top-right (for QR code centers)
 */
export function TokenIconWithChainBadge({
  token,
  chainId,
  symbol,
  logoURI,
  size = "sm",
  badgeBorderClass,
}: TokenIconWithChainBadgeProps) {
  const tokenSymbol = token?.symbol ?? symbol ?? "USDC";
  const tokenChainId = token?.chainId ?? chainId ?? 1;
  const logoUrl = token?.logoURI ?? logoURI;
  const chainLogoUrl = `/chain-logos/${getChainLogoFilename(tokenChainId)}`;

  const sizeConfig = {
    sm: {
      container: "w-8 h-8 shrink-0",
      icon: "w-8 h-8 rounded-full",
      badge: "w-[15px] h-[15px]",
      position: "absolute -bottom-0.5 -right-0.5",
      style: {
        borderWidth: "1px",
        borderColor: "var(--daimo-surface-secondary)",
        backgroundColor: "var(--daimo-surface-secondary)",
      },
    },
    lg: {
      container: "w-20 h-20",
      icon: "w-20 h-20 object-contain rounded-full",
      badge: "w-8 h-8",
      position: "absolute -bottom-1 -right-1",
      style: {
        borderWidth: "2px",
        borderColor: "var(--daimo-surface)",
        backgroundColor: "var(--daimo-surface)",
      },
    },
    qr: {
      container: "w-12 h-12",
      icon: "w-12 h-12 object-contain rounded-full",
      badge: "w-5 h-5",
      position: "absolute -bottom-0.5 -right-0.5",
      style: {
        borderWidth: "1.5px",
        borderColor: "var(--daimo-surface)",
        backgroundColor: "var(--daimo-surface)",
      },
    },
  };

  const config = sizeConfig[size];

  return (
    <div className={`relative ${config.container}`}>
      {/* Token icon */}
      {logoUrl && (
        <img
          src={resolveIconUrl(logoUrl)}
          alt={tokenSymbol}
          className={config.icon}
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      {/* Chain badge with background fill */}
      <img
        src={resolveIconUrl(chainLogoUrl)}
        alt={getChainName(tokenChainId)}
        className={`${config.position} ${config.badge} rounded-full ${badgeBorderClass ?? ""}`}
        style={badgeBorderClass ? undefined : config.style}
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </div>
  );
}

/** Map chainId to logo filename */
export function getChainLogoFilename(chainId: number): string {
  return CHAIN_LOGOS[chainId] ?? "ethereum.svg";
}

// --- Copyable Info Card ---

type CopyableInfoCardProps = {
  label: string;
  value: string;
  /** Display value (if different from copy value) */
  displayValue?: string;
  /** Suffix shown after display value */
  suffix?: string;
  disabled?: boolean;
  /** Callback when value is copied */
  onCopy?: (value: string) => void;
};

/** Card with label, value, and copy button */
export function CopyableInfoCard({
  label,
  value,
  displayValue,
  suffix,
  disabled = false,
  onCopy,
}: CopyableInfoCardProps) {
  const { copy, copied } = useCopyToClipboard();

  const handleCopy = () => {
    copy(value);
    onCopy?.(value);
  };

  return (
    <button
      onClick={handleCopy}
      disabled={disabled}
      aria-label={`Copy ${label}`}
      className="w-full min-h-[56px] p-4 bg-[var(--daimo-surface-secondary)] rounded-[var(--daimo-radius-lg)] flex items-center justify-between touch-action-manipulation hover:[@media(hover:hover)]:bg-[var(--daimo-surface-hover)] active:scale-[0.98] transition-[background-color,transform] duration-150 ease-out disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <div className="text-left">
        <p className="text-sm text-[var(--daimo-text-secondary)] font-medium mb-1">
          {label}
        </p>
        <p className="text-lg font-semibold text-[var(--daimo-text)] tabular-nums">
          {displayValue ?? value}
          {suffix && <span className="ml-2">{suffix}</span>}
        </p>
      </div>
      <CopyIcon copied={copied} />
    </button>
  );
}
