import { Token } from "@daimo/pay-common";
import { motion } from "framer-motion";
import { useMemo } from "react";
import { chainToLogo } from "../../../assets/chains";
import styled from "../../../styles/styled";

const TokenChainLogo = ({
  token,
  token2,
  size = 32,
  offset,
}: {
  token: Token;
  token2?: Token;
  size: number;
  offset?: number;
}) => {
  const containerStyle = useMemo(() => ({ width: size, height: size }), [size]);
  const chainStyle = useMemo(
    () => ({ width: size / 2, height: size / 2, right: offset }),
    [size, offset],
  );

  // If no second token, render the original simple version
  if (!token2) {
    return (
      <TokenChainContainer style={containerStyle}>
        <img
          src={token.logoURI}
          alt={token.symbol}
          style={{ borderRadius: 9999 }}
        />
        <ChainContainer style={chainStyle}>
          {chainToLogo[token.chainId]}
        </ChainContainer>
      </TokenChainContainer>
    );
  }

  // Render spinning coin version with two tokens
  return (
    <TokenChainContainer style={containerStyle}>
      <CoinContainer
        animate={{ rotateY: [0, 0, 180, 180, 360] }} // same angle twice = hold
        transition={{
          duration: 11, // 5 + 0.5 + 5 + 0.5
          times: [0, 0.455, 0.5, 0.955, 1], // ↑ 5s   ↑0.5s ↑5s ↑0.5s
          ease: "easeInOut",
          repeat: Infinity,
        }}
      >
        {/* Front face - token 1 */}
        <TokenFace>
          <img
            src={token.logoURI}
            alt={token.symbol}
            style={{ borderRadius: 9999, width: "100%", height: "100%" }}
          />
        </TokenFace>

        {/* Back face - token 2 */}
        <TokenBackFace>
          <img
            src={token2.logoURI}
            alt={token2.symbol}
            style={{ borderRadius: 9999, width: "100%", height: "100%" }}
          />
        </TokenBackFace>
      </CoinContainer>

      <ChainContainer style={chainStyle}>
        {chainToLogo[token.chainId]}
      </ChainContainer>
    </TokenChainContainer>
  );
};

const TokenChainContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
  position: relative;
  perspective: 600px;
`;

const CoinContainer = styled(motion.div)`
  width: 100%;
  height: 100%;
  position: relative;
  transform-style: preserve-3d;
`;

const TokenFace = styled.div`
  position: absolute;
  backface-visibility: hidden;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
`;

const TokenBackFace = styled.div`
  position: absolute;
  backface-visibility: hidden;
  z-index: 1;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  overflow: hidden;
  transform: rotateY(180deg);
`;

const ChainContainer = styled(motion.div)`
  position: absolute;
  border-radius: 9999px;
  overflow: hidden;
  bottom: 0px;
  right: 0px;
  z-index: 10; /* Ensure chain logo stays on top */

  svg {
    position: absolute;
    width: 100%;
    height: 100%;
  }
`;

export default TokenChainLogo;
