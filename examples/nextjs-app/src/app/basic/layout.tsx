import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Daimo Pay Basic Demo",
  description: "Demo showcasing basic Daimo Pay functionality",
};

export default function RootLayout(props: { children: ReactNode }) {
  return <Providers>{props.children}</Providers>;
}
