// ──────────────────────────────────────────────────────────
// useSettings — persists app settings in localStorage
// ──────────────────────────────────────────────────────────

import { useState, useCallback, useEffect } from 'react';
import { type AppSettings, DEFAULT_SETTINGS } from '../types';

const STORAGE_KEY = 'bratislava-mhd-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(loadSettings);

  // Persist every time settings change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  // Toggle cozy mode class on <body>
  useEffect(() => {
    document.body.classList.toggle('cozy-mode', settings.cozyMode);
  }, [settings.cozyMode]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettingsState((prev) => ({ ...prev, ...patch }));
  }, []);

  return { settings, updateSettings };
}
