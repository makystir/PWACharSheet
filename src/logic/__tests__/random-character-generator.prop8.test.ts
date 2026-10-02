import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { pickSpeciesSkills } from '../random-character-generator';
import type { RNG } from '../random-character-generator';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character } from '../../types/character';
import { SPECIES_DATA } from '../../data/species';
import { resolveSkillCharacteristic } from '../advancement';

/**
 * Deterministic seeded RNG (mulberry32) — TEST UTILITY ONLY.
 * Never used in production code (Design "The RNG seam"; Req 1.5).
 * A fresh instance is built per seed so each run gets an independent,
 * reproducible stream.
 */
function mulberry32(seed: number): RNG {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The linked characteristic is resolved by the shared `resolveSkillCharacteristic`
 * (exact ADV_SKILL_DB match → skill group in SKILL_GROUPS → prefix match → default
 * 'Int'), the same helper the generator and the CharacterWizard call; the test
 * asserts advanced species skills land with that characteristic (Core p.35 skill
 * resolution). The resolver's own values are pinned in advancement.test.ts.
 */
const resolveSkillChar = resolveSkillCharacteristic;

/** The set of Basic skill names seeded on a blank character (bSkills). */
const BASIC_SKILL_NAMES = new Set(BLANK_CHARACTER.bSkills.map((s) => s.n));

/**
 * Reconstruct which species skills received advances from the pure
 * species-skill step, and how many. We diff the character's skills against a
 * fresh blank baseline so the ONLY advances present are the species step's
 * contribution (no career step runs here). Returns a map skill-name → advances.
 */
function speciesSkillAdvances(char: Character): Map<string, number> {
  const result = new Map<string, number>();
  // Basic skills: compare against the blank baseline (all start at a=0).
  for (const s of char.bSkills) {
    if (s.a > 0) result.set(s.n, s.a);
  }
  // Advanced skills: a fresh blank character has an empty aSkills array, so any
  // aSkills entry here was pushed by the species step.
  for (const s of char.aSkills) {
    if (s.a > 0) result.set(s.n, s.a);
  }
  return result;
}

// Feature: random-character-generator, Property 8 — Species skill allocation is legal.

describe('Feature: random-character-generator', () => {
  describe('Property 8 — Species skill allocation is legal', () => {
    /**
     * **Validates: Requirements 6.1, 6.2, 6.3**
     *
     * For any seed, the species-skill step (Core p.35) selects 6 DISTINCT skills
     * drawn from `SPECIES_DATA[species].skills` — 3 receiving +5 advances and 3
     * (disjoint) receiving +3 — where:
     *  - each selected skill matching a Basic skill name receives its advances on
     *    the Basic (`bSkills`) entry, and
     *  - each non-Basic selection appears as an Advanced (`aSkills`) entry whose
     *    linked characteristic equals `resolveSkillChar(name)`.
     *
     * Tested on the PURE helper `pickSpeciesSkills` over a fresh
     * `structuredClone(BLANK_CHARACTER)` so the only advances present are the
     * species step's — no career step runs. Driven over every species key and a
     * seed (≥100 runs). All Core species skill lists have 12 distinct entries, so
     * the full 3×+5 / 3×+3 allocation always applies.
     */
    it('selects 3×+5 and 3×+3 distinct species skills, routing Basic→bSkills and Advanced→aSkills with the resolved characteristic', () => {
      const speciesKeys = Object.keys(SPECIES_DATA);

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: 0xffffffff }),
          fc.integer({ min: 0, max: speciesKeys.length - 1 }),
          (seed, speciesIdx) => {
            const species = speciesKeys[speciesIdx];
            const speciesSkills = SPECIES_DATA[species].skills;

            const char = structuredClone(BLANK_CHARACTER);
            pickSpeciesSkills(mulberry32(seed >>> 0), char, speciesSkills);

            const advanced = speciesSkillAdvances(char);

            // Every advanced skill is drawn from the species skill list (Req 6.1).
            for (const name of advanced.keys()) {
              expect(speciesSkills).toContain(name);
            }

            // Exactly 6 distinct species skills received advances (Req 6.1).
            expect(advanced.size).toBe(6);

            // Exactly 3 at +5 and 3 at +3, disjoint (Req 6.1). Every advance value
            // is either 5 or 3 — no overlap would otherwise produce an 8.
            const fives: string[] = [];
            const threes: string[] = [];
            for (const [name, a] of advanced) {
              if (a === 5) fives.push(name);
              else if (a === 3) threes.push(name);
              else throw new Error(`unexpected advance ${a} on ${name}`);
            }
            expect(fives.length).toBe(3);
            expect(threes.length).toBe(3);

            // Disjoint: the +5 and +3 sets share no skill.
            const fiveSet = new Set(fives);
            for (const name of threes) {
              expect(fiveSet.has(name)).toBe(false);
            }

            // Routing (Req 6.2, 6.3): Basic skill names land on bSkills; non-Basic
            // selections appear as aSkills with the resolved linked characteristic.
            for (const name of advanced.keys()) {
              if (BASIC_SKILL_NAMES.has(name)) {
                const bEntry = char.bSkills.find((s) => s.n === name);
                expect(bEntry).toBeDefined();
                expect(bEntry!.a).toBe(advanced.get(name));
                // Not duplicated into aSkills.
                expect(char.aSkills.some((s) => s.n === name)).toBe(false);
              } else {
                const aEntry = char.aSkills.find((s) => s.n === name);
                expect(aEntry).toBeDefined();
                expect(aEntry!.a).toBe(advanced.get(name));
                expect(aEntry!.c).toBe(resolveSkillChar(name));
              }
            }
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
