import { useState } from 'react';

export type DisplayMode = 'compact' | 'expanded';

const STORAGE_KEY = 'wfrp-display-mode';

function getStoredMode(): DisplayMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'compact' || stored === 'expanded') {
      return stored;
    }
  } catch { /* ignore — private browsing or quota exceeded */ }
  return 'expanded';
}

export function useCompactMode(): { mode: DisplayMode; toggle: () => void } {
  const [mode, setMode] = useState<DisplayMode>(getStoredMode);

  const toggle = () => {
    const next: DisplayMode = mode === 'expanded' ? 'compact' : 'expanded';
    setMode(next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
  };

  return { mode, toggle };
}
