import { Token } from "@daimo/pay-common";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { chainToLogo } from "../../../assets/chains";
import styled from "../../../styles/styled";

const TokenChainLogo = ({
  token,
  size = 32,
}: {
  token: Token;
  size?: number;
}) => {
  const s1 = size; // coin logo size
  const s2 = Math.round((size * 30) / 64); // chain logo size
  const styleCoin = useMemo(() => ({ width: s1, height: s1 }), [s1]);
  const styleCoinImg = useMemo(() => ({ borderRadius: 999 }), []);
  const styleChain = useMemo(() => ({ width: s2, height: s2 }), [s2]);
  return (
    <TokenChainContainer style={styleCoin}>
      <img src={token.logoURI} alt={token.symbol} style={styleCoinImg} />
      <ChainContainer style={styleChain}>
        {chainToLogo[token.chainId]}
      </ChainContainer>
    </TokenChainContainer>
  );
};

const TokenChainContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
`;

const ChainContainer = styled(motion.div)`
  position: absolute;
  border-radius: 9999px;
  overflow: hidden;
  bottom: 0px;
  right: 0px;

  svg {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`;

export default TokenChainLogo;
