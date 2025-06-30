import * as Headless from "@headlessui/react";
import clsx from "clsx";
import React, { forwardRef } from "react";
import { Link } from "./link";

const styles = {
  base: [
    // Base
    "relative inline-flex items-center justify-center gap-x-2 rounded-lg font-semibold",
    // Sizing
    "px-4 py-2 text-base",
    // Focus
    "focus:outline-none",
    // Disabled
    "disabled:opacity-50",
  ],
  solid: [
    // Base solid style
    "bg-primary-dark hover:bg-primary-medium text-white transition-colors",
  ],
  outline: [
    // Base outline style
    "border border-primary-dark text-primary-dark transition-colors",
  ],
  plain: [
    // Base plain style
    "text-primary-dark hover:text-primary-medium transition-colors",
  ],
  colors: {
    "dark/zinc": [
      // Default color
      "bg-primary-dark hover:bg-primary-medium text-white transition-colors",
    ],
    green: ["bg-primary-dark hover:bg-primary-medium text-white transition-colors"],
    white: ["bg-white text-primary-dark  transition-colors"],
  },
};

type ButtonProps = (
  | { color?: keyof typeof styles.colors; outline?: never; plain?: never }
  | { color?: never; outline: boolean; plain?: never }
  | { color?: never; outline?: never; plain: true }
) & { className?: string; children: React.ReactNode } & (
    | Omit<Headless.ButtonProps, "as" | "className">
    | Omit<React.ComponentPropsWithoutRef<typeof Link>, "className">
  );

export const Button = forwardRef(function Button(
  { color, outline, plain, className, children, ...props }: ButtonProps,
  ref: React.ForwardedRef<HTMLElement>,
) {
  let classes = clsx(
    className,
    styles.base,
    outline ? styles.outline : plain ? styles.plain : styles.solid,
  );

  return "href" in props ? (
    <Link
      {...props}
      className={classes}
      ref={ref as React.ForwardedRef<HTMLAnchorElement>}
    >
      {children}
    </Link>
  ) : (
    <Headless.Button {...props} className={classes} ref={ref}>
      {children}
    </Headless.Button>
  );
});
