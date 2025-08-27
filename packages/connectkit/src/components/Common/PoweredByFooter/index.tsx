import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { keyframes } from "styled-components";
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
      <TextLink href={supportVisible ? supportUrl : undefined}>
        <span>
          {supportVisible ? (
            <>
              Need help? <Underline>Contact support</Underline>
            </>
          ) : (
            <>{locales.poweredBy} Daimo Pay</>
          )}
        </span>
      </TextLink>
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

const TextLink = styled.a`
  appearance: none;
  user-select: none;
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
  font-weight: 400;

  span {
    opacity: 1;
    transition: opacity 300ms ease;
  }
`;

const Underline = styled(motion.span)`
  text-underline-offset: 2px;
  text-decoration: underline;
`;

export default PoweredByFooter;
