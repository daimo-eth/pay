import { useEffect } from "react";
import { Theme } from "../types";

export function useGoogleFont(font: string) {
  useEffect(() => {
    if (!font) return;
    const fontName = font.replace(/ /g, "+");

    const googleapis = document.createElement("link");
    googleapis.href = `https://fonts.googleapis.com`;
    googleapis.rel = "preconnect";

    const gstatic = document.createElement("link");
    gstatic.href = `https://fonts.gstatic.com`;
    gstatic.rel = "preconnect";
    gstatic.crossOrigin = "true";

    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;500;600&display=swap`;
    link.rel = "stylesheet";

    document.head.appendChild(googleapis);
    document.head.appendChild(gstatic);
    document.head.appendChild(link);
    return () => {
      try {
        document.head.removeChild(googleapis);
        document.head.removeChild(gstatic);
        document.head.removeChild(link);
      } catch {}
    };
  }, [font]);
}

// TODO: This could be dynamic if theming wasn't set up as css variables
export function useThemeFont(theme: Theme) {
  const themeFonts: any = {
    web95: "Lato",
    retro: "Nunito",
    midnight: "Inter",
    minimal: "Inter",
    rounded: "Nunito",
  };
  const font: string = themeFonts[theme] ?? null;
  useGoogleFont(font ?? "");
}
