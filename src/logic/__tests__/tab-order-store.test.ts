import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateStoredValue, loadTabOrder, saveTabOrder, removeTabOrder, reconcileTabOrder } from '../tab-order-store';

describe('tab-order-store', () => {
  describe('validateStoredValue', () => {
    it('returns null for null input', () => {
      expect(validateStoredValue(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
      expect(validateStoredValue(undefined)).toBeNull();
    });

    it('returns null for number input', () => {
      expect(validateStoredValue(42)).toBeNull();
    });

    it('returns null for object input (not a string)', () => {
      expect(validateStoredValue({ tabs: ['a', 'b'] })).toBeNull();
    });

    it('returns null for a string that is not valid JSON', () => {
      expect(validateStoredValue('not json')).toBeNull();
    });

    it('returns null for JSON that parses to a non-array (object)', () => {
      expect(validateStoredValue('{"a":1}')).toBeNull();
    });

    it('returns null for JSON that parses to a number', () => {
      expect(validateStoredValue('123')).toBeNull();
    });

    it('returns null for an array containing numbers', () => {
      expect(validateStoredValue('[1, 2, 3]')).toBeNull();
    });

    it('returns null for an array containing empty strings', () => {
      expect(validateStoredValue('["a", "", "b"]')).toBeNull();
    });

    it('returns null for an array containing whitespace-only strings', () => {
      expect(validateStoredValue('["a", "   ", "b"]')).toBeNull();
    });

    it('returns null for an array with mixed types', () => {
      expect(validateStoredValue('["a", 1, "b"]')).toBeNull();
    });

    it('returns parsed array for a valid JSON string array', () => {
      expect(validateStoredValue('["identity", "abilities", "gear"]')).toEqual([
        'identity',
        'abilities',
        'gear',
      ]);
    });

    it('returns parsed array for a single-element valid array', () => {
      expect(validateStoredValue('["notes"]')).toEqual(['notes']);
    });

    it('returns empty array for an empty JSON array', () => {
      expect(validateStoredValue('[]')).toEqual([]);
    });
  });

  describe('reconcileTabOrder', () => {
    const defaults = ['identity', 'abilities', 'gear', 'notes'];

    it('returns defaults when all stored IDs are obsolete', () => {
      const stored = ['removed1', 'removed2', 'removed3'];
      expect(reconcileTabOrder(stored, defaults)).toEqual(defaults);
    });

    it('appends new IDs in default relative order when some are missing from stored', () => {
      // stored has 2 of the 4 defaults in custom order
      const stored = ['gear', 'identity'];
      const result = reconcileTabOrder(stored, defaults);
      // gear and identity keep their stored order, abilities and notes appended in default order
      expect(result).toEqual(['gear', 'identity', 'abilities', 'notes']);
    });

    it('deduplicates stored keeping first occurrence', () => {
      const stored = ['abilities', 'identity', 'abilities', 'gear', 'notes'];
      const result = reconcileTabOrder(stored, defaults);
      expect(result).toEqual(['abilities', 'identity', 'gear', 'notes']);
    });

    it('removes obsolete IDs and appends new IDs', () => {
      // stored has an obsolete ID and is missing "notes"
      const stored = ['identity', 'removed', 'gear', 'abilities'];
      const result = reconcileTabOrder(stored, defaults);
      expect(result).toEqual(['identity', 'gear', 'abilities', 'notes']);
    });

    it('returns defaults unchanged when stored exactly matches defaults', () => {
      const stored = ['identity', 'abilities', 'gear', 'notes'];
      const result = reconcileTabOrder(stored, defaults);
      expect(result).toEqual(defaults);
    });

    it('handles empty stored array by returning defaults', () => {
      expect(reconcileTabOrder([], defaults)).toEqual(defaults);
    });

    it('handles empty defaults by returning empty array', () => {
      expect(reconcileTabOrder(['a', 'b'], [])).toEqual([]);
    });

    it('preserves stored order for matching IDs while appending new ones at end', () => {
      // defaults has a new tab added between existing ones
      const newDefaults = ['identity', 'abilities', 'combat', 'gear', 'notes'];
      const stored = ['notes', 'gear', 'abilities', 'identity'];
      const result = reconcileTabOrder(stored, newDefaults);
      // stored order preserved for known tabs, 'combat' appended at end
      expect(result).toEqual(['notes', 'gear', 'abilities', 'identity', 'combat']);
    });
  });

  describe('saveTabOrder', () => {
    let originalSetItem: typeof Storage.prototype.setItem;

    beforeEach(() => {
      originalSetItem = Storage.prototype.setItem;
      localStorage.clear();
    });

    afterEach(() => {
      Storage.prototype.setItem = originalSetItem;
    });

    it('returns true on successful save', () => {
      expect(saveTabOrder('character', ['identity', 'abilities'])).toBe(true);
    });

    it('returns false when localStorage.setItem throws', () => {
      Storage.prototype.setItem = vi.fn(() => {
        throw new DOMException('QuotaExceededError');
      });

      expect(saveTabOrder('character', ['identity', 'abilities'])).toBe(false);
    });
  });

  describe('loadTabOrder', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('returns null when no data is stored for the page key', () => {
      expect(loadTabOrder('character')).toBeNull();
    });

    it('returns the stored array when valid data exists', () => {
      localStorage.setItem('tabOrder:character', '["abilities","identity"]');
      expect(loadTabOrder('character')).toEqual(['abilities', 'identity']);
    });

    it('returns null when stored data is invalid JSON', () => {
      localStorage.setItem('tabOrder:character', 'not-json');
      expect(loadTabOrder('character')).toBeNull();
    });

    it('returns null when stored data is not an array of strings', () => {
      localStorage.setItem('tabOrder:character', '[1, 2, 3]');
      expect(loadTabOrder('character')).toBeNull();
    });
  });

  describe('removeTabOrder', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    it('removes the stored value for the page key', () => {
      localStorage.setItem('tabOrder:character', '["a","b"]');
      removeTabOrder('character');
      expect(localStorage.getItem('tabOrder:character')).toBeNull();
    });

    it('does not throw when removing a key that does not exist', () => {
      expect(() => removeTabOrder('nonexistent')).not.toThrow();
    });
  });
});
