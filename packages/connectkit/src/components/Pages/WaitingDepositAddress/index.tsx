import {
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  getAddressContraction,
} from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { keyframes } from "styled-components";
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

export default function WaitingDepositAddress() {
  const context = usePayContext();
  const { triggerResize, paymentState } = context;

  const { payWithDepositAddress, selectedDepositAddressOption } = paymentState;

  const [details, setDetails] = useState<DepositAddressPaymentOptionData>();
  const [failed, setFailed] = useState(false);

  const generateDepositAddress = () => {
    if (!selectedDepositAddressOption) return;
    payWithDepositAddress(selectedDepositAddressOption.id).then((details) => {
      if (!details) setFailed(true);
      else setDetails(details);
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(generateDepositAddress, [selectedDepositAddressOption]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(triggerResize, [details]);

  return (
    <PageContent>
      {selectedDepositAddressOption == null ? null : failed ? (
        <DepositFailed meta={selectedDepositAddressOption} />
      ) : (
        <DepositAddressInfo
          meta={selectedDepositAddressOption}
          details={details}
          refresh={generateDepositAddress}
        />
      )}
    </PageContent>
  );
}

function DepositAddressInfo({
  meta,
  details,
  refresh,
}: {
  meta: DepositAddressPaymentOptionMetadata;
  details?: DepositAddressPaymentOptionData;
  refresh: () => void;
}) {
  const { isMobile } = useIsMobile();

  const [remainingS, totalS] = useCountdown(details?.expirationS);
  const isExpired = details?.expirationS != null && remainingS === 0;

  return (
    <ModalContent>
      {isMobile ? (
        <LogoWrap>
          {!isExpired && <img src={meta.logoURI} width="64px" height="64px" />}
          {isExpired && (
            <Button onClick={refresh} style={{ width: 128 }}>
              Refresh
            </Button>
          )}
        </LogoWrap>
      ) : (
        <QRWrap>
          <CustomQRCode
            value={details?.uri}
            contentPadding={24}
            image={<img src={meta.logoURI} width="100%" height="100%" />}
          />
        </QRWrap>
      )}
      <CopyableInfo
        meta={meta}
        details={details}
        remainingS={remainingS}
        totalS={totalS}
      />
    </ModalContent>
  );
}

const LogoWrap = styled.div`
  padding: 32px 0;
  height: 128px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const QRWrap = styled.div`
  margin: 0 auto;
  width: 280px;
`;

function CopyableInfo({
  meta,
  details,
  remainingS,
  totalS,
}: {
  meta: DepositAddressPaymentOptionMetadata;
  details?: DepositAddressPaymentOptionData;
  remainingS: number;
  totalS: number;
}) {
  const currencies = meta.id;

  const isExpired = details?.expirationS != null && remainingS === 0;

  return (
    <CopyableInfoWrapper>
      <CopyRowOrThrobber
        title="Send Exactly"
        value={details?.amount}
        smallText={currencies}
        disabled={isExpired}
      />
      <CopyRowOrThrobber
        title="Receiving Address"
        value={details?.address}
        valueText={details && getAddressContraction(details.address)}
        disabled={isExpired}
      />
      <CountdownWrap>
        <CountdownTimer remainingS={remainingS} totalS={totalS} />
      </CountdownWrap>
    </CopyableInfoWrapper>
  );
}

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
  if (totalS == 0) return null;
  if (remainingS > 3600) return null;
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

function DepositFailed({
  meta,
}: {
  meta: DepositAddressPaymentOptionMetadata;
}) {
  return (
    <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
      <ModalH1>{meta.id} unavailable</ModalH1>
      <ModalBody>
        We&apos;re unable to process {meta.id} payments at this time. Please
        select another payment method.
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
  color: var(--ck-body-color-muted);
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
          <ModalBody style={{ margin: 0, textAlign: "left" }}>
            {title}
          </ModalBody>
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
          <ModalBody style={{ margin: 0, textAlign: "left" }}>
            {title}
          </ModalBody>
        </LabelRow>
        <MainRow>
          <ValueContainer>
            <span style={{ fontWeight: 600 }}>{displayValue}</span>
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
