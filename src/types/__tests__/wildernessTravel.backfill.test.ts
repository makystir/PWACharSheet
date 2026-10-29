import { describe, it, expect } from 'vitest';
import { importFromJSON } from '../../storage/export-import';
import { BLANK_CHARACTER } from '../character';

/**
 * Backfill safety for the optional Wilderness Travel feature (Slice A).
 *
 * - `houseRules.useWildernessTravel` must default to false for pre-feature saves
 *   (deep-merge against BLANK_CHARACTER), consistent with the existing
 *   psychologyToggle/enterprises backfill tests.
 * - `wildernessJourney` is an OPTIONAL field intentionally absent from
 *   BLANK_CHARACTER, so an old character lacking it loads with no crash and no
 *   journey object (zero footprint when off), and `_v` stays 8.
 */
describe('Wilderness Travel — backfill safety', () => {
  it('backfills useWildernessTravel to false on an old character lacking it, without a journey object', () => {
    const oldChar = {
      _v: 7,
      name: 'Old Save',
      species: 'Human',
      chars: structuredClone(BLANK_CHARACTER.chars),
      houseRules: {
        // A partial houseRules that omits useWildernessTravel entirely.
        rangedDamageSBMode: 'none',
        useEnterprises: true,
      },
    };

    const result = importFromJSON(JSON.stringify(oldChar));
    expect(result.success).toBe(true);
    expect(result.character).toBeDefined();

    const c = result.character!;
    expect(c.houseRules.useWildernessTravel).toBe(false);
    // The optional journey field is not synthesized by the merge.
    expect(c.wildernessJourney).toBeUndefined();
    // Version is pinned to the current version (no bump for this additive field).
    expect(c._v).toBe(8);
  });

  it('round-trips an existing journey through import unchanged', () => {
    const withJourney = {
      ...structuredClone(BLANK_CHARACTER),
      wildernessJourney: {
        name: 'Trek',
        plannedStages: 3,
        stageAdjustments: [{ id: 'adj1', delta: -1, reason: 'shortcut' }],
        stages: [{ id: 's1', label: '1', records: [], notes: '' }],
        roster: [{ id: 'm1', name: 'Gerd' }],
        planningEndeavour: 'Bought maps',
        planningSL: 2,
      },
    };

    const result = importFromJSON(JSON.stringify(withJourney));
    expect(result.success).toBe(true);
    expect(result.character!.wildernessJourney).toEqual(withJourney.wildernessJourney);
  });
});
