import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../constants/routes";
import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import ScanIconWithLogos from "../../../assets/ScanIconWithLogos";
import type { TrpcClient } from "../../../utils/trpc";
import Button from "../../Common/Button";
import CopyToClipboard from "../../Common/CopyToClipboard";
import CustomQRCode from "../../Common/CustomQRCode";
import { OrDivider } from "../../Common/Modal";

const PayWithBinance: React.FC = () => {
  const context = usePayContext();
  const { triggerResize, paymentState, setRoute } = context;
  const trpc = context.trpc as TrpcClient;

  const { daimoPayOrder } = paymentState;

  const [termsChecked, setTermsChecked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use intentAddr for address if order is hydrated
  const address =
    daimoPayOrder?.mode === "hydrated"
      ? daimoPayOrder?.intentAddr
      : "0x4E04D236A5aEd4EB7d95E0514c4c8394c690BB58";

  // Use destFinalCallTokenAmount for amount, add 0.30 for fees
  const amount = daimoPayOrder?.destFinalCallTokenAmount?.usd
    ? (
        parseFloat(daimoPayOrder.destFinalCallTokenAmount.usd.toString()) + 0.3
      ).toFixed(2)
    : "10.30"; // Default amount (10.00 + 0.30)

  useEffect(() => {
    const checkForSourcePayment = async () => {
      if (!daimoPayOrder) return;

      const found = await trpc.findSourcePayment.query({
        orderId: daimoPayOrder.id.toString(),
      });

      if (found) {
        setRoute(ROUTES.CONFIRMATION);
      }
    };

    // Check every 10 seconds for payment
    const interval = setInterval(checkForSourcePayment, 10000);
    return () => clearInterval(interval);
  }, [daimoPayOrder?.id]);

  useEffect(() => {
    // Simulate initial loading
    const timer = setTimeout(() => {
      setIsLoading(false);
      triggerResize();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const binanceLogo = (
    <div style={{ borderRadius: "22.5%", overflow: "hidden" }}>
      <img
        src="https://pay.daimo.com/wallet-logos/binance-logo.svg"
        alt="Binance"
      />
    </div>
  );

  if (isLoading) {
    return (
      <PageContent>
        <ModalContent>
          <CustomQRCode image={binanceLogo} />
        </ModalContent>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <ModalContent>
        <CustomQRCode
          value={address}
          image={binanceLogo}
          tooltipMessage={
            <>
              <ScanIconWithLogos logo={binanceLogo} />
              <span>Scan this code with your Binance app</span>
            </>
          }
        />

        <OrDivider />

        <ModalBody>
          <div style={{ textAlign: "left", marginBottom: 16 }}>
            <p
              style={{
                marginBottom: 8,
                fontSize: "15px",
                lineHeight: "21px",
              }}
            >
              1. Select USDC
              <br />
              2. Scan the QR code or copy the addres
              <br />
              3. Choose Arbitrum as the network
              <br />
              4. Copy the amount and send
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                cursor: "pointer",
                marginTop: 16,
                userSelect: "none",
              }}
              onClick={() => setTermsChecked(!termsChecked)}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "5px",
                  border: `2px solid var(--ck-body-color)`,
                  marginRight: 8,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {termsChecked && (
                  <div
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "2px",
                      background: "var(--ck-body-color)",
                    }}
                  />
                )}
              </div>
              <label
                style={{
                  cursor: "pointer",
                  fontSize: "14px",
                  color: "var(--ck-body-color-muted)",
                  userSelect: "none",
                }}
              >
                I acknowledge that I have read these instructions
              </label>
            </div>
          </div>
        </ModalBody>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            opacity: termsChecked ? 1 : 0.4,
          }}
        >
          {termsChecked ? (
            <>
              <CopyToClipboard variant="button" string={address}>
                Copy Address
              </CopyToClipboard>

              <CopyToClipboard variant="button" string={amount}>
                Copy Amount
              </CopyToClipboard>
            </>
          ) : (
            <>
              <Button disabled>Copy Address</Button>
              <Button disabled>Copy Amount</Button>
            </>
          )}
        </div>
      </ModalContent>
    </PageContent>
  );
};

export default PayWithBinance;
