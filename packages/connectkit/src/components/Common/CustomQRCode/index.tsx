import {
  LogoContainer,
  LogoIcon,
  QRCodeContainer,
  QRCodeContent,
  QRPlaceholder,
} from "./styles";
import { CustomQRCodeProps } from "./types";

import { AnimatePresence, motion } from "framer-motion";
import Tooltip from "../Tooltip";

import React from "react";
import useWindowSize from "../../../hooks/useWindowSize";
import { QRCode } from "./QRCode";

function CustomQRCode({
  value,
  image,
  imageBackground,
  imagePosition = "center",
  tooltipMessage,
  contentPadding = 13,
}: CustomQRCodeProps) {
  const windowSize = useWindowSize();

  // Create a smaller version of the logo for tooltip
  const TooltipLogo =
    image &&
    React.cloneElement(image as React.ReactElement, {
      ...((image as React.ReactElement).props || {}),
      width: 32,
      height: 32,
    });

  const Logo =
    windowSize.width > 920 && tooltipMessage ? (
      <Tooltip xOffset={139} yOffset={5} delay={0.1} message={tooltipMessage}>
        {TooltipLogo}
      </Tooltip>
    ) : (
      image
    );

  return (
    <QRCodeContainer>
      <QRCodeContent style={{ inset: contentPadding }}>
        <AnimatePresence initial={false}>
          {value ? (
            <motion.div
              key={value}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, position: "absolute", inset: [0, 0] }}
              transition={{
                duration: 0.2,
              }}
            >
              <QRCode
                uri={value}
                size={576}
                ecl="H"
                clearArea={!!(imagePosition === "center" && image)}
                image={imagePosition === "bottom right" ? image : undefined} // idk wtf
                imageBackground={imageBackground}
              />
            </motion.div>
          ) : (
            <QRPlaceholder
              initial={{ opacity: 0.1 }}
              animate={{ opacity: 0.1 }}
              exit={{ opacity: 0, position: "absolute", inset: [0, 0] }}
              transition={{
                duration: 0.2,
              }}
            >
              <span />
              <span />
              <span />
              <div />
            </QRPlaceholder>
          )}
        </AnimatePresence>

        {image && (
          <LogoContainer>
            <LogoIcon
              $wcLogo={imagePosition !== "center"}
              style={{
                background:
                  imagePosition === "center" ? imageBackground : undefined,
              }}
            >
              {Logo}
            </LogoIcon>
          </LogoContainer>
        )}
      </QRCodeContent>
    </QRCodeContainer>
  );
}
CustomQRCode.displayName = "CustomQRCode";

export default CustomQRCode;
