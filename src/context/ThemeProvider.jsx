import { useEffect, useState } from "react";
import { themes, applyTheme } from "../config/themes.js";
import { ThemeCtx } from "./ThemeContext.jsx";
import { useConsent } from './ConsentContext.jsx';
import { readStoredValue, writeStoredValue } from '../services/consentStorage.js';

export function ThemeProvider({ children }) {
  const { hasDecision, preferencesAllowed } = useConsent();
  const [theme, setTheme] = useState(
    () => readStoredValue("theme", 'preferences') || "appleMono"
  );

  useEffect(() => {
    if (!hasDecision) return;
    setTheme(
      preferencesAllowed
        ? readStoredValue('theme', 'preferences') || 'appleMono'
        : 'appleMono',
    );
  }, [hasDecision, preferencesAllowed]);

  useEffect(() => {
    applyTheme(theme);
    if (hasDecision && preferencesAllowed) {
      writeStoredValue("theme", theme, 'preferences');
    }
  }, [hasDecision, preferencesAllowed, theme]);

  const value = {
    theme,
    setTheme,
    available: Object.keys(themes),
  };

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}
