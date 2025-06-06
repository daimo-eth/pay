import React from "react";

type TextProps = {
  children: React.ReactNode;
  className?: string;
};

export function Text({ children, className = "" }: TextProps) {
  return <p className={className}>{children}</p>;
}

type TextLinkProps = {
  children: React.ReactNode;
  href: string;
  className?: string;
  target?: string;
};

export function TextLink({
  children,
  href,
  className = "",
  target,
}: TextLinkProps) {
  return (
    <a
      href={href}
      className={className}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  );
}

type CodeProps = {
  children: React.ReactNode;
  className?: string;
};

export function Code({ children, className = "" }: CodeProps) {
  return <code className={`font-mono ${className}`}>{children}</code>;
}
