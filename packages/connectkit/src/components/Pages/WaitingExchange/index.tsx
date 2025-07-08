import { usePayContext } from "../../../hooks/usePayContext";

import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import { ExternalLinkIcon } from "../../../assets/icons";
import Button from "../../Common/Button";
import ExternalPaymentSpinner from "../../Spinners/ExternalPaymentSpinner";

export default function WaitingExchange() {
  const context = usePayContext();
  const { paymentState } = context;
  const { selectedExternalOption } = paymentState;

  // TODO: get external URL
  const externalURL = "https://www.google.com";

  if (!selectedExternalOption) {
    return <PageContent></PageContent>;
  }

  return (
    <PageContent>
      <ExternalPaymentSpinner
        logoURI={selectedExternalOption.logoURI}
        logoShape={selectedExternalOption.logoShape}
      />
      <ModalContent style={{ marginLeft: 24, marginRight: 24 }}>
        <ModalH1>Waiting For Payment</ModalH1>
        <UniversalAddressMessage />
      </ModalContent>
      <Button icon={<ExternalLinkIcon />} href={externalURL}>
        {selectedExternalOption.cta}
      </Button>
    </PageContent>
  );
}

function UniversalAddressMessage() {
  return (
    <ModalBody style={{ marginTop: 12, marginBottom: 12 }}>
      <ModalH1>Universal Address</ModalH1>
    </ModalBody>
  );
}
