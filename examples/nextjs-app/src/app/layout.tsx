import type { Metadata } from "next";
import { type ReactNode } from "react";
import { StyledComponentsRegistry } from "../styles/StyledComponentsRegistry";
import { LayoutWrapper } from "./layout-wrapper";

import "../styles/main.css";

export const metadata: Metadata = {
  title: "Daimo Pay Demo",
  description: "One-click crypto payments integration demos",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-cream-light min-h-screen">
        <StyledComponentsRegistry>
          <LayoutWrapper>{children}</LayoutWrapper>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
