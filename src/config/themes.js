// Svaka tema ima: primary, accent, bg, surface, text, muted
export const DEFAULT_THEME = 'light';

export const themes = {
  light: {
    name: 'Svetla',
    primary: '#9b9b9bff', // crna za akcente/dugmad
    accent: '#D2D2D7', // svetlosiva linije/ivice
    bg: '#FFFFFF', // bela pozadina
    surface: '#F5F5F7', // kartice/sekcije (apple siva)
    text: '#111111', // skoro crna
    muted: '#6E6E73', // apple siva za sekundarni tekst
    onPrimary: '#FFFFFF', // tekst na primary (belo na crnoj)
  },
  // luxGold: {
  //   name: "luxGold",
  //   primary: "#C8A94E", // zlatna
  //   primaryDark: "#B0923E",
  //   accent: "#1F2937", // duboka antracit
  //   bg: "#0B0E12", // skoro crna
  //   surface: "#151923", // tamna površina
  //   text: "#F5F6F7", // skoro belo
  //   muted: "#8B8F98", // siva
  //   onPrimary: "#111111", // skoro crna na zlatnoj
  // },
  // midnightBlue: {
  //   name: "midnightBlue",
  //   primary: "#4F46E5",
  //   primaryDark: "#3730A3",
  //   accent: "#0B1020",
  //   bg: "#0A0C14",
  //   surface: "#12172A",
  //   text: "#F1F5F9",
  //   muted: "#94A3B8",
  //   onPrimary: "#111111",
  // },
  // emerald: {
  //   name: "emerald",
  //   primary: "#10B981",
  //   primaryDark: "#059669",
  //   accent: "#0C1A12",
  //   bg: "#0A0F0D",
  //   surface: "#10231B",
  //   text: "#ECFDF5",
  //   muted: "#86EFAC",
  //   onPrimary: "#111111",
  // },
  // crimson: {
  //   name: "crimson",
  //   primary: "#EF4444",
  //   primaryDark: "#B91C1C",
  //   accent: "#1B0B0B",
  //   bg: "#0F0A0A",
  //   surface: "#1E1515",
  //   text: "#FEF2F2",
  //   muted: "#FCA5A5",
  //   onPrimary: "#111111",
  // },
  // royalViolet: {
  //   name: "royalViolet",
  //   primary: "#8B5CF6",
  //   primaryDark: "#7C3AED",
  //   accent: "#1B1026",
  //   bg: "#0F0B16",
  //   surface: "#1A1030",
  //   text: "#F4F3FF",
  //   muted: "#C4B5FD",
  //   onPrimary: "#111111",
  // },
};

export function normalizeTheme(theme) {
  if (theme === 'appleMono') return DEFAULT_THEME;
  return themes[theme] ? theme : DEFAULT_THEME;
}

export function applyTheme(theme) {
  const t = typeof theme === 'string' ? themes[theme] : theme;
  if (!t) return;
  const r = document.documentElement.style;
  r.setProperty('--color-primary', t.primary);
  r.setProperty('--color-accent', t.accent);
  r.setProperty('--color-bg', t.bg);
  r.setProperty('--color-surface', t.surface);
  r.setProperty('--color-text', t.text);
  r.setProperty('--color-muted', t.muted);
  r.setProperty('--color-on-primary', t.onPrimary); // NOVO
}
