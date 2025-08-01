import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import { AlertIcon } from "../../../assets/icons";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import styled from "../../../styles/styled";
import { getSupportUrl } from "../../../utils/supportUrl";
import PoweredByFooter from "../../Common/PoweredByFooter";

export default function ErrorPage() {
  const pay = useDaimoPay();
  const supportUrl = getSupportUrl(pay.order?.id?.toString() ?? "", "Error");

  let errorBody = "Unknown error";
  if (pay.paymentState === "error") {
    errorBody = pay.paymentErrorMessage;
  }

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
        <PoweredByFooter supportUrl={supportUrl} showNeedHelpImmediately />
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
