import { describe, it, expect } from 'vitest';
import { importFromJSON } from '../../storage/export-import';
import { BLANK_CHARACTER } from '../character';

/**
 * Backfill safety for the optional Organised Crime feature.
 *
 * - `houseRules.useOrganisedCrime` must default to false for pre-feature saves
 *   (deep-merge against BLANK_CHARACTER), consistent with the existing
 *   wildernessTravel / hunting backfill tests.
 * - `organisedCrime` is an OPTIONAL field intentionally absent from
 *   BLANK_CHARACTER, so an old character lacking it loads with no crash and no
 *   organisedCrime object (zero footprint when off), and `_v` stays 8.
 */
describe('Organised Crime — backfill safety', () => {
  it('backfills useOrganisedCrime to false on an old character lacking it, without an organisedCrime object', () => {
    const oldChar = {
      _v: 7,
      name: 'Old Save',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
      houseRules: {
        // A partial houseRules that omits useOrganisedCrime entirely.
        rangedDamageSBMode: 'none',
        useEnterprises: true,
      },
    };

    const result = importFromJSON(JSON.stringify(oldChar));
    expect(result.success).toBe(true);
    expect(result.character).toBeDefined();

    const c = result.character!;
    expect(c.houseRules.useOrganisedCrime).toBe(false);
    // The optional organisedCrime field is not synthesized by the merge.
    expect(c.organisedCrime).toBeUndefined();
    // Version is pinned to the current version (no bump for this additive field).
    expect(c._v).toBe(8);
  });

  it('round-trips an existing organisedCrime through import unchanged', () => {
    const withCrime = {
      ...structuredClone(BLANK_CHARACTER),
      organisedCrime: {
        memberships: [
          {
            id: 'g1',
            name: 'Essen Black Rose Lodge',
            organisationLevel: 3 as const,
            statusOverride: 'Brass 3',
            notes: 'Pays dues monthly.',
          },
        ],
      },
    };

    const result = importFromJSON(JSON.stringify(withCrime));
    expect(result.success).toBe(true);
    expect(result.character!.organisedCrime).toEqual(withCrime.organisedCrime);
  });
});
