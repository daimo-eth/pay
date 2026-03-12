import type { NavNodeDepositAddress } from "../api/navTree.js";
import { TokenLogo } from "../../common/token.js";
import { tron } from "../../common/chain.js";
import { useMemo, useState } from "react";
import { getAddress } from "viem";

import { SecondaryButton } from "./buttons.js";
import { Countdown, useCountdown } from "./Countdown.js";
import { useDaimoClient } from "../hooks/DaimoClientContext.js";
import { t } from "../hooks/locale.js";
import { createNavLogger } from "../hooks/navEvent.js";
import { QRCode } from "./QRCode.js";
import {
  CopyableInfoCard,
  PageHeader,
  resolveIconUrl,
  TokenIconWithChainBadge,
} from "./shared.js";

type DepositToken = "USDC" | "USDT";

const depositTokenLogos: Record<DepositToken, string> = {
  USDC: TokenLogo.USDC,
  USDT: TokenLogo.USDT,
};

/** 1 hour in seconds — standard DA address lifetime */
const DA_LIFETIME_S = 3600;

type WaitingDepositAddressPageProps = {
  node: NavNodeDepositAddress;
  amountUsd: number;
  selectedToken?: DepositToken;
  sessionId: string;
  clientSecret?: string;
  loading?: boolean;
  onBack: () => void;
  onRefresh: () => void;
  baseUrl: string;
};

export function WaitingDepositAddressPage({
  node,
  amountUsd,
  selectedToken,
  sessionId,
  clientSecret = "",
  loading = false,
  onBack,
  onRefresh,
  baseUrl,
}: WaitingDepositAddressPageProps) {
  const client = useDaimoClient();
  const logNavEvent = useMemo(() => createNavLogger(client), [client]);

  const hasAddress = !loading && !!node.address;
  const address = hasAddress
    ? normalizeAddress(node.address, node.chainId)
    : "";
  const shortAddress = hasAddress
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : "";
  const [showQR, setShowQR] = useState(false);
  const tokenSuffix = selectedToken ?? node.tokenSuffix ?? "USDT or USDC";

  const nodeCtx = { nodeId: node.id, nodeType: node.type };
  const { remainingS, isExpired } = useCountdown(node.expiresAt, DA_LIFETIME_S);

  const handleQRToggle = () => {
    if (!hasAddress) return;
    setShowQR((v) => {
      logNavEvent(sessionId, clientSecret, { ...nodeCtx, action: "qr_toggle", visible: !v });
      return !v;
    });
  };

  const handleCopyAddress = (value: string) => {
    logNavEvent(sessionId, clientSecret, {
      ...nodeCtx,
      action: "copy_address",
      address: value,
    });
  };

  const pageTitle = selectedToken
    ? `${t.deposit} ${selectedToken}`
    : `${t.depositOn} ${node.title}`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <PageHeader title={pageTitle} onBack={onBack} />

      <div className="flex-1 flex flex-col items-center p-6 gap-6">
        {isExpired ? (
          <div className="h-24 flex items-center justify-center">
            <SecondaryButton onClick={onRefresh}>
              {t.generateNewAddress}
            </SecondaryButton>
          </div>
        ) : (
          <LogoOrQR
            showQR={showQR}
            address={address}
            node={node}
            selectedToken={selectedToken}
            baseUrl={baseUrl}
          />
        )}

        {!isExpired && hasAddress && (
          <QRToggleButton showQR={showQR} onToggle={handleQRToggle} />
        )}

        <div className="w-full max-w-sm space-y-3">
          {hasAddress ? (
            <CopyableInfoCard
              label={t.oneTimeAddress}
              value={address}
              displayValue={shortAddress}
              disabled={isExpired}
              onCopy={handleCopyAddress}
            />
          ) : (
            <AddressSkeleton />
          )}
          <CopyableInfoCard
            label={t.amount}
            value={amountUsd.toFixed(2)}
            suffix={tokenSuffix}
            disabled={isExpired}
          />
        </div>

        <Countdown remainingS={remainingS} isExpired={isExpired} totalS={DA_LIFETIME_S} />
      </div>
    </div>
  );
}

// --- Sub-components ---

/** Token icon (large) or QR code with token icon in center. Animated crossfade. */
function LogoOrQR({
  showQR,
  address,
  node,
  selectedToken,
  baseUrl,
}: {
  showQR: boolean;
  address: string;
  node: NavNodeDepositAddress;
  selectedToken?: DepositToken;
  baseUrl: string;
}) {
  return (
    <div className="relative w-full flex items-center justify-center">
      {/* Spacer — grows to QR height when toggled */}
      <div
        className="w-full max-w-[200px] sm:max-w-[260px] transition-qr-spacer"
        style={{ height: showQR ? "226px" : "96px" }}
      />

      {/* QR code — fades in */}
      <div
        className="absolute inset-0 flex items-center justify-center transition-qr"
        style={{
          opacity: showQR ? 1 : 0,
          transform: showQR ? "scale(1)" : "scale(0.96)",
          pointerEvents: showQR ? "auto" : "none",
        }}
      >
        <div className="w-full max-w-[200px] sm:max-w-[260px]">
          <QRCode
            value={address}
            image={
              <TokenIcon node={node} selectedToken={selectedToken} size="qr" baseUrl={baseUrl} />
            }
          />
        </div>
      </div>

      {/* Large token icon — fades out when QR opens */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="transition-qr-icon"
          style={{
            transform: showQR ? "scale(0.6)" : "scale(1)",
            opacity: showQR ? 0 : 1,
          }}
        >
          <TokenIcon node={node} selectedToken={selectedToken} size="lg" baseUrl={baseUrl} />
        </div>
      </div>
    </div>
  );
}

/** Token icon at the given size, with chain badge. */
function TokenIcon({
  node,
  selectedToken,
  size,
  baseUrl,
}: {
  node: NavNodeDepositAddress;
  selectedToken?: DepositToken;
  size: "lg" | "qr";
  baseUrl: string;
}) {
  if (selectedToken) {
    return (
      <TokenIconWithChainBadge
        chainId={node.chainId}
        symbol={selectedToken}
        logoURI={depositTokenLogos[selectedToken]}
        size={size}
        baseUrl={baseUrl}
        badgeBorderClass={
          size === "qr"
            ? "border-[1.5px] bg-[var(--daimo-qr-bg,white)] border-[var(--daimo-qr-bg,white)]"
            : "border-2 bg-[var(--daimo-surface)] border-[var(--daimo-surface)]"
        }
      />
    );
  }
  if (node.icon) {
    const iconSize = size === "qr" ? "w-12 h-12" : "w-20 h-20";
    return (
      <img
        src={resolveIconUrl(node.icon, baseUrl)}
        alt={node.title}
        className={`${iconSize} rounded-full`}
      />
    );
  }
  return null;
}

function QRToggleButton({
  showQR,
  onToggle,
}: {
  showQR: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 text-[var(--daimo-text-secondary)] min-h-[44px] touch-action-manipulation"
      aria-label={showQR ? t.hideQR : t.showQR}
    >
      <span className="text-sm">{showQR ? t.hideQR : t.showQR}</span>
      <QRIcon />
    </button>
  );
}

function AddressSkeleton() {
  return (
    <div className="w-full min-h-[56px] p-4 bg-[var(--daimo-surface-secondary)] rounded-[var(--daimo-radius-sm)] flex flex-col gap-2">
      <div
        className="h-3 w-24 rounded animate-pulse"
        style={{ backgroundColor: "var(--daimo-skeleton)" }}
      />
      <div
        className="h-5 w-40 rounded animate-pulse"
        style={{
          backgroundColor: "var(--daimo-skeleton)",
          animationDelay: "100ms",
        }}
      />
    </div>
  );
}

function QRIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5Z" />
      <path d="M3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
      <path d="M13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
      <path d="M6.75 6.75h.75v.75h-.75v-.75Z" />
      <path d="M6.75 16.5h.75v.75h-.75v-.75Z" />
      <path d="M16.5 6.75h.75v.75h-.75v-.75Z" />
      <path d="M13.5 13.5h.75v.75h-.75v-.75Z" />
      <path d="M13.5 19.5h.75v.75h-.75v-.75Z" />
      <path d="M19.5 13.5h.75v.75h-.75v-.75Z" />
      <path d="M19.5 19.5h.75v.75h-.75v-.75Z" />
      <path d="M16.5 16.5h.75v.75h-.75v-.75Z" />
    </svg>
  );
}

// --- Helpers ---

function normalizeAddress(addr: string, chainId: number): string {
  if (chainId === tron.chainId) return addr;
  return getAddress(addr);
}
