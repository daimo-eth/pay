import {
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  getAddressContraction,
} from "@daimo/pay-common";
import { useEffect, useState } from "react";
import { keyframes } from "styled-components";
import ScanIconWithLogos from "../../../assets/ScanIconWithLogos";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
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

  useEffect(() => {
    if (!selectedDepositAddressOption) return;
    payWithDepositAddress(selectedDepositAddressOption.id).then((details) => {
      if (!details) setFailed(true);
      else setDetails(details);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDepositAddressOption]);

  useEffect(() => {
    triggerResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [details]);

  return (
    <PageContent>
      {selectedDepositAddressOption == null ? null : failed ? (
        <DepositFailed meta={selectedDepositAddressOption} />
      ) : (
        <DepositAddressInfo
          meta={selectedDepositAddressOption}
          details={details}
        />
      )}
    </PageContent>
  );
}

function DepositAddressInfo({
  meta,
  details,
}: {
  meta: DepositAddressPaymentOptionMetadata;
  details?: DepositAddressPaymentOptionData;
}) {
  return (
    <ModalContent>
      <div style={{ alignSelf: "center" }}>
        <CustomQRCode
          value={details?.uri}
          size={180}
          contentPadding={24}
          image={<img src={meta.logoURI} width="100%" height="100%" />}
          tooltipMessage={
            <>
              <ScanIconWithLogos logo={<img src={meta.logoURI} />} />
              <span>Use a {meta.id} wallet to scan</span>
            </>
          }
        />
      </div>
      <CopyableInfo meta={meta} details={details} />
    </ModalContent>
  );
}

function CopyableInfo({
  meta,
  details,
}: {
  meta: DepositAddressPaymentOptionMetadata;
  details?: DepositAddressPaymentOptionData;
}) {
  // TODO: add this to DepositAddressPaymentOptionData
  const currencies = meta.id;

  return (
    <CopyableInfoWrapper>
      <CopyRowOrThrobber
        title="Send Exactly"
        value={details?.amount}
        smallText={currencies}
      />
      <CopyRowOrThrobber
        title="Receiving Address"
        value={details?.address}
        valueText={details && getAddressContraction(details.address)}
      />
      <CountdownTimerIfNeeded expirationS={details?.expirationS} />
    </CopyableInfoWrapper>
  );
}

const CopyableInfoWrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: stretch;
  gap: 16px;
  margin-top: 16px;
`;

function CountdownTimerIfNeeded({ expirationS }: { expirationS?: number }) {
  return (
    <TimerContainer>
      <CountdownTimerInner expirationS={expirationS} />
    </TimerContainer>
  );
}

function CountdownTimerInner({ expirationS }: { expirationS?: number }) {
  const [ms, setMs] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (expirationS == null) return null;

  const remainingS = Math.max(0, (expirationS - ms / 1000) | 0);
  if (remainingS > 3600) return null;

  return (
    <ModalBody>
      <strong>{formatTime(remainingS)}</strong>
    </ModalBody>
  );
}

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

  &:disabled {
    cursor: default;
  }

  &:hover {
    opacity: 0.8;
  }

  &:active {
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
  font-size: 12px;
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

const TimerContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

function CopyRowOrThrobber({
  title,
  value,
  valueText,
  smallText,
}: {
  title: string;
  value?: string;
  valueText?: string;
  smallText?: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
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
    <CopyRow as="button" onClick={handleCopy}>
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
