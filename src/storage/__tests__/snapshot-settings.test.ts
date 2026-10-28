import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isAutoBackupEnabled,
  setAutoBackupEnabled,
  AUTO_BACKUP_ENABLED_KEY,
} from '../snapshot-settings';

/**
 * Unit tests for the auto-backup toggle persistence (auto-backup design §5/§7):
 * default ON, explicit 'false' ⇒ off, round-trip.
 */

let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
});

describe('snapshot-settings', () => {
  it('defaults to enabled when the flag is absent', () => {
    expect(isAutoBackupEnabled()).toBe(true);
  });

  it('only the explicit string "false" disables it', () => {
    store.set(AUTO_BACKUP_ENABLED_KEY, 'false');
    expect(isAutoBackupEnabled()).toBe(false);

    store.set(AUTO_BACKUP_ENABLED_KEY, 'true');
    expect(isAutoBackupEnabled()).toBe(true);

    store.set(AUTO_BACKUP_ENABLED_KEY, 'anything-else');
    expect(isAutoBackupEnabled()).toBe(true);
  });

  it('round-trips through setAutoBackupEnabled', () => {
    setAutoBackupEnabled(false);
    expect(isAutoBackupEnabled()).toBe(false);
    setAutoBackupEnabled(true);
    expect(isAutoBackupEnabled()).toBe(true);
  });
});
