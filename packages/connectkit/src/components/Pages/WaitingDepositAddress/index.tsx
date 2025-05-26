import {
  DepositAddressPaymentOptionData,
  DepositAddressPaymentOptionMetadata,
  getAddressContraction,
} from "@daimo/pay-common";
import { useEffect, useState } from "react";
import ScanIconWithLogos from "../../../assets/ScanIconWithLogos";
import { usePayContext } from "../../../hooks/usePayContext";
import CopyToClipboard from "../../Common/CopyToClipboard";
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

  return (
    <PageContent>
      {failed ? (
        <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
          <ModalH1>{selectedDepositAddressOption?.id} unavailable</ModalH1>
          <ModalBody>
            We&apos;re unable to process {selectedDepositAddressOption?.id}{" "}
            payments at this time. Please select another payment method.
          </ModalBody>
          <SelectAnotherMethodButton />
        </ModalContent>
      ) : selectedDepositAddressOption != null ? (
        <DepositAddressInfo
          meta={selectedDepositAddressOption}
          details={details}
        />
      ) : null}
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

      {details && <CopyableInfo details={details} />}
    </ModalContent>
  );
}

function CopyableInfo({
  details,
}: {
  details: DepositAddressPaymentOptionData;
}) {
  return (
    <>
      {/* Receiving address label/value row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 24,
        }}
      >
        <ModalBody style={{ margin: 0, textAlign: "left" }}>
          Receiving address
        </ModalBody>
      </div>

      <div
        style={{
          border: "1px solid var(--ck-border-color, #e7e8ec)",
          borderRadius: 12,
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <ModalBody
          style={{
            flex: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            margin: 0,
            textAlign: "left",
          }}
        >
          {getAddressContraction(details.address, 10)}
        </ModalBody>
        <CopyToClipboard string={details.address} />
      </div>

      {/* USDT amount label/value row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 16,
        }}
      >
        <ModalBody style={{ margin: 0, textAlign: "left" }}>
          USDT amount
        </ModalBody>
        <div
          style={{
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ fontWeight: 600, marginRight: 8 }}>
            {details.amount}
          </span>
          <CopyToClipboard string={details.amount} />
        </div>
      </div>

      {/* Time remaining label/timer row */}
      <CountdownTimerIfNeeded expirationS={details.expirationS} />
    </>
  );
}

function CountdownTimerIfNeeded({ expirationS }: { expirationS: number }) {
  const [ms, setMs] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setMs(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remainingS = Math.max(0, (expirationS - ms / 1000) | 0);

  if (remainingS > 3600) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontWeight: 600, marginRight: 8 }}>
        {formatTime(remainingS)}
      </span>
    </div>
  );
}

const formatTime = (sec: number) => {
  const m = `${Math.floor(sec / 60)}`.padStart(2, "0");
  const s = `${sec % 60}`.padStart(2, "0");
  return `${m}:${s}`;
};
