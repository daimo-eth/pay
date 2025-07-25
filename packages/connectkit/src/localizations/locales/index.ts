import enUS from "./en-US";

// Allow locale files to provide only a subset of keys. Missing keys will
// automatically fall back to English (see getLocale implementation).
export type LocaleProps = Partial<typeof enUS>;
