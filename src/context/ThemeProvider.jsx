import { useEffect, useState } from "react";
import { themes, applyTheme, DEFAULT_THEME, normalizeTheme } from "../config/themes.js";
import { ThemeCtx } from "./ThemeContext.jsx";
import { useConsent } from './ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

export function ThemeProvider({ children }) {
  const { hasDecision, preferencesAllowed } = useConsent();
  const [theme, setTheme] = useState(
    () => normalizeTheme(readStoredValue("theme", 'preferences'))
  );

  useEffect(() => {
    if (!hasDecision) return;
    setTheme(
      preferencesAllowed
        ? normalizeTheme(readStoredValue('theme', 'preferences'))
        : DEFAULT_THEME,
    );
  }, [hasDecision, preferencesAllowed]);

  useEffect(() => {
    const resolvedTheme = normalizeTheme(theme);
    applyTheme(resolvedTheme);
    if (hasDecision && preferencesAllowed) {
      writeStoredValue("theme", resolvedTheme, 'preferences');
    }
  }, [hasDecision, preferencesAllowed, theme]);

  const value = {
    theme,
    setTheme,
    available: Object.keys(themes),
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
