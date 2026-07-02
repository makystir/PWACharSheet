import { describe, it, expect, beforeEach, vi } from 'vitest';
import fc from 'fast-check';
import { setItem, getItem, removeItem } from '../local-storage';

/**
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * Preservation Property Tests:
 * These tests encode the CURRENT behavior that must be preserved through the fix.
 * They focus on observable side effects (data persistence, item removal) rather
 * than return type (which will change from void to { ok: true }).
 *
 * EXPECTED OUTCOME: Tests PASS on unfixed code (confirms baseline behavior).
 */
describe('Property 2: Preservation - Successful Writes and Non-Write Operations Unchanged', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map();
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      get length() { return store.size; },
      key: (index: number) => [...store.keys()][index] ?? null,
    });
  });

  /**
   * Validates: Requirements 3.1
   *
   * For all random key/value pairs where localStorage.setItem does NOT throw,
   * data is persisted correctly (localStorage.getItem(key) === value after call).
   */
  it('setItem persists data correctly for all key/value pairs when no exception is thrown', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (key, value) => {
          // Call setItem — localStorage does NOT throw
          setItem(key, value);

          // Observable side effect: data is persisted in localStorage
          expect(localStorage.getItem(key)).toBe(value);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 3.2
   *
   * For all getItem(key) calls, behavior returns stored value or null
   * with no side effects or error notifications.
   */
  it('getItem returns stored value or null with no side effects', () => {
    const consoleSpy = vi.spyOn(console, 'error');

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        fc.boolean(),
        (key, value, shouldPreStore) => {
          consoleSpy.mockClear();

          if (shouldPreStore) {
            // Pre-store a value so getItem can find it
            localStorage.setItem(key, value);
          } else {
            // Ensure key does not exist
            localStorage.removeItem(key);
          }

          const result = getItem(key);

          if (shouldPreStore) {
            // Should return the stored value
            expect(result).toBe(value);
          } else {
            // Should return null for non-existent keys
            expect(result).toBeNull();
          }

          // No error notifications should be triggered
          expect(consoleSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );

    consoleSpy.mockRestore();
  });

  /**
   * Validates: Requirements 3.3
   *
   * For all removeItem(key) calls, item is removed with no error
   * notification side effects.
   */
  it('removeItem removes item with no error notification side effects', () => {
    const consoleSpy = vi.spyOn(console, 'error');

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.string({ minLength: 0, maxLength: 1000 }),
        (key, value) => {
          consoleSpy.mockClear();

          // Store a value first
          localStorage.setItem(key, value);
          expect(localStorage.getItem(key)).toBe(value);

          // Call removeItem
          removeItem(key);

          // Observable side effect: item is removed from localStorage
          expect(localStorage.getItem(key)).toBeNull();

          // No error notifications should be triggered
          expect(consoleSpy).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );

    consoleSpy.mockRestore();
  });
});
