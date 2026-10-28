import { useStorefront } from '../localization/StorefrontContext.jsx';
import React from "react";
import "./ThemeSwitcher.css";
import { useTheme } from "../hooks/useTheme.js";
import { themes } from '../config/themes.js';

export default function ThemeSwitcher() {
  const { t: translateText } = useStorefront();

  const { theme, setTheme, available } = useTheme();
  return (
    <select
      className="theme-switcher"
      value={theme}
      onChange={(e) => setTheme(e.target.value)}
    >
      {available.map((t) => (
        <option key={t} value={t}>
          {translateText(themes[t]?.name || t)}
        </option>
      ))}
    </select>
  );
}
