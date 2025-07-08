import type { Metadata } from "next";
import { type ReactNode } from "react";
import { StyledComponentsRegistry } from "../styles/StyledComponentsRegistry";
import "../styles/tailwind.css";
import { LayoutWrapper } from "./layout-wrapper";

export const metadata: Metadata = {
  title: "Rozo Pay Demo",
  description: "One-click crypto payments integration demos",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white min-h-screen">
        <StyledComponentsRegistry>
          <LayoutWrapper>{children}</LayoutWrapper>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
