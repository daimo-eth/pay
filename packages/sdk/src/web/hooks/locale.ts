import { en } from "./locales/en.js";
import { es } from "./locales/es.js";

export type DaimoModalLocale = typeof en;

const translations: Record<string, DaimoModalLocale> = { en, es };

/** Current active translations. Defaults to English. */
export let t: DaimoModalLocale = en;

/** Set the active locale. Accepts full codes (es-ES) or short codes (es). */
export function setLocale(languageCode: string) {
  if (translations[languageCode]) {
    t = translations[languageCode];
    return;
  }
  const short = languageCode.split("-")[0].toLowerCase();
  t = translations[short] ?? en;
}
