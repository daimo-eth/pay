import type { Metadata } from "next";
import { type ReactNode } from "react";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Daimo Pay Farcaster Frame Demo",
  description: "Demo embedding Daimo Pay in a Farcaster Framev2",
};

export default function RootLayout(props: { children: ReactNode }) {
  return <Providers>{props.children}</Providers>;
}
