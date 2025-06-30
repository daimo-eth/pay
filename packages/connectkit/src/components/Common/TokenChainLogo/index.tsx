import { Token } from "@rozoai/intent-common";
import { motion } from "framer-motion";
import { chainToLogo } from "../../../assets/chains";
import styled from "../../../styles/styled";

const TokenChainLogo = ({
  token,
  size = 32,
  offset = 0,
}: {
  token: Token;
  size?: number;
  offset?: number;
}) => {
  const chainLogoSize = Math.round((size * 30) / 64);

  return (
    <TokenChainContainer $size={size}>
      <TokenImage src={token.logoURI} alt={token.symbol} $size={size} />
      <ChainContainer $size={chainLogoSize} $offset={offset}>
        {chainToLogo[token.chainId]}
      </ChainContainer>
    </TokenChainContainer>
  );
};

const TokenChainContainer = styled(motion.div) <{ $size: number }>`
  position: relative;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const TokenImage = styled.img<{ $size: number; $showBorder: boolean }>`
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  border-radius: 50%;
  object-fit: cover;
  transition: transform 0.2s ease;

  ${(props) =>
    props.$showBorder &&
    `
    border: 2px solid var(--ck-body-background, #fff);
  `}
`;

const ChainContainer = styled(motion.div) <{
  $size: number;
  $offset: number;
  $showBorder: boolean;
}>`
  position: absolute;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  min-width: ${(props) => props.$size}px;
  min-height: ${(props) => props.$size}px;
  bottom: 0px;
  right: ${(props) => props.$offset}px;
  border-radius: 50%;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: ${(props) =>
    props.$showBorder ? "var(--ck-body-background, #fff)" : "transparent"};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  svg {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    flex-shrink: 0;
  }
`;

export default TokenChainLogo;
