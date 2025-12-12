import { motion } from "framer-motion";
import useLocales from "../../../hooks/useLocales";
import styled from "../../../styles/styled";

const PoweredByFooter = ({
  receiptUrl,
}: {
  receiptUrl?: string;
} = {}) => {
  const locales = useLocales();
  return (
    <Container>
      {receiptUrl ? (
        <TextLink href={receiptUrl} target="_blank" rel="noreferrer">
          <Underline>Show receipt</Underline>
        </TextLink>
      ) : (
        <TextLink>{locales.poweredBy} Daimo Pay</TextLink>
      )}
      <div className="h-4" />
    </Container>
  );
};

const Container = styled(motion.div)`
  text-align: center;
  margin-top: 16px;
  margin-bottom: -4px;
`;

const TextLink = styled.a`
  appearance: none;
  user-select: none;
  color: var(--ck-body-color-muted);
  text-decoration-color: var(--ck-body-color-muted);
  text-decoration: none;
  font-size: 15px;
  line-height: 18px;
  font-weight: 400;
`;

const Underline = styled(motion.span)`
  text-underline-offset: 2px;
  text-decoration: underline;
`;

export default PoweredByFooter;
