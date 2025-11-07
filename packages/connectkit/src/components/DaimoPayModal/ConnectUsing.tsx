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
  const { pendingConnectorId, paymentState } = context;

  const walletFromConnectors = useWallet(pendingConnectorId ?? "");
  // Fall back to selectedWallet for wallets from walletConfigs (e.g. unique payment options)
  const wallet = walletFromConnectors || paymentState.selectedWallet;

  // Wallets from walletConfigs don't have connector/isInstalled, always show QR
  const connector = wallet?.connector;

  // If it doesn't have a connector, show QR code
  const [status, setStatus] = useState(
    connector == null ? states.QRCODE : states.INJECTOR,
  );

  useEffect(() => {
    // if no provider, change to qrcode
    const checkProvider = async () => {
      if (!wallet || connector == null) return;
      const provider = await connector.getProvider?.();
      if (!provider) {
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
