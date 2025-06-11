"use client";

export const Global = () => {
  (globalThis as any).__POWEREDBY__ = "Rozo";
  (globalThis as any).__SUPPORTURL__ = "http://pay.rozo.ai/?version=0.0.7";
  return null;
}
