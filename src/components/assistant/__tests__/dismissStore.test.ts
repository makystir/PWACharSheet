import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  dismissStore,
  DISMISS_STORAGE_KEY,
  SNOOZE_DURATION_MS,
} from '../dismissStore';

describe('dismissStore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('starts from an empty record when storage is empty', () => {
    expect(dismissStore.read()).toEqual({ dismissed: [], snoozedUntil: {} });
  });

  it('dismiss() persists the id to the localStorage key and is idempotent', () => {
    dismissStore.dismiss('a');
    const raw = localStorage.getItem(DISMISS_STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({ dismissed: ['a'], snoozedUntil: {} });

    // Dismissing again does not duplicate the id.
    const after = dismissStore.dismiss('a');
    expect(after.dismissed).toEqual(['a']);
  });

  it('snooze() sets snoozedUntil to now + 24h and persists', () => {
    const now = 1_000_000;
    const rec = dismissStore.snooze('s1', now);
    expect(rec.snoozedUntil.s1).toBe(now + SNOOZE_DURATION_MS);
    expect(SNOOZE_DURATION_MS).toBe(24 * 60 * 60 * 1000);
    expect(JSON.parse(localStorage.getItem(DISMISS_STORAGE_KEY) as string).snoozedUntil.s1).toBe(
      now + SNOOZE_DURATION_MS,
    );
  });

  it('pruneDismissed() drops dismissed + snoozed ids absent from the active set', () => {
    dismissStore.dismiss('keep');
    dismissStore.dismiss('drop');
    dismissStore.snooze('snoozeKeep', 0);
    dismissStore.snooze('snoozeDrop', 0);

    const pruned = dismissStore.pruneDismissed(new Set(['keep', 'snoozeKeep']));
    expect(pruned.dismissed).toEqual(['keep']);
    expect(Object.keys(pruned.snoozedUntil)).toEqual(['snoozeKeep']);
  });

  it('pruneDismissed() is a no-op (no write) when nothing changes', () => {
    dismissStore.dismiss('a');
    const setSpy = vi.spyOn(Storage.prototype, 'setItem');
    const result = dismissStore.pruneDismissed(new Set(['a']));
    expect(result.dismissed).toEqual(['a']);
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('falls back to an in-memory default and makes NO network call when storage throws', () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    // Reads and writes both throw (private browsing / quota).
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('getItem blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('setItem blocked');
    });

    // read() swallows the throw and returns the empty default.
    expect(dismissStore.read()).toEqual({ dismissed: [], snoozedUntil: {} });

    // dismiss()/snooze() keep working against the in-memory copy.
    const afterDismiss = dismissStore.dismiss('x');
    expect(afterDismiss.dismissed).toContain('x');
    const afterSnooze = dismissStore.snooze('y', 500);
    expect(afterSnooze.snoozedUntil.y).toBe(500 + SNOOZE_DURATION_MS);

    // No network, ever (NFR-1).
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('coerces a malformed persisted value to the empty default', () => {
    localStorage.setItem(DISMISS_STORAGE_KEY, 'not-json{');
    expect(dismissStore.read()).toEqual({ dismissed: [], snoozedUntil: {} });
  });
});
