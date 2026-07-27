import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { renderHook, act } from '@testing-library/react';
import { useTabOrder } from '../useTabOrder';

// Feature: reorderable-sub-tabs, Property 4: Navigation Suppressed in Edit Mode
// Feature: reorderable-sub-tabs, Property 8: Reset Restores Default Order
// Feature: reorderable-sub-tabs, Property 9: Reset Button Disabled When at Default
// Feature: reorderable-sub-tabs, Property 12: Edit Mode Does Not Update URL Hash

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary non-empty string suitable for tab IDs (no whitespace-only) */
const arbTabId: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0);

/** Arbitrary tab object with unique id and label */
const arbTab = (id: string) => ({ id, label: `Label ${id}` });

/** Arbitrary array of unique tab objects (2-8 tabs for meaningful reorder tests) */
const arbDefaultTabs: fc.Arbitrary<{ id: string; label: string }[]> = fc
  .uniqueArray(arbTabId, { minLength: 2, maxLength: 8 })
  .map(ids => ids.map(id => arbTab(id)));

/** Arbitrary valid page key */
const arbPageKey: fc.Arbitrary<string> = fc
  .string({ minLength: 1, maxLength: 20 })
  .filter(s => s.trim().length > 0 && !s.includes('\x00'));

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: reorderable-sub-tabs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Property 4: Navigation Suppressed in Edit Mode', () => {
    /**
     * **Validates: Requirements 2.3**
     *
     * The hook exposes isEditMode as true after toggleEditMode is called,
     * so consumers (SubTabBar) can suppress onTabChange navigation.
     * For any tab list, after entering edit mode, isEditMode is true.
     */

    it('isEditMode is true after toggleEditMode, enabling consumers to suppress navigation', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Initially not in edit mode
            expect(result.current.isEditMode).toBe(false);

            // Enter edit mode
            act(() => {
              result.current.toggleEditMode();
            });

            // Now isEditMode should be true — consumers use this to suppress navigation
            expect(result.current.isEditMode).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isEditMode toggles back to false on second toggle, re-enabling navigation', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode
            act(() => {
              result.current.toggleEditMode();
            });
            expect(result.current.isEditMode).toBe(true);

            // Exit edit mode
            act(() => {
              result.current.toggleEditMode();
            });
            expect(result.current.isEditMode).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 8: Reset Restores Default Order', () => {
    /**
     * **Validates: Requirements 4.2**
     *
     * For any non-default tab order, invoking resetOrder SHALL produce
     * orderedTabs identical to defaultTabs.
     */

    it('after reset, orderedTabs matches defaultTabs regardless of prior reordering', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          fc.integer({ min: 1, max: 10 }),
          (pageKey, defaultTabs, numMoves) => {
            localStorage.clear();

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode and perform some moves
            act(() => {
              result.current.toggleEditMode();
            });

            // Apply random moves to shuffle order
            for (let i = 0; i < numMoves; i++) {
              const idx = i % (defaultTabs.length - 1);
              act(() => {
                result.current.moveRight(idx);
              });
            }

            // Reset order
            act(() => {
              result.current.resetOrder();
            });

            // orderedTabs should now match defaultTabs exactly
            expect(result.current.orderedTabs).toEqual(defaultTabs);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('after reset, orderedTabs matches defaultTabs even with pre-existing stored order', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            // Pre-store a reversed order
            const reversedIds = [...defaultTabs].reverse().map(t => t.id);
            localStorage.setItem(
              `tabOrder:${pageKey}`,
              JSON.stringify(reversedIds)
            );

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode and reset
            act(() => {
              result.current.toggleEditMode();
            });
            act(() => {
              result.current.resetOrder();
            });

            // Should match default order
            expect(result.current.orderedTabs).toEqual(defaultTabs);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 9: Reset Button Disabled When at Default', () => {
    /**
     * **Validates: Requirements 4.5**
     *
     * isDefaultOrder is true iff current order equals defaults.
     */

    it('isDefaultOrder is true when orderedTabs matches defaultTabs', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Initially at default order
            expect(result.current.isDefaultOrder).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isDefaultOrder is false after a move changes the order', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode and move first tab right
            act(() => {
              result.current.toggleEditMode();
            });
            act(() => {
              result.current.moveRight(0);
            });

            // Order has changed, so isDefaultOrder should be false
            expect(result.current.isDefaultOrder).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('isDefaultOrder returns to true after reset', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode and reorder
            act(() => {
              result.current.toggleEditMode();
            });
            act(() => {
              result.current.moveRight(0);
            });
            expect(result.current.isDefaultOrder).toBe(false);

            // Reset
            act(() => {
              result.current.resetOrder();
            });

            // Should be back to default
            expect(result.current.isDefaultOrder).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 12: Edit Mode Does Not Update URL Hash', () => {
    /**
     * **Validates: Requirements 6.6**
     *
     * Reorder operations (moveLeft, moveRight) during edit mode don't change
     * the URL hash. The hook does not manage URL hash directly — we verify
     * that calling reorder methods has no side effect on location.hash.
     */

    it('moveLeft and moveRight do not modify location.hash while in edit mode', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          fc.integer({ min: 1, max: 10 }),
          (pageKey, defaultTabs, numMoves) => {
            localStorage.clear();

            // Set an initial hash to detect changes
            const initialHash = '#test/initial';
            window.location.hash = initialHash;

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode
            act(() => {
              result.current.toggleEditMode();
            });

            // Perform moves
            for (let i = 0; i < numMoves; i++) {
              const idx = i % (defaultTabs.length - 1);
              act(() => {
                result.current.moveRight(idx);
              });
            }

            // Also perform moveLeft operations
            for (let i = 0; i < numMoves; i++) {
              const idx = (i % (defaultTabs.length - 1)) + 1;
              act(() => {
                result.current.moveLeft(idx);
              });
            }

            // Hash should remain unchanged
            expect(window.location.hash).toBe(initialHash);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('resetOrder does not modify location.hash while in edit mode', () => {
      fc.assert(
        fc.property(
          arbPageKey,
          arbDefaultTabs,
          (pageKey, defaultTabs) => {
            localStorage.clear();

            const initialHash = '#test/reset-check';
            window.location.hash = initialHash;

            const { result } = renderHook(() =>
              useTabOrder({ pageKey, defaultTabs })
            );

            // Enter edit mode
            act(() => {
              result.current.toggleEditMode();
            });

            // Move then reset
            act(() => {
              result.current.moveRight(0);
            });
            act(() => {
              result.current.resetOrder();
            });

            // Hash should remain unchanged
            expect(window.location.hash).toBe(initialHash);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
