import React from "react";

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  outline?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
};

export function Button({
  children,
  className = "",
  outline = false,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <button type={type} onClick={onClick} className={className}>
      {children}
    </button>
  );
}
