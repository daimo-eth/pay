import { Token } from "@daimo/pay-common";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { chainToLogo } from "../../../assets/chains";
import styled from "../../../styles/styled";

const TokenChainLogo = ({
  token,
  size = 32,
  offset,
}: {
  token: Token;
  size?: number;
  offset?: number;
}) => {
  const s1 = useMemo(() => ({ width: size, height: size }), [size]);
  const s2 = useMemo(
    () => ({ width: size / 2, height: size / 2, right: offset }),
    [size, offset],
  );
  return (
    <TokenChainContainer style={s1}>
      <img
        src={token.logoURI}
        alt={token.symbol}
        style={{ borderRadius: 9999 }}
      />
      <ChainContainer style={s2}>{chainToLogo[token.chainId]}</ChainContainer>
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
