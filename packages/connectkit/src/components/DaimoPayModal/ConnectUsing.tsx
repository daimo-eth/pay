import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import { usePayContext } from "../../hooks/usePayContext";
import { useWallet } from "../../wallets/useWallets";

import ConnectWithInjector from "./ConnectWithInjector";
import ConnectWithQRCode from "./ConnectWithQRCode";

import Alert from "../Common/Alert";
import { contentVariants } from "../Common/Modal";

const states = {
  QRCODE: "qrcode",
  INJECTOR: "injector",
};

const ConnectUsing = () => {
  const context = usePayContext();
  const { pendingConnectorId } = context;

  const wallet = useWallet(pendingConnectorId ?? "");

  // If cannot be scanned, display injector flow, which if extension is not installed will show CTA to install it
  const isQrCode = !wallet?.isInstalled;

  const [status, setStatus] = useState(
    isQrCode ? states.QRCODE : states.INJECTOR,
  );

  useEffect(() => {
    // if no provider, change to qrcode
    const checkProvider = async () => {
      const res = await wallet?.connector?.getProvider();
      if (!res) {
        setStatus(states.QRCODE);
        setTimeout(context.triggerResize, 10); // delay required here for modal to resize
      }
    };
    if (status === states.INJECTOR) checkProvider();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!wallet) return <Alert>Connector not found</Alert>;

  return (
    <AnimatePresence>
      {status === states.QRCODE && (
        <motion.div
          key={states.QRCODE}
          initial={"initial"}
          animate={"animate"}
          exit={"exit"}
          variants={contentVariants}
        >
          <ConnectWithQRCode />
        </motion.div>
      )}
      {status === states.INJECTOR && (
        <motion.div
          key={states.INJECTOR}
          initial={"initial"}
          animate={"animate"}
          exit={"exit"}
          variants={contentVariants}
        >
          <ConnectWithInjector
            switchConnectMethod={() => {
              setStatus(states.QRCODE);
            }}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConnectUsing;
