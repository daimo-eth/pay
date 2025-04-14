import React, { useEffect, useRef } from "react";
import useIsMobile from "../../../hooks/useIsMobile";
import { usePayContext } from "../../../hooks/usePayContext";
import { MoreIndicator, ScrollAreaContainer, ScrollContainer } from "./styles";

const ArrowDown = () => (
  <svg
    width="11"
    height="12"
    viewBox="0 0 11 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5.49438 1L5.49438 11M5.49438 11L9.5 7M5.49438 11L1.5 7"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
export const ScrollArea = ({
  children,
  height,
  backgroundColor,
  mobileDirection,
  hideBottomLine = false,
}: {
  children: React.ReactNode;
  height?: number;
  backgroundColor?: string;
  mobileDirection?: "horizontal" | "vertical";
  hideBottomLine?: boolean;
}) => {
  const { log } = usePayContext();
  const ref = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const { isMobile } = useIsMobile();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // if ref is not scrollable, hide the more indicator
    if (el.scrollHeight > el.clientHeight) {
      if (moreRef.current) {
        moreRef.current.classList.remove("hide");
      }
    }
    log(`[SCROLL AREA]: ${el.scrollHeight}, ${el.clientHeight}`);

    const handleScroll = (e: any) => {
      const {
        scrollTop,
        scrollHeight,
        clientHeight,
        scrollLeft,
        scrollWidth,
        clientWidth,
      } = e.target;

      if (moreRef.current) {
        if (scrollTop > 0) {
          moreRef.current.classList.add("hide");
        }
      }

      if (scrollTop === 0 && scrollLeft === 0) {
        el.classList.add("scroll-start");
      } else {
        el.classList.remove("scroll-start");
      }

      if (
        scrollHeight - scrollTop === clientHeight &&
        scrollWidth - scrollLeft === clientWidth
      ) {
        el.classList.add("scroll-end");
      } else {
        el.classList.remove("scroll-end");
      }
    };

    el.addEventListener("scroll", handleScroll);
    handleScroll({ target: el });

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [ref.current]);

  return (
    <ScrollContainer>
      <ScrollAreaContainer
        ref={ref}
        $mobile={isMobile}
        $height={height}
        $backgroundColor={backgroundColor}
        $mobileDirection={mobileDirection}
        $hideBottomLine={hideBottomLine}
      >
        {children}
      </ScrollAreaContainer>
      <MoreIndicator
        ref={moreRef}
        className="hide"
        onClick={() => {
          if (ref.current) {
            ref.current.scrollTo({
              top: ref.current.scrollHeight,
              behavior: "smooth",
            });
          }
        }}
      >
        <span>
          <ArrowDown /> More Available
        </span>
      </MoreIndicator>
    </ScrollContainer>
  );
};
