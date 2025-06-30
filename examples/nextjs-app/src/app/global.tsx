"use client";
import { rozoPayVersion } from "../../../../packages/connectkit/src/utils/exports";

export const Global = () => {
  (globalThis as any).__POWEREDBY__ = "Rozo";
  (globalThis as any).__SUPPORTURL__ = `http://pay.rozo.ai/?version=${rozoPayVersion}`;
  return null;
}
