import { Token } from "@daimo/pay-common";
import { motion } from "framer-motion";
import { chainToLogo } from "../../../assets/chains";
import styled from "../../../styles/styled";

const TokenChainLogo = ({ token }: { token: Token }) => {
  return (
    <TokenChainContainer>
      <img
        src={token.logoURI}
        alt={token.symbol}
        style={{ borderRadius: 9999 }}
      />
      <ChainContainer>{chainToLogo[token.chainId]}</ChainContainer>
    </TokenChainContainer>
  );
};

const TokenChainContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
`;
const ChainContainer = styled(motion.div)`
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  overflow: hidden;
  bottom: 0px;
  right: 0px;
`;

export default TokenChainLogo;
