import { useState, useEffect } from 'react';

export type ThemeMode = 'dark' | 'light' | 'high-contrast' | 'old-guy';

const STORAGE_KEY = 'wfrp-theme';

function getStoredTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'high-contrast' || stored === 'old-guy') {
      return stored;
    }
  } catch { /* ignore */ }
  return 'dark';
}

function applyTheme(mode: ThemeMode) {
  document.documentElement.setAttribute('data-theme', mode);
}

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(getStoredTheme);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    setThemeState(mode);
    try { localStorage.setItem(STORAGE_KEY, mode); } catch { /* ignore */ }
  };

  return { theme, setTheme };
}
