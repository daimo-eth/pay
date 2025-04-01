import { ROUTES } from "../constants/routes";
import { usePayContext } from "./usePayContext";
import {
  useConnectCallback,
  useConnectCallbackProps,
} from "./useConnectCallback";

type UseModalProps = {} & useConnectCallbackProps;

/** Opens and closes the payment modal. */
export const useModal = ({ onConnect, onDisconnect }: UseModalProps = {}) => {
  const context = usePayContext();

  useConnectCallback({
    onConnect,
    onDisconnect,
  });

  return {
    open: context.open,
    setOpen: (show: boolean) => {
      if (show) {
        context.setRoute(ROUTES.SELECT_METHOD);
        context.setOpen(true);
      } else {
        context.setOpen(false);
      }
    },
  };
};
