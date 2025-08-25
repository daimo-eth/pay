import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { keyframes } from "styled-components";
import GearIcon from "../../../assets/gear";
import useLocales from "../../../hooks/useLocales";
import styled from "../../../styles/styled";

const PoweredByFooter = ({
  supportUrl,
  showNeedHelpImmediately,
}: { supportUrl?: string; showNeedHelpImmediately?: boolean } = {}) => {
  const [supportVisible, setSupportVisible] = useState(showNeedHelpImmediately);
  const locales = useLocales();
  useEffect(() => {
    if (supportUrl == null) return;
    // Show the support link after delay
    const timer = setTimeout(() => {
      setSupportVisible(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, [supportUrl]);

  return (
    <Container>
      <TextButton className={supportVisible ? "support" : ""}>
        <span>
          {supportVisible ? (
            <>
              Need help? <Underline>Contact support</Underline>
            </>
          ) : (
            <>{locales.poweredBy} Daimo</>
          )}
        </span>
        {!supportVisible && <GearIcon />}
      </TextButton>
    </Container>
  );
};

const Container = styled(motion.div)`
  text-align: center;
  margin-top: 16px;
  margin-bottom: -4px;
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
  gap: 4px;
  height: 42px;
  padding: 0 16px;
  border-radius: 6px;
  background: none;
  color: var(--ck-body-color-muted);
  text-decoration-color: var(--ck-body-color-muted);
  font-size: 15px;
  line-height: 18px;
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
