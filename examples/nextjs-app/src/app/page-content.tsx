"use client";

import Link from "next/link";
import { Container } from "./shared";

interface DemoCard {
  title: string;
  description: string;
  path: string;
}

const demos: DemoCard[] = [
  {
    title: "Basic Payment",
    description: "Accept basic payments from any coin on any chain.",
    path: "/basic",
  },
  {
    title: "Checkout Flow",
    description:
      "Deliver a great checkout experience with customizable payment options.",
    path: "/checkout",
  },
  {
    title: "Smart Contract",
    description:
      "Skip bridges, swaps and approvals. Let your users transact in one step.",
    path: "/contract",
  },
  {
    title: "Deposit Demo",
    description:
      "Onboard users from any chain, any exchange, any coin into your app.",
    path: "/deposit",
  },
];

export function DemoPageContent() {
  return (
    <Container>
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold mb-4 text-gray-800">
            Daimo Pay Integration Demos
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore integration scenarios. Each one comes with a live demo and
            source code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {demos.map((demo) => (
            <div
              key={demo.path}
              className="block p-8 rounded-xl bg-white shadow-sm border border-gray-100"
            >
              <h2 className="text-2xl font-semibold mb-3 text-green-dark">
                {demo.title}
              </h2>
              <p className="text-gray-600 text-lg">{demo.description}</p>
              <div className="mt-4">
                <Link
                  href={demo.path}
                  className="inline-block px-4 py-2 bg-green-medium text-white rounded-lg hover:bg-green-dark transition-colors"
                >
                  Try Demo
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Container>
  );
}
