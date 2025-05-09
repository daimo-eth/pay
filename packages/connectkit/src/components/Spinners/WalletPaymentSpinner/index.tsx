import { AnimatePresence } from "framer-motion";
import CircleSpinner from "../CircleSpinner";
import SquircleSpinner from "../SquircleSpinner";
import { AnimationContainer, LoadingContainer } from "../styles";

const WalletPaymentSpinner = ({
  logo,
  logoShape,
}: {
  logo: React.ReactNode | string;
  logoShape: "circle" | "squircle";
}) => {
  const optionSpinner = (() => {
    if (typeof logo === "string") {
      if (logoShape === "circle") {
        return (
          <CircleSpinner
            logo={<img src={logo} />}
            loading={false}
            unavailable={false}
          />
        );
      } else {
        return <SquircleSpinner logo={<img src={logo} />} loading={false} />;
      }
    } else {
      if (logoShape === "circle") {
        return (
          <CircleSpinner logo={logo} loading={false} unavailable={false} />
        );
      } else {
        return <SquircleSpinner logo={logo} loading={false} />;
      }
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

export default WalletPaymentSpinner;
