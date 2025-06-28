import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

import { motion } from "framer-motion";
import { AlertIcon } from "../../../assets/icons";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import styled from "../../../styles/styled";
import { getSupportUrl } from "../../../utils/supportUrl";
import PoweredByFooter from "../../Common/PoweredByFooter";

export default function ErrorPage() {
  const pay = useDaimoPay();
  const supportUrl = getSupportUrl(pay.order?.id?.toString() ?? "", "Error");

  let errorTitle = "Error";
  let errorBody = "Lorem ipsum 123.";
  if (pay.paymentState === "error") {
    //TODO
  }

  return (
    <PageContent
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <ModalContent
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 0,
        }}
      >
        <AnimationContainer>
          <InsetContainer>
            <FailIcon />
          </InsetContainer>
        </AnimationContainer>
        <ModalH1>{errorTitle}</ModalH1>
        <ModalBody>{errorBody}</ModalBody>
        <PoweredByFooter supportUrl={supportUrl} showNeedHelpImmediately />
      </ModalContent>
    </PageContent>
  );
}

const AnimationContainer = styled(motion.div)`
  position: relative;
  width: 100px;
  height: 100px;
  transition: transform 0.5s ease-in-out;
  margin-bottom: 16px;
`;

const InsetContainer = styled(motion.div)`
  position: absolute;
  overflow: hidden;
  inset: 6px;
  border-radius: 50px;
  background: var(--ck-body-background);
  display: flex;
  align-items: center;
  justify-content: center;
  svg {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`;

const FailIcon = styled(AlertIcon)`
  color: var(--ck-body-color-alert);
  position: absolute;
`;
