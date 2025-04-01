import { useState } from "react";
import { Connector, CreateConnectorFn } from "wagmi";
import { walletConnect } from "wagmi/connectors";

import { isWalletConnectConnector } from "../utils";
import { useConnect } from "./useConnect";
import { usePayContext } from "./usePayContext";

export function useWalletConnectModal() {
  const { log } = usePayContext();
  const { connectAsync, connectors } = useConnect();
  const [isOpen, setIsOpen] = useState(false);

  return {
    isOpen,
    open: async () => {
      // add modal styling because wagmi does not let you add styling to the modal
      const w3mcss = document.createElement("style");
      w3mcss.innerHTML = `w3m-modal, wcm-modal{ --wcm-z-index: 2147483647; --w3m-z-index:2147483647; }`;
      document.head.appendChild(w3mcss);

      const clientConnector: Connector | undefined = connectors.find((c) =>
        isWalletConnectConnector(c.id),
      );

      if (clientConnector == null) {
        log("No WalletConnect connector available");
        return;
      }

      try {
        const provider: any = await clientConnector.getProvider();
        const projectId = provider.rpc.projectId;

        const connector: CreateConnectorFn = walletConnect({
          projectId,
          showQrModal: true,
        });

        setIsOpen(true);
        try {
          await connectAsync({ connector: connector });
        } catch (err) {
          log("WalletConnect", err);
        }
        setIsOpen(false);

        // remove modal styling
        try {
          document.head.removeChild(w3mcss);
        } catch {}
      } catch (err) {
        log("Could not get WalletConnect provider", err);
      }
    },
  };
}
