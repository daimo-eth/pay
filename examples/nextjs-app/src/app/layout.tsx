import type { Metadata } from "next";
import { type ReactNode } from "react";
import { StyledComponentsRegistry } from "../styles/StyledComponentsRegistry";
import "../styles/tailwind.css";
import { LayoutWrapper } from "./layout-wrapper";
import { Global } from "./global";

export const metadata: Metadata = {
  title: "Daimo Pay Demo",
  description: "One-click crypto payments integration demos",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream-light min-h-screen">
        <Global />
        <StyledComponentsRegistry>
          <LayoutWrapper>{children}</LayoutWrapper>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
