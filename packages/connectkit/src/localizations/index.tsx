export type Languages =
  | "ar-AE"
  | "en-US"
  | "ee-EE"
  | "es-ES"
  | "fa-IR"
  | "fr-FR"
  | "ja-JP"
  | "pt-BR"
  | "zh-CN"
  | "ca-AD"
  | "ru-RU"
  | "zh-CN"
  | "tr-TR"
  | "vi-VN";

import { default as arAE } from "./locales/ar-AE";
import { default as caAD } from "./locales/ca-AD";
import { default as eeEE } from "./locales/ee-EE";
import { default as enUS } from "./locales/en-US";
import { default as esES } from "./locales/es-ES";
import { default as faIR } from "./locales/fa-IR";
import { default as frFR } from "./locales/fr-FR";
import { default as jaJP } from "./locales/ja-JP";
import { default as ptBR } from "./locales/pt-BR";
import { default as ruRU } from "./locales/ru-RU";
import { default as trTR } from "./locales/tr-TR";
import { default as viVN } from "./locales/vi-VN";
import { default as zhCN } from "./locales/zh-CN";

// Helper to merge locale with English defaults
const mergeWithEnglish = (locale: any) => ({ ...enUS, ...locale });

// TODO: tree-shaking
export const getLocale = (lang: Languages) => {
  switch (lang) {
    case "ee-EE":
      return mergeWithEnglish(eeEE);
    case "ar-AE":
      return mergeWithEnglish(arAE);
    case "es-ES":
      return mergeWithEnglish(esES);
    case "fa-IR":
      return mergeWithEnglish(faIR);
    case "fr-FR":
      return mergeWithEnglish(frFR);
    case "ja-JP":
      return mergeWithEnglish(jaJP);
    case "pt-BR":
      return mergeWithEnglish(ptBR);
    case "ru-RU":
      return mergeWithEnglish(ruRU);
    case "zh-CN":
      return mergeWithEnglish(zhCN);
    case "ca-AD":
      return mergeWithEnglish(caAD);
    case "tr-TR":
      return mergeWithEnglish(trTR);
    case "vi-VN":
      return mergeWithEnglish(viVN);
    default:
      // English already full
      return enUS;
  }
};
