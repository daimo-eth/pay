import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Daimo Pay Contract Demo",
  description: "Demo arbitrary contract call from any coin on any chain",
};

export default function RootLayout(props: { children: ReactNode }) {
  return <Providers>{props.children}</Providers>;
}
