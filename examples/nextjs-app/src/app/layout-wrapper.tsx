"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import NavButtons from "./nav-buttons";

export function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMain = pathname === "/";

  return (
    <main
      className={`
        bg-white
        ${isMain ? "max-w-6xl " : "max-w-3xl "} 
        h-screen w-full m-auto px-4 py-8
      `}
    >
      {!isMain && <NavButtons />}
      <div className={isMain ? "" : "mt-8"}>{children}</div>
    </main>
  );
}
