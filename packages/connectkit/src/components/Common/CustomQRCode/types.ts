import React from "react";

export type CustomQRCodeProps = {
  value?: string;
  image?: React.ReactNode;
  imageBackground?: string;
  imagePosition?: "center" | "bottom right";
  tooltipMessage?: React.ReactNode | string;
  size?: number;
  /** Padding (in px) between the QR graphic and its outer container. Default 13. */
  contentPadding?: number;
};
