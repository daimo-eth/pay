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
import { useEffect, useState } from "react";
import { keyframes } from "styled-components";
import { WarningIcon } from "../../../assets/icons";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import useIsMobile from "../../../hooks/useIsMobile";
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
  const { triggerResize, paymentState } = context;
  const { payWithDepositAddress, selectedDepositAddressOption } = paymentState;
  const { order } = useDaimoPay();

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
      payWithDepositAddress(selectedDepositAddressOption.id).then((details) => {
        if (details) {
          setDepAddr({
            address: details.address,
            amount: details.amount,
            coins: details.suffix,
            expirationS: details.expirationS,
            uri: details.uri,
            displayToken: getDisplayToken(selectedDepositAddressOption),
            logoURI: selectedDepositAddressOption.logoURI,
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
      {failed ? (
        selectedDepositAddressOption && (
          <DepositFailed name={selectedDepositAddressOption.id} />
        )
      ) : (
        <DepositAddressInfo
          depAddr={depAddr}
          refresh={generateDepositAddress}
          triggerResize={triggerResize}
        />
      )}
    </PageContent>
  );
}

function DepositAddressInfo({
  depAddr,
  refresh,
  triggerResize,
}: {
  depAddr?: DepositAddr;
  refresh: () => void;
  triggerResize: () => void;
}) {
  const { isMobile } = useIsMobile();

  const [remainingS, totalS] = useCountdown(depAddr?.expirationS);
  const isExpired = depAddr?.expirationS != null && remainingS === 0;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(triggerResize, [isExpired]);

  const logoOffset = isMobile ? 4 : 0;
  const logoElement = depAddr?.displayToken ? (
    <TokenChainLogo
      token={depAddr.displayToken}
      size={64}
      offset={logoOffset}
    />
  ) : (
    <img src={depAddr?.logoURI} width="64px" height="64px" />
  );

  return (
    <ModalContent>
      {isExpired ? (
        <LogoRow>
          <Button onClick={refresh} style={{ width: 128 }}>
            Refresh
          </Button>
        </LogoRow>
      ) : isMobile ? (
        <LogoRow>
          <LogoWrap>{logoElement}</LogoWrap>
        </LogoRow>
      ) : (
        <QRWrap>
          <CustomQRCode
            value={depAddr?.uri}
            contentPadding={24}
            size={200}
            image={logoElement}
          />
        </QRWrap>
      )}
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

  return (
    <CopyableInfoWrapper>
      {underpayment && <UnderpaymentInfo underpayment={underpayment} />}
      <CopyRowOrThrobber
        title="Send Exactly"
        value={depAddr?.amount}
        smallText={depAddr?.coins}
        disabled={isExpired}
      />
      <CopyRowOrThrobber
        title="Receiving Address"
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
  margin-top: 8px;
`;

const CountdownWrap = styled.div`
  margin-top: 24px;
  height: 16px;
`;

function useCountdown(expirationS?: number) {
  const [initMs] = useState(Date.now());
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
  if (totalS == 0 || remainingS > 3600) {
    return <SmallText>Send only once</SmallText>;
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
          <LabelText>{title}</LabelText>
        </LabelRow>
        <MainRow>
          <ValueContainer>
            <ValueText>{displayValue}</ValueText>
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
