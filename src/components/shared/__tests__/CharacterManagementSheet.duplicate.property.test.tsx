import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  createCharacter,
  duplicateCharacter,
  loadCharacter,
} from '../../../storage/character-manager';

// In-memory localStorage mock (same pattern as character-manager.test.ts)
let store: Map<string, string>;

beforeEach(() => {
  store = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  });
  // Provide deterministic UUIDs
  let uuidCounter = 0;
  vi.stubGlobal('crypto', {
    randomUUID: () => `uuid-${++uuidCounter}`,
  });
});

/**
 * Feature: mobile-character-management, Property 4: Duplicate character name is original name with " (Copy)" appended
 * **Validates: Requirements 7.2**
 */
describe('Property 4: Duplicate character name is original name with " (Copy)" appended', () => {
  it('duplicated character name equals original name + " (Copy)" for any valid character name', () => {
    fc.assert(
      fc.property(
        // Generate random non-empty character names (1-50 chars, no leading/trailing whitespace issues)
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        (originalName) => {
          // Reset store for each iteration to avoid ID collisions
          store.clear();
          let uuidCounter = 0;
          vi.stubGlobal('crypto', {
            randomUUID: () => `uuid-${++uuidCounter}`,
          });

          // Create the original character
          const originalId = createCharacter(originalName);

          // Duplicate the character
          const duplicateId = duplicateCharacter(originalId);

          // Load the duplicated character
          const duplicated = loadCharacter(duplicateId);

          // Verify the duplicate's name is exactly original + " (Copy)"
          expect(duplicated).not.toBeNull();
          expect(duplicated!.name).toBe(`${originalName} (Copy)`);
        }
      ),
      { numRuns: 100 }
    );
  });
});
