import { AnimatePresence } from "framer-motion";
import CircleSpinner from "../CircleSpinner";
import SquircleSpinner from "../SquircleSpinner";
import { AnimationContainer, LoadingContainer } from "../styles";

const ExternalPaymentSpinner = ({
  logoURI,
  logoShape,
}: {
  logoURI: string | React.ReactNode;
  logoShape: "circle" | "squircle";
}) => {
  const optionSpinner = (() => {
    if (logoShape === "circle") {
      return (
        <CircleSpinner
          logo={typeof logoURI === "string" ? <img src={logoURI} /> : logoURI}
          loading={false}
          unavailable={false}
        />
      );
    } else {
      return (
        <SquircleSpinner
          logo={typeof logoURI === "string" ? <img src={logoURI} /> : logoURI}
          loading={false}
        />
      );
    }
  })();

  return (
    <LoadingContainer>
      <AnimationContainer $circle={logoShape === "circle"}>
        <AnimatePresence>{optionSpinner}</AnimatePresence>
      </AnimationContainer>
    </LoadingContainer>
  );
};

export default ExternalPaymentSpinner;
