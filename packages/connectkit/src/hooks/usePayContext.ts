import React from "react";
import { PayContext } from "../provider/PayContext";

/** Rozo Pay internal context. */
export const usePayContext = () => {
  const context = React.useContext(PayContext);
  if (!context) throw Error("RozoPay Hook must be inside a Provider.");
  return context;
};
