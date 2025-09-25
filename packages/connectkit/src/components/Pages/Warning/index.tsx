import {
  ModalBody,
  ModalContent,
  PageContent,
} from "../../Common/Modal/styles";

import styled from "../../../styles/styled";
import Button from "../../Common/Button";

type WarningProps = {
  body: React.ReactNode;
  primaryLabel: string;
  secondaryLabel: string;
  onPrimary: () => void;
  onSecondary: () => void;
};

export default function WarningPage({
  body,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: WarningProps) {
  return (
    <PageContent style={{ paddingTop: 8 }}>
      <ModalContent
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 0,
          paddingTop: 0,
          position: "relative",
        }}
      >
        <CenterContainer>
          <WarningBody style={{ textAlign: "center" }}>{body}</WarningBody>
          <div style={{ height: 8 }} />
          <Button onClick={onPrimary}>{primaryLabel}</Button>
          <div style={{ height: 8 }} />
          <Button
            style={{ background: "var(--ck-body-color-danger)", color: "#fff" }}
            variant="secondary"
            onClick={onSecondary}
          >
            {secondaryLabel}
          </Button>
        </CenterContainer>
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

const WarningBody = styled(ModalBody)`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
`;
