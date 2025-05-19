import React, { useState } from "react";
import { SwitchIcon as Icon } from "../../../assets/icons";
import styled from "../../../styles/styled";

const Container = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  width: fit-content;
  background: transparent;
`;

const IconWrapper = styled.div<{ $isFlipped: boolean }>`
  opacity: ${({ $isFlipped }) => ($isFlipped ? 1 : 1)};
  transform: scaleY(${({ $isFlipped }) => ($isFlipped ? -1 : 1)});
  transition: all 0.2s ease-in-out;

  &.fade {
    opacity: 0;
    transform: scaleY(0);
  }
`;

const SwitchButton: React.FC<{
  onClick: () => void;
  children?: React.ReactNode;
}> = ({ onClick, children }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFading, setIsFading] = useState(false);

  const handleClick = () => {
    setIsFading(true);
    setTimeout(() => {
      setIsFlipped(!isFlipped);
      setIsFading(false);
    }, 150); // Match the transition duration
    onClick();
  };

  return (
    <Container onClick={handleClick}>
      <IconWrapper $isFlipped={isFlipped} className={isFading ? "fade" : ""}>
        <Icon />
      </IconWrapper>
      {children}
    </Container>
  );
};

export default SwitchButton;
