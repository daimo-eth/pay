import { motion } from "framer-motion";
import { keyframes } from "styled-components";
import styled from "../../../styles/styled";
import { rozoPayVersion } from "../../../utils/exports";
import IntercomInitializer from "../Intercom";
import { usePayContext } from "../../../hooks/usePayContext";

const PoweredByFooter = ({ preFilledMessage, showSupport = true }: { preFilledMessage?: string, showSupport?: boolean } = {}) => {
  const context = usePayContext();

  const handleContactClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (typeof window.Intercom === 'function') {
      context.setOpen(false);
      window.Intercom('showNewMessage', preFilledMessage || 'Hi, I need help with my payment. \n\nVersion: ' + rozoPayVersion);
    } else {
      window.open(globalThis.__SUPPORTURL__ || `https://pay.rozo.ai?ref=sdk-v${rozoPayVersion}`);
    }
  };

  return (
    <>
      <IntercomInitializer />
      <Container>
        <TextButton
          onClick={() => {
            window.open(
              'https://github.com/RozoAI/intent-pay',
              "_blank"
            );
          }}
        >
          <span>Powered by {globalThis.__POWEREDBY__ || "Rozo Pay"}</span>
        </TextButton>
        {showSupport && (
          <TextButton onClick={handleContactClick}>
            Get help
          </TextButton>
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
  gap: 10px;
  height: 32px;
  padding: 0 8px;
  border-radius: 6px;
  background: none;
  color: var(--ck-body-color-muted);
  text-decoration-color: var(--ck-body-color-muted);
  font-size: 14px;
  line-height: 16px;
  font-weight: 500;

  transition:
    color 200ms ease,
    transform 100ms ease;
  &:hover {
    color: var(--ck-body-color-muted-hover);
    text-decoration-color: var(--ck-body-color-muted-hover);
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
