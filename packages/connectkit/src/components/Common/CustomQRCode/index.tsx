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

  const Logo =
    windowSize.width > 920 && tooltipMessage ? (
      <Tooltip xOffset={139} yOffset={5} delay={0.1} message={tooltipMessage}>
        {image}
      </Tooltip>
    ) : (
      image
    );

  return (
    <QRCodeContainer>
      <QRCodeContent style={{ inset: contentPadding }}>
        {image && (
          <LogoContainer>
            <LogoIcon
              style={{
                background:
                  imagePosition === "center" ? imageBackground : undefined,
              }}
            >
              {Logo}
            </LogoIcon>
          </LogoContainer>
        )}

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
                image={imagePosition === "bottom right" ? image : undefined}
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
      </QRCodeContent>
    </QRCodeContainer>
  );
}
CustomQRCode.displayName = "CustomQRCode";

export default CustomQRCode;
