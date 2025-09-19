import { useState } from "react";
import { WarningIcon } from "../../../assets/icons";
import { useDaimoPay } from "../../../hooks/useDaimoPay";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
import Button from "../../Common/Button";
import {
  ModalBody,
  ModalContent,
  ModalH1,
  PageContent,
} from "../../Common/Modal/styles";

const CenterContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  max-width: 100%;
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 24px;
  width: 100%;
  max-width: 320px;
`;

const StayButton = styled(Button)`
  flex: 1;
`;

const LeaveButton = styled(Button)`
  flex: 1;
  background: transparent;
  color: var(--ck-body-color-muted);
  border: 1px solid var(--ck-body-divider);

  &:hover {
    background: var(--ck-body-background-secondary);
  }
`;

const StyledWarningIcon = styled(WarningIcon)`
  width: 32px;
  height: 32px;
  margin-bottom: 16px;
  color: var(--ck-body-color-warning, #ff9500);
`;

export default function LeaveConfirm() {
  const context = usePayContext();
  const { order } = useDaimoPay();
  const [isLeaving, setIsLeaving] = useState(false);

  // Get the previous route and pending action from context
  // These should be set before navigating to LEAVE_CONFIRM
  const previousRoute = context.previousRoute;
  const pendingAction = context.pendingLeaveAction;

  const handleStay = () => {
    // Clear the pending action and go back to previous route
    context.setPendingLeaveAction(undefined);
    if (previousRoute) {
      context.setRoute(previousRoute, { event: "leave-cancelled" });
    }
  };

  const handleLeave = async () => {
    setIsLeaving(true);

    // Cancel the deposit address session if we have an order
    if (order?.id && context.trpc) {
      try {
        console.log(`Cancelling deposit address for order ${order.id}`);
        await context.trpc.cancelDepositAddressForOrder
          .mutate({ orderId: order.id.toString() })
          .catch((error: unknown) => {
            console.error("Failed to cancel deposit address:", error);
            // Continue with navigation even if cancellation fails
          });
      } catch (error) {
        console.error("Error in cancel operation:", error);
      }
    }

    // Execute the pending action (navigation)
    if (pendingAction) {
      pendingAction();
    }

    // Clear the pending action
    context.setPendingLeaveAction(undefined);
  };

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
          <StyledWarningIcon />
          <ModalH1 style={{ textAlign: "center" }}>
            Leave Current Session?
          </ModalH1>
          <div style={{ height: 16 }} />
          <ModalBody style={{ textAlign: "center" }}>
            Your deposit address session will be cancelled. Any pending payments
            will need to be restarted.
          </ModalBody>
          <ButtonRow>
            <StayButton onClick={handleStay} disabled={isLeaving}>
              Stay
            </StayButton>
            <LeaveButton onClick={handleLeave} disabled={isLeaving}>
              {isLeaving ? "Leaving..." : "Leave"}
            </LeaveButton>
          </ButtonRow>
        </CenterContainer>
      </ModalContent>
    </PageContent>
  );
}
