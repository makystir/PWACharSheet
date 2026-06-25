import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { savePanelState, loadPanelState } from '../panel-state';

// Feature: ux-improvements, Property 9: Combat panel state persistence round-trip

describe('Property 9: Combat panel state persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('for any character ID and any mapping of panel names to boolean states, saving and loading produces an identical mapping', () => {
    // Generate alphanumeric character IDs
    const charIdArb = fc.string({ minLength: 1, maxLength: 20 })
      .filter(s => /^[a-zA-Z0-9]+$/.test(s));

    // Generate arbitrary Record<string, boolean> panel state mappings
    const panelStatesArb = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 30 }),
      fc.boolean()
    );

    fc.assert(
      fc.property(charIdArb, panelStatesArb, (charId, states) => {
        // Clear localStorage before each iteration to avoid key collisions
        localStorage.clear();

        // Save the panel state
        savePanelState(charId, states);

        // Load the panel state for the same character ID
        const loaded = loadPanelState(charId);

        // The loaded state must deeply equal the saved state
        expect(loaded).toEqual(states);
      }),
      { numRuns: 100 }
    );
  });
});
