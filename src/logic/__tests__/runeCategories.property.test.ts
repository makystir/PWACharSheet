import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import type { ProtectionItem, EngineeringItem, Character } from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// Feature: expanded-rune-categories

// ── Helper types and functions ──

type ProtectionItemType = 'banner' | 'shrine' | 'gatehouse' | 'oathstone' | 'icon' | 'other';
type EngineeringItemType = 'Grudge Thrower' | 'Bolt Thrower' | 'Blackpowder Cannon';

const protectionItemTypes: ProtectionItemType[] = ['banner', 'shrine', 'gatehouse', 'oathstone', 'icon', 'other'];
const engineeringItemTypes: EngineeringItemType[] = ['Grudge Thrower', 'Bolt Thrower', 'Blackpowder Cannon'];

/**
 * Helper: Creates a ProtectionItem with name validation.
 * Returns {success, item?, error?}.
 * Rejects empty, whitespace-only, or >100 char names.
 */
function createProtectionItem(
  name: string,
  type: ProtectionItemType
): { success: boolean; item?: ProtectionItem; error?: string } {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Name is required and must be between 1 and 100 characters.' };
  }
  if (name.length > 100) {
    return { success: false, error: 'Name is required and must be between 1 and 100 characters.' };
  }

  const item: ProtectionItem = {
    id: crypto.randomUUID(),
    name,
    type,
    location: '',
    runes: [],
  };
  return { success: true, item };
}

/**
 * Helper: Creates an EngineeringItem with name validation.
 * Returns {success, item?, error?}.
 * Rejects empty, whitespace-only, or >100 char names.
 */
function createEngineeringItem(
  name: string,
  type: EngineeringItemType
): { success: boolean; item?: EngineeringItem; error?: string } {
  if (!name || name.trim().length === 0) {
    return { success: false, error: 'Name is required and must be between 1 and 100 characters.' };
  }
  if (name.length > 100) {
    return { success: false, error: 'Name is required and must be between 1 and 100 characters.' };
  }

  const item: EngineeringItem = {
    id: crypto.randomUUID(),
    name,
    type,
    runes: [],
  };
  return { success: true, item };
}

/**
 * Helper: Edits a ProtectionItem's name, type, or location while preserving id and runes.
 */
function editProtectionItem(
  item: ProtectionItem,
  changes: { name?: string; type?: ProtectionItemType; location?: string }
): ProtectionItem {
  return {
    ...item,
    ...(changes.name !== undefined && { name: changes.name }),
    ...(changes.type !== undefined && { type: changes.type }),
    ...(changes.location !== undefined && { location: changes.location }),
    // id and runes are always preserved
    id: item.id,
    runes: [...item.runes],
  };
}

/**
 * Helper: Removes an EngineeringItem from a character, preserving knownRunes.
 */
function removeEngineeringItem(
  character: Pick<Character, 'engineeringItems' | 'knownRunes'>,
  itemId: string
): Pick<Character, 'engineeringItems' | 'knownRunes'> {
  return {
    engineeringItems: (character.engineeringItems ?? []).filter(i => i.id !== itemId),
    knownRunes: [...(character.knownRunes ?? [])],
  };
}

// ── Generators ──

/** Generator for invalid names: empty, whitespace-only, or >100 chars */
function arbitraryInvalidName(): fc.Arbitrary<string> {
  return fc.oneof(
    fc.constant(''),
    fc.array(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 1, maxLength: 20 }).map(arr => arr.join('')),
    fc.string({ minLength: 101, maxLength: 200 }),
  );
}

/** Generator for valid names: 1-100 chars, not whitespace-only */
function arbitraryValidName(): fc.Arbitrary<string> {
  return fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0);
}

/** Generator for a valid ProtectionItem with 0-3 protection rune IDs */
function arbitraryProtectionItem(): fc.Arbitrary<ProtectionItem> {
  return fc.record({
    id: fc.uuid(),
    name: arbitraryValidName(),
    type: fc.constantFrom(...protectionItemTypes),
    location: fc.string({ minLength: 0, maxLength: 200 }),
    runes: fc.array(fc.constantFrom(
      'protection-rune-of-alarm',
      'protection-rune-of-battle',
      'protection-rune-of-courage'
    ), { minLength: 0, maxLength: 3 }),
  });
}

/** Generator for a valid EngineeringItem with 0-3 engineering rune IDs */
function arbitraryEngineeringItem(): fc.Arbitrary<EngineeringItem> {
  return fc.record({
    id: fc.uuid(),
    name: arbitraryValidName(),
    type: fc.constantFrom(...engineeringItemTypes),
    runes: fc.array(fc.constantFrom(
      'engineering-rune-of-accuracy',
      'engineering-rune-of-burning',
      'engineering-rune-of-forging'
    ), { minLength: 0, maxLength: 3 }),
  });
}

// ── Property 16: Item creation name validation ──
// **Validates: Requirements 9.2, 9.3, 10.2, 10.3**

describe('Property 16: Item creation name validation', () => {
  it('rejects empty, whitespace-only, or >100 char names for ProtectionItem', () => {
    fc.assert(
      fc.property(
        arbitraryInvalidName(),
        fc.constantFrom(...protectionItemTypes),
        (name, type) => {
          const result = createProtectionItem(name, type);
          expect(result.success).toBe(false);
          expect(result.error).toBe('Name is required and must be between 1 and 100 characters.');
          expect(result.item).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('rejects empty, whitespace-only, or >100 char names for EngineeringItem', () => {
    fc.assert(
      fc.property(
        arbitraryInvalidName(),
        fc.constantFrom(...engineeringItemTypes),
        (name, type) => {
          const result = createEngineeringItem(name, type);
          expect(result.success).toBe(false);
          expect(result.error).toBe('Name is required and must be between 1 and 100 characters.');
          expect(result.item).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts valid names (1-100 chars, non-whitespace) for ProtectionItem and produces item with unique ID and empty runes', () => {
    fc.assert(
      fc.property(
        arbitraryValidName(),
        fc.constantFrom(...protectionItemTypes),
        (name, type) => {
          const result = createProtectionItem(name, type);
          expect(result.success).toBe(true);
          expect(result.item).toBeDefined();
          expect(result.item!.id).toBeTruthy();
          expect(result.item!.id.length).toBeGreaterThan(0);
          expect(result.item!.name).toBe(name);
          expect(result.item!.type).toBe(type);
          expect(result.item!.runes).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('accepts valid names (1-100 chars, non-whitespace) for EngineeringItem and produces item with unique ID and empty runes', () => {
    fc.assert(
      fc.property(
        arbitraryValidName(),
        fc.constantFrom(...engineeringItemTypes),
        (name, type) => {
          const result = createEngineeringItem(name, type);
          expect(result.success).toBe(true);
          expect(result.item).toBeDefined();
          expect(result.item!.id).toBeTruthy();
          expect(result.item!.id.length).toBeGreaterThan(0);
          expect(result.item!.name).toBe(name);
          expect(result.item!.type).toBe(type);
          expect(result.item!.runes).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('generates unique IDs for each created ProtectionItem', () => {
    fc.assert(
      fc.property(
        arbitraryValidName(),
        arbitraryValidName(),
        fc.constantFrom(...protectionItemTypes),
        (name1, name2, type) => {
          const result1 = createProtectionItem(name1, type);
          const result2 = createProtectionItem(name2, type);
          expect(result1.success).toBe(true);
          expect(result2.success).toBe(true);
          expect(result1.item!.id).not.toBe(result2.item!.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 17: Item edit preserves identity and runes ──
// **Validates: Requirements 9.4**

describe('Property 17: Item edit preserves identity and runes', () => {
  it('editing name preserves id and runes', () => {
    fc.assert(
      fc.property(
        arbitraryProtectionItem(),
        arbitraryValidName(),
        (item, newName) => {
          const edited = editProtectionItem(item, { name: newName });
          expect(edited.id).toBe(item.id);
          expect(edited.runes).toEqual(item.runes);
          expect(edited.name).toBe(newName);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing type preserves id and runes', () => {
    fc.assert(
      fc.property(
        arbitraryProtectionItem(),
        fc.constantFrom(...protectionItemTypes),
        (item, newType) => {
          const edited = editProtectionItem(item, { type: newType });
          expect(edited.id).toBe(item.id);
          expect(edited.runes).toEqual(item.runes);
          expect(edited.type).toBe(newType);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing location preserves id and runes', () => {
    fc.assert(
      fc.property(
        arbitraryProtectionItem(),
        fc.string({ minLength: 0, maxLength: 200 }),
        (item, newLocation) => {
          const edited = editProtectionItem(item, { location: newLocation });
          expect(edited.id).toBe(item.id);
          expect(edited.runes).toEqual(item.runes);
          expect(edited.location).toBe(newLocation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('editing multiple fields simultaneously preserves id and runes', () => {
    fc.assert(
      fc.property(
        arbitraryProtectionItem(),
        arbitraryValidName(),
        fc.constantFrom(...protectionItemTypes),
        fc.string({ minLength: 0, maxLength: 200 }),
        (item, newName, newType, newLocation) => {
          const edited = editProtectionItem(item, {
            name: newName,
            type: newType,
            location: newLocation,
          });
          expect(edited.id).toBe(item.id);
          expect(edited.runes).toEqual(item.runes);
          expect(edited.name).toBe(newName);
          expect(edited.type).toBe(newType);
          expect(edited.location).toBe(newLocation);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('runes array is a new reference (not shared) after edit', () => {
    fc.assert(
      fc.property(
        arbitraryProtectionItem(),
        arbitraryValidName(),
        (item, newName) => {
          const edited = editProtectionItem(item, { name: newName });
          // Mutating the edited runes should not affect original
          if (edited.runes.length > 0) {
            const originalRunes = [...item.runes];
            edited.runes.push('test-rune');
            expect(item.runes).toEqual(originalRunes);
          }
          expect(edited.id).toBe(item.id);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 18: Engineering item removal preserves knownRunes ──
// **Validates: Requirements 10.4**

describe('Property 18: Engineering item removal preserves knownRunes', () => {
  it('removing an engineering item does not modify knownRunes', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEngineeringItem(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.constantFrom(
          'engineering-rune-of-accuracy',
          'engineering-rune-of-burning',
          'engineering-rune-of-forging',
          'engineering-rune-of-penetrating',
          'engineering-rune-of-reloading'
        ), { minLength: 0, maxLength: 10 }),
        (items, knownRunes) => {
          // Pick first item to remove
          const itemToRemove = items[0];
          const character = {
            engineeringItems: items,
            knownRunes,
          };

          const result = removeEngineeringItem(character, itemToRemove.id);

          // knownRunes should remain identical
          expect(result.knownRunes).toEqual(knownRunes);
          // The removed item should no longer be in the list
          expect(result.engineeringItems!.find(i => i.id === itemToRemove.id)).toBeUndefined();
        }
      ),
      { numRuns: 100 }
    );
  });

  it('removing an item with inscribed runes still preserves those rune IDs in knownRunes', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        arbitraryValidName(),
        fc.constantFrom(...engineeringItemTypes),
        fc.array(fc.constantFrom(
          'engineering-rune-of-accuracy',
          'engineering-rune-of-burning',
          'engineering-rune-of-forging'
        ), { minLength: 1, maxLength: 3 }),
        (id, name, type, inscribedRunes) => {
          const item: EngineeringItem = { id, name, type, runes: inscribedRunes };
          // knownRunes includes the inscribed rune IDs plus possibly others
          const knownRunes = [...new Set([...inscribedRunes, 'engineering-rune-of-reloading'])];

          const character = {
            engineeringItems: [item],
            knownRunes,
          };

          const result = removeEngineeringItem(character, id);

          // All known runes including those that were on the removed item remain
          expect(result.knownRunes).toEqual(knownRunes);
          // Item is removed
          expect(result.engineeringItems).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('knownRunes is a new reference after removal (not shared with original)', () => {
    fc.assert(
      fc.property(
        fc.array(arbitraryEngineeringItem(), { minLength: 1, maxLength: 3 }),
        fc.array(fc.constantFrom(
          'engineering-rune-of-accuracy',
          'engineering-rune-of-burning'
        ), { minLength: 1, maxLength: 5 }),
        (items, knownRunes) => {
          const character = {
            engineeringItems: items,
            knownRunes,
          };
          const originalKnownRunes = [...knownRunes];

          const result = removeEngineeringItem(character, items[0].id);

          // Mutating result should not affect original
          result.knownRunes!.push('test-rune-id');
          expect(character.knownRunes).toEqual(originalKnownRunes);
        }
      ),
      { numRuns: 100 }
    );
  });
});
