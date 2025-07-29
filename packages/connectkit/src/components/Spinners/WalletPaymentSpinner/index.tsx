import { AnimatePresence } from "framer-motion";
import CircleSpinner from "../CircleSpinner";
import SquircleSpinner from "../SquircleSpinner";
import { AnimationContainer, LoadingContainer } from "../styles";

const WalletPaymentSpinner = ({
  logo,
  logoShape,
  loading = false,
  unavailable = false,
}: {
  logo: React.ReactNode | string;
  logoShape: "circle" | "squircle";
  loading?: boolean;
  unavailable?: boolean;
}) => {
  const optionSpinner = (() => {
    if (typeof logo === "string") {
      if (logoShape === "circle") {
        return (
          <CircleSpinner
            logo={<img src={logo} />}
            loading={loading}
            unavailable={unavailable}
          />
        );
      } else {
        return <SquircleSpinner logo={<img src={logo} />} loading={loading} />;
      }
    } else {
      if (logoShape === "circle") {
        return (
          <CircleSpinner logo={logo} loading={loading} unavailable={unavailable} />
        );
      } else {
        return <SquircleSpinner logo={logo} loading={loading} />;
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
