"use client";

import { version } from "@daimo/pay";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "../shared/tailwind-catalyst/button";
import { Heading } from "../shared/tailwind-catalyst/heading";

export default function NavButtons() {
  const pathname = usePathname();

  const Btn = ({ route, children }: { route: string; children: string }) => (
    <Link href={route}>
      {pathname === route ? (
        <Button className="inline-flex px-4 py-2 rounded-md bg-green-dark hover:bg-green-medium text-white transition-colors">
          {children}
        </Button>
      ) : (
        <Button
          outline
          className="inline-flex px-4 py-2 rounded-md border border-green-dark text-green-dark hover:bg-cream-medium"
        >
          {children}
        </Button>
      )}
    </Link>
  );

  return (
    <>
      <Heading className="text-green-dark">DaimoPayButton Examples</Heading>
      <div className="mt-1 text-sm text-green-medium">
        @daimo/pay v{version}
      </div>

      <div className="flex flex-wrap gap-4 mt-10">
        <Btn route="/basic">Basic</Btn>
        <Btn route="/contract">Contract</Btn>
        <Btn route="/checkout">Checkout</Btn>
        <Btn route="/deposit">Deposit</Btn>
        <Btn route="/mini-app">Mini App</Btn>
      </div>
    </>
  );
}
