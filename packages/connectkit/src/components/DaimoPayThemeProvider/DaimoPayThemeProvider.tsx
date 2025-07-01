import React, { createContext, createElement } from "react";
import { CustomTheme, Mode, Theme } from "../../types";

type ContextValue = {
  theme?: Theme;
  mode?: Mode;
  customTheme?: CustomTheme;
};

const Context = createContext<ContextValue | null>(null);

type RozoPayThemeProviderProps = {
  children?: React.ReactNode;
  theme?: Theme;
  mode?: Mode;
  customTheme?: CustomTheme;
};

export const RozoPayThemeProvider: React.FC<RozoPayThemeProviderProps> = ({
  children,
  theme = "auto",
  mode = "auto",
  customTheme,
}) => {
  const value = {
    theme,
    mode,
    customTheme,
  };

  return createElement(Context.Provider, { value }, <>{children}</>);
};

export const useThemeContext = () => {
  const context = React.useContext(Context);
  if (!context) throw Error("RozoPayThemeProvider must be inside a Provider.");
  return context;
};
