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
      "Complete checkout experience with customizable payment options.",
    path: "/checkout",
  },
  {
    title: "Smart Contract",
    description: "Interact with smart contracts through payment integration.",
    path: "/contract",
  },
  {
    title: "Deposit Demo",
    description: "Demonstrate deposit functionality with cross-chain support.",
    path: "/deposit",
  },
  {
    title: "Farcaster Frame",
    description:
      "Integration example with Farcaster frames for social payments.",
    path: "/farcaster-frame",
  },
];

export function DemoPageContent() {
  return (
    <Container>
      <div className="max-w-4xl mx-auto py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold mb-4 text-green-dark">
            Daimo Pay Integration Demos
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Explore integration scenarios. Each one comes with a live demo and
            source code.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {demos.map((demo) => (
            <Link
              key={demo.path}
              href={demo.path}
              className="block p-8 rounded-xl bg-white shadow-sm border border-gray-100 
                hover:shadow-md hover:border-green-medium hover:bg-cream-light transition-all duration-200"
            >
              <h2 className="text-2xl font-semibold mb-3 text-green-dark">
                {demo.title}
              </h2>
              <p className="text-gray-600 text-lg">{demo.description}</p>
              <div className="mt-4">
                <span className="inline-block px-4 py-2 bg-green-medium text-white rounded-lg hover:bg-green-dark transition-all">
                  Try Demo
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </Container>
  );
}
