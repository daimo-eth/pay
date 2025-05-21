import React, { useEffect, useState } from "react";
import { ROUTES } from "../../../constants/routes";
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
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import CopyToClipboard from "../../Common/CopyToClipboard";
import CustomQRCode from "../../Common/CustomQRCode";
import { OrDivider } from "../../Common/Modal";
import SelectAnotherMethodButton from "../../Common/SelectAnotherMethodButton";

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
          <CustomQRCode
            value={details?.uri}
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
          {details && (
            <>
              <OrDivider />
              <ModalBody>
                Send exactly {details.amount} {details.suffix} to{" "}
                {getAddressContraction(details.address)} and return to this
                page. Confirmation should appear in a few minutes.
              </ModalBody>
              <CopyToClipboard variant="button" string={details.address}>
                Copy Address
              </CopyToClipboard>
              <CopyToClipboard variant="left" string={details.amount}>
                Copy Amount
              </CopyToClipboard>
            </>
          )}
        </ModalContent>
      )}
    </PageContent>
  );
};

export default WaitingDepositAddress;
