import React, { useEffect, useState } from "react";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import {
  DepositAddressPaymentOptionData,
  getAddressContraction,
} from "@daimo/pay-common";
import ScanIconWithLogos from "../../../assets/ScanIconWithLogos";
import CircleTimer from "../../Common/CircleTimer";
import CopyToClipboard from "../../Common/CopyToClipboard";
import CustomQRCode from "../../Common/CustomQRCode";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";
import SquareTimer from "../../Common/SquareTimer";

const WaitingDepositAddress: React.FC = () => {
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
  }, [selectedDepositAddressOption]);

  useEffect(() => {
    triggerResize();
  }, [details]);

  const TOTAL_TIME = 600;
  const [timeLeft, setTimeLeft] = useState(TOTAL_TIME);

  const formatTime = (sec: number) => {
    const m = `${Math.floor(sec / 60)}`.padStart(2, "0");
    const s = `${sec % 60}`.padStart(2, "0");
    return `${m}:${s}`;
  };

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
      ) : (
        <ModalContent>
          {details && (
            <>
              <ModalH1 style={{ textAlign: "center" }}>
                ${details.amount}
              </ModalH1>
              <ModalBody style={{ textAlign: "center", marginBottom: 12 }}>
                Send {details.amount} {details.suffix}
              </ModalBody>
            </>
          )}

          <div style={{ alignSelf: "center" }}>
            <SquareTimer
              total={TOTAL_TIME}
              onTimeChange={setTimeLeft}
              size={220}
              stroke={6}
              borderRadius={54}
            >
              <CustomQRCode
                value={details?.uri}
                size={180}
                contentPadding={24}
                image={
                  <img
                    src={selectedDepositAddressOption?.logoURI}
                    width="100%"
                    height="100%"
                  />
                }
                tooltipMessage={
                  <>
                    <ScanIconWithLogos
                      logo={<img src={selectedDepositAddressOption?.logoURI} />}
                    />
                    <span>
                      Use a {selectedDepositAddressOption?.id} wallet to scan
                    </span>
                  </>
                }
              />
            </SquareTimer>
          </div>

          {details && (
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
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginTop: 16,
                  gap: 8,
                }}
              >
                <ModalBody style={{ margin: 0, textAlign: "left" }}>
                  Time remaining:
                </ModalBody>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "#222",
                      margin: 0,
                      padding: 0,
                    }}
                  >
                    {formatTime(timeLeft)}
                  </span>
                  <CircleTimer
                    total={TOTAL_TIME}
                    currentTime={timeLeft}
                    size={18}
                    stroke={3}
                  />
                </div>
              </div>
            </>
          )}
        </ModalContent>
      )}
    </PageContent>
  );
};

export default WaitingDepositAddress;
