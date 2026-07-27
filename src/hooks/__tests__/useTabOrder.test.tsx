import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTabOrder } from '../useTabOrder';

const defaultTabs = [
  { id: 'identity', label: 'Identity' },
  { id: 'abilities', label: 'Abilities' },
  { id: 'gear', label: 'Gear & Wealth' },
  { id: 'notes', label: 'Notes' },
];

describe('useTabOrder', () => {
  let originalSetItem: typeof Storage.prototype.setItem;
  let originalGetItem: typeof Storage.prototype.getItem;

  beforeEach(() => {
    originalSetItem = Storage.prototype.setItem;
    originalGetItem = Storage.prototype.getItem;
    localStorage.clear();
  });

  afterEach(() => {
    Storage.prototype.setItem = originalSetItem;
    Storage.prototype.getItem = originalGetItem;
  });

  describe('save failure scenario', () => {
    it('sets saveError to true when localStorage.setItem throws on exit edit mode', () => {
      const { result } = renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // Enter edit mode
      act(() => {
        result.current.toggleEditMode();
      });
      expect(result.current.isEditMode).toBe(true);
      expect(result.current.saveError).toBe(false);

      // Make localStorage.setItem throw
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      // Exit edit mode — triggers persist which should fail
      act(() => {
        result.current.toggleEditMode();
      });

      expect(result.current.isEditMode).toBe(false);
      expect(result.current.saveError).toBe(true);
    });

    it('clears saveError on next successful save', () => {
      const { result } = renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // Enter edit mode
      act(() => {
        result.current.toggleEditMode();
      });

      // Force failure
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      // Exit edit mode — persist fails
      act(() => {
        result.current.toggleEditMode();
      });
      expect(result.current.saveError).toBe(true);

      // Restore working localStorage
      Storage.prototype.setItem = originalSetItem;

      // Enter and exit edit mode again — persist succeeds
      act(() => {
        result.current.toggleEditMode();
      });
      act(() => {
        result.current.toggleEditMode();
      });

      expect(result.current.saveError).toBe(false);
    });
  });

  describe('unmount persistence', () => {
    it('persists current order when unmounting while in edit mode', () => {
      const { result, unmount } = renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // Enter edit mode
      act(() => {
        result.current.toggleEditMode();
      });
      expect(result.current.isEditMode).toBe(true);

      // Move a tab to create a non-default order
      act(() => {
        result.current.moveRight(0);
      });

      // Unmount while in edit mode
      unmount();

      // Verify that the order was persisted to localStorage
      const stored = localStorage.getItem('tabOrder:character');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed).toEqual(['abilities', 'identity', 'gear', 'notes']);
    });

    it('does not persist on unmount when not in edit mode', () => {
      localStorage.clear();

      const { result, unmount } = renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // Stay in view mode (not edit mode)
      expect(result.current.isEditMode).toBe(false);

      // Unmount without entering edit mode
      unmount();

      // No save should have occurred (no stored order since we used defaults)
      const stored = localStorage.getItem('tabOrder:character');
      expect(stored).toBeNull();
    });
  });

  describe('reconciliation on mount with stale stored data', () => {
    it('removes obsolete IDs and appends new ones from defaults', () => {
      // Pre-populate localStorage with stale data containing obsolete IDs
      localStorage.setItem(
        'tabOrder:character',
        JSON.stringify(['abilities', 'obsolete-tab', 'identity'])
      );

      const { result } = renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // The hook should reconcile: keep 'abilities' and 'identity' in stored order,
      // remove 'obsolete-tab', append missing 'gear' and 'notes' in default order
      expect(result.current.orderedTabs).toEqual([
        { id: 'abilities', label: 'Abilities' },
        { id: 'identity', label: 'Identity' },
        { id: 'gear', label: 'Gear & Wealth' },
        { id: 'notes', label: 'Notes' },
      ]);
    });

    it('persists reconciled order to localStorage after reconciliation', () => {
      // Pre-populate with stale data
      localStorage.setItem(
        'tabOrder:character',
        JSON.stringify(['notes', 'removed-tab', 'identity'])
      );

      renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // Verify the reconciled order was persisted
      const stored = localStorage.getItem('tabOrder:character');
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      // 'removed-tab' gone, 'notes' and 'identity' in stored order, 'abilities' and 'gear' appended
      expect(parsed).toEqual(['notes', 'identity', 'abilities', 'gear']);
    });

    it('uses default order when all stored IDs are obsolete', () => {
      localStorage.setItem(
        'tabOrder:character',
        JSON.stringify(['old1', 'old2', 'old3'])
      );

      const { result } = renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // All stored IDs are obsolete, so result should be default order
      expect(result.current.orderedTabs).toEqual(defaultTabs);
    });

    it('does not persist when stored order matches defaults after reconciliation', () => {
      // Store the exact default order — reconciliation should produce no change
      localStorage.setItem(
        'tabOrder:character',
        JSON.stringify(['identity', 'abilities', 'gear', 'notes'])
      );

      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      renderHook(() =>
        useTabOrder({ pageKey: 'character', defaultTabs })
      );

      // setItem should NOT be called since reconciliation didn't change anything
      expect(setItemSpy).not.toHaveBeenCalled();

      setItemSpy.mockRestore();
    });
  });
});
