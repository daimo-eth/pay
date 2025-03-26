import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { keyframes } from "styled-components";
import CrepeIcon from "../../../assets/crepe";
import styled from "../../../styles/styled";
import { daimoPayVersion } from "../../../utils/exports";

const PoweredByFooter = ({ supportUrl }: { supportUrl?: string } = {}) => {
  const [supportVisible, setSupportVisible] = useState(false);

  useEffect(() => {
    if (supportUrl == null) return;
    // Show the support link after delay
    const timer = setTimeout(() => {
      setSupportVisible(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Container>
      <TextButton
        onClick={() => {
          window.open(
            supportVisible
              ? supportUrl
              : `https://pay.daimo.com?ref=sdk-v${daimoPayVersion}`,
            "_blank",
          );
        }}
        className={supportVisible ? "support" : ""}
      >
        {!supportVisible && <CrepeIcon />}
        <span>
          {supportVisible ? (
            <>
              Need help? <Underline>Contact support</Underline>
            </>
          ) : (
            <>Powered by Daimo Pay</>
          )}
        </span>
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
  gap: 10px;
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
