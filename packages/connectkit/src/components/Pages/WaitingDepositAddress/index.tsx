import {
  arbitrumUSDC,
  baseUSDC,
  DepositAddressPaymentOptionMetadata,
  DepositAddressPaymentOptions,
  ethereumUSDC,
  getAddressContraction,
  getChainName,
  isHydrated,
  optimismUSDC,
  polygonUSDC,
  type Token,
} from "@daimo/pay-common";
import { useEffect, useMemo, useState } from "react";
import { keyframes } from "styled-components";
import { AlertIcon, WarningIcon } from "../../../assets/icons";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import useIsMobile from "../../../hooks/useIsMobile";
import useLocales from "../../../hooks/useLocales";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
import Button from "../../Common/Button";
import CircleTimer from "../../Common/CircleTimer";
import CopyToClipboardIcon from "../../Common/CopyToClipboard/CopyToClipboardIcon";
import CustomQRCode from "../../Common/CustomQRCode";
import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";
import TokenChainLogo from "../../Common/TokenChainLogo";

// Centered container for icon + text in Tron underpay screen
const CenterContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  max-width: 100%;
`;

type DepositAddr = {
  displayToken: Token | null;
  logoURI: string;
  expirationS?: number;
  uri?: string;
  coins?: string;
  amount?: string;
  address?: string;
  underpayment?: Underpayment;
};

type Underpayment = {
  unitsPaid: string;
  coin: string;
};

export default function WaitingDepositAddress() {
  const context = usePayContext();
  const { triggerResize, paymentState, trpc } = context;
  const { payWithDepositAddress, selectedDepositAddressOption } = paymentState;
  const { order } = useDaimoPay();

  // Detect Optimism USDT0 under-payment: the order has received some funds
  // but less than required.
  const tronUnderpay =
    order != null &&
    isHydrated(order) &&
    order.sourceTokenAmount != null &&
    order.sourceTokenAmount.token.chainId === 10 &&
    order.sourceTokenAmount.token.symbol.toUpperCase() === "USDT0" &&
    Number(order.sourceTokenAmount.usd) < order.usdValue;

  const [depAddr, setDepAddr] = useState<DepositAddr>();
  const [failed, setFailed] = useState(false);

  // If we selected a deposit address option, generate the address...
  const generateDepositAddress = () => {
    if (selectedDepositAddressOption == null) {
      if (order == null || !isHydrated(order)) return;
      if (order.sourceTokenAmount == null) return;

      // Pay underpaid order
      const taPaid = order.sourceTokenAmount;
      const usdPaid = taPaid.usd; // TODO: get usdPaid directly from the order
      const usdToPay = Math.max(order.usdValue - usdPaid, 0.01);
      const dispDecimals = taPaid.token.displayDecimals;
      const unitsToPay = (usdToPay / taPaid.token.usd).toFixed(dispDecimals);
      const unitsPaid = (
        Number(taPaid.amount) /
        10 ** taPaid.token.decimals
      ).toFixed(dispDecimals);

      // (Removed duplicate tronUnderpay calculation now handled at top-level)
      // Hack to always show a <= 60 minute countdown
      let expirationS = (order.createdAt ?? 0) + 59.5 * 60;
      if (
        order.expirationTs != null &&
        Number(order.expirationTs) < expirationS
      ) {
        expirationS = Number(order.expirationTs);
      }

      setDepAddr({
        address: order.intentAddr,
        amount: unitsToPay,
        underpayment: { unitsPaid, coin: taPaid.token.symbol },
        coins: `${taPaid.token.symbol} on ${getChainName(taPaid.token.chainId)}`,
        expirationS: expirationS,
        uri: order.intentAddr,
        displayToken: taPaid.token,
        logoURI: "", // Not needed for underpaid orders
      });
    } else {
      const displayToken = getDisplayToken(selectedDepositAddressOption);
      const logoURI = selectedDepositAddressOption.logoURI;
      setDepAddr({
        displayToken,
        logoURI,
      });
      payWithDepositAddress(selectedDepositAddressOption.id).then((details) => {
        if (details) {
          setDepAddr({
            address: details.address,
            amount: details.amount,
            coins: details.suffix,
            expirationS: details.expirationS,
            uri: details.uri,
            displayToken,
            logoURI,
          });
        } else {
          setFailed(true);
        }
      });
    }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(generateDepositAddress, [selectedDepositAddressOption]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(triggerResize, [depAddr, failed]);

  return (
    <PageContent>
      {tronUnderpay ? (
        <TronUnderpayContent orderId={order?.id?.toString()} />
      ) : failed ? (
        selectedDepositAddressOption && (
          <DepositFailed name={selectedDepositAddressOption.id} />
        )
      ) : (
        depAddr && (
          <DepositAddressInfo
            depAddr={depAddr}
            refresh={generateDepositAddress}
            triggerResize={triggerResize}
          />
        )
      )}
    </PageContent>
  );
}

function TronUnderpayContent({ orderId }: { orderId?: string }) {
  const locales = useLocales();
  return (
    <ModalContent
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        paddingBottom: 0,
        position: "relative",
      }}
    >
      <CenterContainer>
        <FailIcon />
        <ModalH1 style={{ textAlign: "center", marginTop: 16 }}>
          USDT Tron Payment Was Too Low
        </ModalH1>
        <div style={{ height: 16 }} />
        <ModalBody style={{ textAlign: "center" }}>
          Your funds are safe.
          <br />
          Email support@daimo.com for a refund.
        </ModalBody>
        <Button
          onClick={() =>
            window.open(
              `mailto:support@daimo.com?subject=Underpaid%20USDT%20Tron%20payment%20for%20order%20${orderId}`,
              "_blank",
            )
          }
          style={{ marginTop: 16, width: 200 }}
        >
          {locales.contactSupport}
        </Button>
      </CenterContainer>
    </ModalContent>
  );
}

function DepositAddressInfo({
  depAddr,
  refresh,
  triggerResize,
}: {
  depAddr: DepositAddr;
  refresh: () => void;
  triggerResize: () => void;
}) {
  const { isMobile } = useIsMobile();
  const locales = useLocales();
  const [remainingS, totalS] = useCountdown(depAddr?.expirationS);
  const isExpired = depAddr?.expirationS != null && remainingS === 0;
  const [showQR, setShowQR] = useState(!isMobile);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(triggerResize, [isExpired, showQR]);

  const logoOffset = isMobile ? 4 : 0;
  const logoElement = depAddr.displayToken ? (
    <TokenChainLogo
      token={depAddr.displayToken}
      size={64}
      offset={logoOffset}
    />
  ) : (
    <img src={depAddr.logoURI} width="64px" height="64px" />
  );

  return (
    <ModalContent>
      {isExpired ? (
        <LogoRow>
          <Button onClick={refresh} style={{ width: 128 }}>
            {locales.refresh}
          </Button>
        </LogoRow>
      ) : showQR ? (
        <QRWrap>
          <CustomQRCode
            value={depAddr?.uri}
            contentPadding={24}
            size={200}
            image={logoElement}
          />
        </QRWrap>
      ) : (
        <LogoRow>
          <LogoWrap>{logoElement}</LogoWrap>
        </LogoRow>
      )}
      <div style={{ height: 8 }} />
      {isMobile && <ShowHideQRRow showQR={showQR} setShowQR={setShowQR} />}
      <CopyableInfo depAddr={depAddr} remainingS={remainingS} totalS={totalS} />
    </ModalContent>
  );
}

function getDisplayToken(meta: DepositAddressPaymentOptionMetadata) {
  switch (meta.id) {
    case DepositAddressPaymentOptions.OP_MAINNET:
      return optimismUSDC;
    case DepositAddressPaymentOptions.ARBITRUM:
      return arbitrumUSDC;
    case DepositAddressPaymentOptions.BASE:
      return baseUSDC;
    case DepositAddressPaymentOptions.POLYGON:
      return polygonUSDC;
    case DepositAddressPaymentOptions.ETH_L1:
      return ethereumUSDC;
    default:
      return null;
  }
}

function ShowHideQRRow({
  showQR,
  setShowQR,
}: {
  showQR: boolean;
  setShowQR: (showQR: boolean) => void;
}) {
  const toggleQR = () => setShowQR(!showQR);
  const locales = useLocales();

  return (
    <ShowQRWrap>
      <CopyRow onClick={toggleQR}>
        <SmallText>{showQR ? locales.hideQR : locales.showQR}</SmallText>
        <div style={{ width: 8 }} />
        <ShowQRIcon>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="#666"
            className="size-6"
            width={20}
            height={20}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z"
            />
          </svg>
        </ShowQRIcon>
      </CopyRow>
    </ShowQRWrap>
  );
}

const ShowQRWrap = styled.div`
  display: flex;
  justify-content: center;
  color: var(--ck-primary-button-color);
`;

const ShowQRIcon = styled.div`
  width: 20px;
`;

const LogoWrap = styled.div`
  position: relative;
  width: 64px;
  height: 64px;
`;

const LogoRow = styled.div`
  padding: 32px 0;
  height: 128px;
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
`;

const QRWrap = styled.div`
  margin: 0 auto;
  width: 280px;
`;

function CopyableInfo({
  depAddr,
  remainingS,
  totalS,
}: {
  depAddr?: DepositAddr;
  remainingS: number;
  totalS: number;
}) {
  const underpayment = depAddr?.underpayment;
  const isExpired = depAddr?.expirationS != null && remainingS === 0;
  const locales = useLocales();
  return (
    <CopyableInfoWrapper>
      {underpayment && <UnderpaymentInfo underpayment={underpayment} />}
      <CopyRowOrThrobber
        title={locales.sendExactly}
        value={depAddr?.amount}
        smallText={depAddr?.coins}
        disabled={isExpired}
      />
      <CopyRowOrThrobber
        title={locales.receivingAddress}
        value={depAddr?.address}
        valueText={depAddr?.address && getAddressContraction(depAddr.address)}
        disabled={isExpired}
      />
      <CountdownWrap>
        <CountdownTimer remainingS={remainingS} totalS={totalS} />
      </CountdownWrap>
    </CopyableInfoWrapper>
  );
}

function UnderpaymentInfo({ underpayment }: { underpayment: Underpayment }) {
  // Default message
  return (
    <UnderpaymentWrapper>
      <UnderpaymentHeader>
        <WarningIcon />
        <span>
          Received {underpayment.unitsPaid} {underpayment.coin}
        </span>
      </UnderpaymentHeader>
      <SmallText>Finish by sending the extra amount below.</SmallText>
    </UnderpaymentWrapper>
  );
}

const UnderpaymentWrapper = styled.div`
  background: var(--ck-body-background-tertiary);
  border-radius: 8px;
  padding: 16px;
  margin: 0 4px 16px 4px;
  margin-bottom: 16px;
`;

const UnderpaymentHeader = styled.div`
  font-weight: 500;
  display: flex;
  justify-content: center;
  align-items: flex-end;
  gap: 8px;
  margin-bottom: 8px;
`;

const CopyableInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  gap: 0;
`;

const CountdownWrap = styled.div`
  margin-top: 24px;
  height: 16px;
`;

const FailIcon = styled(AlertIcon)`
  color: var(--ck-body-color-alert);
  width: 32px;
  height: 32px;
  margin-top: auto;
  margin-bottom: 16px;
`;

function useCountdown(expirationS?: number) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initMs = useMemo(() => Date.now(), [expirationS]);
  const [ms, setMs] = useState(initMs);

  useEffect(() => {
    const interval = setInterval(() => setMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (expirationS == null) return [0, 0];

  const remainingS = Math.max(0, (expirationS - ms / 1000) | 0);
  const totalS = Math.max(0, (expirationS - initMs / 1000) | 0);
  return [remainingS, totalS];
}

function CountdownTimer({
  remainingS,
  totalS,
}: {
  remainingS: number;
  totalS: number;
}) {
  const locales = useLocales();
  if (totalS == 0 || remainingS > 3600) {
    return <SmallText>{locales.sendOnlyOnce}</SmallText>;
  }
  const isExpired = remainingS === 0;

  return (
    <ModalBody>
      <CountdownRow>
        <CircleTimer
          total={totalS}
          currentTime={remainingS}
          size={18}
          stroke={3}
        />
        <strong>{isExpired ? "Expired" : formatTime(remainingS)}</strong>
      </CountdownRow>
    </ModalBody>
  );
}

const CountdownRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-variant-numeric: tabular-nums;
`;

const formatTime = (sec: number) => {
  const m = `${Math.floor(sec / 60)}`.padStart(2, "0");
  const s = `${sec % 60}`.padStart(2, "0");
  return `${m}:${s}`;
};

function DepositFailed({ name }: { name: string }) {
  return (
    <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
      <ModalH1>{name} unavailable</ModalH1>
      <ModalBody>
        We&apos;re unable to process {name} payments at this time. Please select
        another payment method.
      </ModalBody>
      <SelectAnotherMethodButton />
    </ModalContent>
  );
}

const CopyRow = styled.button`
  display: block;
  height: 64px;
  border-radius: 8px;
  padding: 8px 16px;

  cursor: pointer;
  background-color: var(--ck-body-background);
  background-color: var(--ck-body-background);

  display: flex;
  align-items: center;
  justify-content: space-between;

  transition: all 100ms ease;

  &:hover {
    opacity: 0.8;
  }

  &:active {
    transform: scale(0.98);
    background-color: var(--ck-body-background-secondary);
  }

  &:disabled {
    cursor: default;
    opacity: 0.5;
    transform: scale(0.98);
    background-color: var(--ck-body-background-secondary);
  }
`;

const LabelRow = styled.div`
  margin-bottom: 4px;
`;

const MainRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ValueContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SmallText = styled.span`
  font-size: 14px;
  color: var(--ck-primary-button-color);
`;

const ValueText = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--ck-primary-button-color);
`;

const LabelText = styled(ModalBody)`
  margin: 0;
  text-align: left;
`;

const pulse = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
`;

const Skeleton = styled.div`
  width: 80px;
  height: 16px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

function CopyRowOrThrobber({
  title,
  value,
  valueText,
  smallText,
  disabled,
}: {
  title: string;
  value?: string;
  valueText?: string;
  smallText?: string;
  disabled?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (disabled) return;
    if (!value) return;
    const str = value.trim();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(str);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  if (!value) {
    return (
      <CopyRow>
        <LabelRow>
          <LabelText>{title}</LabelText>
        </LabelRow>
        <MainRow>
          <Skeleton />
        </MainRow>
      </CopyRow>
    );
  }

  const displayValue = valueText || value;

  return (
    <CopyRow as="button" onClick={handleCopy} disabled={disabled}>
      <div>
        <LabelRow>
          <LabelText>{title}</LabelText>
        </LabelRow>
        <MainRow>
          <ValueContainer>
            <ValueText>{displayValue}</ValueText>
            {smallText && <SmallText>{smallText}</SmallText>}
          </ValueContainer>
        </MainRow>
      </div>
      <CopyIconWrap>
        <CopyToClipboardIcon copied={copied} dark />
      </CopyIconWrap>
    </CopyRow>
  );
}

const CopyIconWrap = styled.div`
  --color: var(--ck-copytoclipboard-stroke);
  --bg: var(--ck-body-background);
`;

// Leave guard that cancels the Untron order if user confirms
export async function beforeLeave(
  trpc: any,
  orderId?: string,
): Promise<boolean> {
  const userConfirmed = window.confirm(
    "Are you sure you want to leave? Your deposit address session will be cancelled.",
  );

  if (userConfirmed && orderId && trpc) {
    // Fire-and-forget: don’t block navigation while we cancel server-side
    console.log(`Cancelling deposit address for order ${orderId}`);
    trpc.cancelDepositAddressForOrder
      .mutate({ orderId })
      .catch((error: unknown) => {
        console.error("Failed to cancel deposit address:", error);
        // Intentionally ignore errors – we already allowed navigation
      });
  }

  return userConfirmed;
}
