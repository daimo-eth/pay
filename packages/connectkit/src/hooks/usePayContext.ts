import React from "react";
import { PayContext } from "../provider/PayContext";

/** Daimo Pay internal context. */
export const usePayContext = () => {
  const context = React.useContext(PayContext);
  if (!context) throw Error("DaimoPay Hook must be inside a Provider.");
  return context;
};
