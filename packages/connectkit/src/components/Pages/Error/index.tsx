import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import { AlertIcon } from "../../../assets/icons";
import { useRozoPay } from "../../../hooks/useDaimoPay";
import styled from "../../../styles/styled";
import PoweredByFooter from "../../Common/PoweredByFooter";
import { useMemo } from "react";

export default function ErrorPage() {
  const pay = useRozoPay();

  const errorBody = useMemo(() => {
    if (pay.paymentState === "error") {
      return pay.paymentErrorMessage;
    }
    return "Unknown error";
  }, [pay.paymentState, pay.paymentErrorMessage]);

  return (
    <PageContent>
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
          <ErrorBody>
            <strong>{errorBody}</strong>
          </ErrorBody>
        </CenterContainer>
        <PoweredByFooter preFilledMessage={`Error: ${errorBody}`} showSupport />
      </ModalContent>
    </PageContent>
  );
}

const CenterContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  max-width: 100%;
`;

const ErrorBody = styled(ModalBody)`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const FailIcon = styled(AlertIcon)`
  color: var(--ck-body-color-alert);
  width: 32px;
  height: 32px;
  margin-top: auto;
  margin-bottom: 16px;
`;
