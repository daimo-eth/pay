import React, { useMemo } from "react";

import { usePayContext } from "./usePayContext";

import { LocaleFull } from "../localizations/locales";
import { getLocale } from "./../localizations";

export default function useLocales(replacements?: any): LocaleFull {
  const context = usePayContext();
  const language = context.options?.language ?? "en-US";

  const translations = useMemo(() => {
    return getLocale(language);
  }, [language]);

  if (!translations) {
    console.error(`Missing translations for: ${language}`);
    throw new Error(`Missing translations for: ${language}`);
  }

  const translated: any = {};
  Object.keys(translations).map((key) => {
    const string = translations[key];
    return (translated[key] = localize(string, replacements));
  });

  return translated;
}

const localize = (text: string, replacements?: any[string]) => {
  let parsedText: string = text;
  if (replacements) {
    Object.keys(replacements).forEach((key) => {
      // use `replace` instead of `replaceAll` to support Node 14
      parsedText = parsedText.replace(
        new RegExp(`({{ ${key} }})`, "g"),
        replacements[key as keyof typeof replacements],
      );
    });
  }
  return replaceMarkdown(parsedText);
};

const replaceMarkdown = (markdownText: string) => {
  let text: any = markdownText;
  text = text.split("\n");
  text = text.map((t: string, i: number) => {
    return (
      <React.Fragment key={i}>
        {wrapTags(t)}
        {i < text.length - 1 && <br />}
      </React.Fragment>
    );
  });
  return text;
};

const wrapTags = (text: string) => {
  // Bold markdown handling
  const textArray = text.split(/(\*\*[^\*]*\*\*)/g);
  let result = textArray.map((str, i) => {
    if (/(\*\*.*\*\*)/g.test(str)) {
      // use `replace` instead of `replaceAll` to support Node 14
      return <strong key={i}>{str.replace(/\*\*/g, "")}</strong>;
    }
    return `${str}`;
  });

  // Replace text with logo
  return result.map((r) => {
    return r;
  });
};
