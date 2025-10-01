import { motion } from "framer-motion";
import { keyframes } from "styled-components";
import RozoTextLogo from "../../../assets/rozo-text";
import { useRozoPay } from "../../../hooks/useDaimoPay";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
import { rozoPayVersion } from "../../../utils/exports";
import IntercomInitializer from "../Intercom";

const PoweredByFooter = ({
  preFilledMessage,
  showSupport = true,
}: { preFilledMessage?: string; showSupport?: boolean } = {}) => {
  const context = usePayContext();
  const pay = useRozoPay();

  const handleContactClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (
      typeof window !== "undefined" &&
      typeof window.Intercom === "function"
    ) {
      context.setOpen(false);
      window.Intercom(
        "showNewMessage",
        [
          "Hi, I need help with my payment.",
          "",
          `Version: ${rozoPayVersion}`,
          `Order ID: ${pay.order?.id?.toString()}`,
          preFilledMessage,
        ]
          .filter(Boolean)
          .join("\n")
      );
    } else {
      window.open(
        globalThis.__SUPPORTURL__ ||
          `https://pay.rozo.ai?ref=sdk-v${rozoPayVersion}`
      );
    }
  };

  return (
    <>
      <IntercomInitializer />
      <Container>
        <TextButton
          onClick={() => {
            window.open("http://rozo.ai/", "_blank");
          }}
        >
          <span>Powered by</span>
          <RozoTextLogo height={16} style={{ position: "relative", top: 2 }} />
        </TextButton>
        {showSupport && (
          <TextButton onClick={handleContactClick}>Get help</TextButton>
        )}
      </Container>
    </>
  );
};

const Container = styled(motion.div)`
  text-align: center;
  margin-top: 16px;
  margin-bottom: -4px;
  display: flex;
  flex-direction: row;
  gap: 16px;
  justify-content: space-between;
`;

const fadeIn = keyframes`
0%{ opacity:0; }
100%{ opacity:1; }
`;

const TextButton = styled(motion.button)`
  appearance: none;
  user-select: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  background: none;
  color: var(--ck-body-color-muted);
  text-decoration-color: var(--ck-body-color-muted);
  font-size: 14px;
  line-height: 16px;
  font-weight: 500;

  svg {
    fill: var(--ck-body-color-muted);
  }

  transition: color 200ms ease, transform 100ms ease;

  &:hover {
    color: var(--ck-body-color-muted-hover);
    text-decoration-color: var(--ck-body-color-muted-hover);
    svg {
      fill: var(--ck-body-color-muted-hover);
    }
  }
  &:active {
    transform: scale(0.96);
  }

  span {
    opacity: 1;
    transition: opacity 300ms ease;
  }

  &.support span {
    animation: ${fadeIn} 300ms ease both;
  }
`;

const Underline = styled(motion.span)`
  text-underline-offset: 2px;
  text-decoration: underline;
`;

export default PoweredByFooter;
