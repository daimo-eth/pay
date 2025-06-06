import { motion } from "framer-motion";
import { useEffect } from "react";
import { keyframes } from "styled-components";
import { usePayContext } from "../../../hooks/usePayContext";
import styled from "../../../styles/styled";
import { OrDivider } from "../Modal";
import { ScrollArea } from "../ScrollArea";
import {
  OptionButton,
  OptionLabel,
  OptionSubtitle,
  OptionTitle,
  OptionsContainer,
} from "./styles";

export interface Option {
  id: string;
  sortValue?: number;
  title: string;
  subtitle?: string;
  icons: (React.ReactNode | string)[];
  onClick: () => void;
  disabled?: boolean;
}

export const OptionsList = ({
  options,
  isLoading,
  requiredSkeletons,
  scrollHeight = 300,
  orDivider = false,
  hideBottomLine = false,
}: {
  options: Option[];
  isLoading?: boolean;
  requiredSkeletons?: number;
  scrollHeight?: number;
  orDivider?: boolean;
  hideBottomLine?: boolean;
}) => {
  const { triggerResize, log } = usePayContext();
  const optionsLength = options.length;

  useEffect(() => {
    log(`[OPTIONS RESIZE]: ${optionsLength}, triggering resize`);
    if (optionsLength > 0) triggerResize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsLength]);

  if (isLoading) {
    const skeletonCount = requiredSkeletons
      ? Math.max(requiredSkeletons - optionsLength, 0)
      : 0;

    return (
      <OptionsContainer $totalResults={options.length}>
        {options.map((option) => (
          <OptionItem key={option.id} option={option} />
        ))}
        {isLoading &&
          Array.from({ length: skeletonCount }).map((_, index) => (
            <SkeletonOptionItem key={index} />
          ))}
      </OptionsContainer>
    );
  }

  return (
    <>
      <ScrollArea
        mobileDirection={"vertical"}
        height={scrollHeight}
        hideBottomLine={orDivider || hideBottomLine}
        totalItems={options.length}
      >
        <OptionsContainer $totalResults={options.length}>
          {options.map((option) => (
            <OptionItem key={option.id} option={option} />
          ))}
        </OptionsContainer>
      </ScrollArea>
      {orDivider && <OrDivider />}
    </>
  );
};

const SkeletonOptionItem = () => {
  return (
    <OptionButton type="button">
      <SkeletonIcon />
      <SkeletonLabel />
    </OptionButton>
  );
};

const pulse = keyframes`
  0% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
  100% {
    opacity: 0.6;
  }
`;

const SkeletonIcon = styled.div`
  position: absolute;
  right: 20px;
  width: 32px;
  height: 32px;
  border-radius: 22.5%;
  background-color: rgba(0, 0, 0, 0.1);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const SkeletonLabel = styled.div`
  width: 100px;
  height: 16px;
  border-radius: 8px;
  background-color: rgba(0, 0, 0, 0.1);
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

const OptionItem = ({ option }: { option: Option }) => {
  const hydratedIcons = option.icons.map((icon) => {
    if (typeof icon === "string") {
      return <img key={option.id} src={icon} alt="" />;
    }
    return icon;
  });

  const iconContent = (() => {
    return (
      <IconStackContainer>
        {hydratedIcons.map((icon, index) => (
          <IconStackItem
            key={index}
            $marginRight={index !== hydratedIcons.length - 1 ? -12 : 0}
            $zIndex={hydratedIcons.length - index}
          >
            {icon}
          </IconStackItem>
        ))}
      </IconStackContainer>
    );
  })();

  return (
    <OptionButton
      type="button"
      onClick={option.onClick}
      disabled={option.disabled}
    >
      {iconContent}
      <OptionLabel>
        <OptionTitle>{option.title}</OptionTitle>
        {option.subtitle && <OptionSubtitle>{option.subtitle}</OptionSubtitle>}
      </OptionLabel>
    </OptionButton>
  );
};

const IconStackContainer = styled(motion.div)`
  position: absolute;
  right: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const IconStackItem = styled(motion.div)<{
  $marginRight?: number;
  $zIndex?: number;
}>`
  display: block;
  overflow: hidden;
  user-select: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: ${(props) => props.$marginRight || 0}px;
  z-index: ${(props) => props.$zIndex || 2};
  width: 32px;
  height: 32px;
  overflow: hidden;
  svg,
  img {
    display: block;
    position: relative;
    pointer-events: none;
    overflow: hidden;
    width: 100%;
    height: 100%;
  }
  border-radius: 22.5%;
`;
