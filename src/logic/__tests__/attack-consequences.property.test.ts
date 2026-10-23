import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  deriveCriticalWoundSuggestions,
  buildDefendHandoff,
} from '../attack-consequences';
import { lookupCriticalWound } from '../critical-wounds';
import { CONDITIONS } from '../../data/conditions';
import {
  HEAD_CRITICAL_TABLE,
  ARM_CRITICAL_TABLE,
  BODY_CRITICAL_TABLE,
  LEG_CRITICAL_TABLE,
} from '../../data/critical-wound-tables';
import type { HitLocation } from '../../components/combat/hitLocationTable';
import type { CriticalWoundTableEntry } from '../../data/critical-wound-tables';

const CONDITION_NAMES = CONDITIONS.map((c) => c.name);
const CONDITION_MAX = new Map(CONDITIONS.map((c) => [c.name, c.maxLevel]));
const ALL_TABLES = [HEAD_CRITICAL_TABLE, ARM_CRITICAL_TABLE, BODY_CRITICAL_TABLE, LEG_CRITICAL_TABLE];
const ALL_ENTRIES: CriticalWoundTableEntry[] = ALL_TABLES.flat();

/**
 * Independently count "[N] <Condition> Condition(s)" fragments in an effect
 * string, using a fresh (non-shared) regex. Mirrors the parser's intent so the
 * completeness property does not merely restate the implementation.
 */
function countConditionFragments(effect: string): number {
  const re = new RegExp(
    '(?:\\d+)?\\s*(?:the\\s+)?(?:' +
      CONDITION_NAMES.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') +
      ')\\s+Conditions?',
    'gi',
  );
  const matches = effect.match(re);
  return matches ? matches.length : 0;
}

// ─── Property 1: closed vocabulary + completeness over real table data ───────

describe('attack-consequences, Property 1: crit parser closed vocabulary + completeness', () => {
  it('every suggestion name ∈ CONDITIONS, count ≥ 1, non-stackable clamped to maxLevel', () => {
    for (const entry of ALL_ENTRIES) {
      const suggestions = deriveCriticalWoundSuggestions(entry.effect);
      for (const s of suggestions) {
        expect(CONDITION_NAMES).toContain(s.name);
        expect(s.count).toBeGreaterThanOrEqual(1);
        expect(s.count).toBeLessThanOrEqual(CONDITION_MAX.get(s.name)!);
        expect(s.source).toBe('critical-wound');
        expect(s.testGated).toBe(false);
      }
    }
  });

  it('number of suggestions equals the number of "<Condition> Condition(s)" fragments in each entry', () => {
    for (const entry of ALL_ENTRIES) {
      const suggestions = deriveCriticalWoundSuggestions(entry.effect);
      expect(suggestions.length).toBe(countConditionFragments(entry.effect));
    }
  });
});

// ─── Property 2: location → table selection (six values → four tables fold) ──

describe('attack-consequences, Property 2: location → correct critical table', () => {
  const EXPECTED: Record<HitLocation, CriticalWoundTableEntry[]> = {
    Head: HEAD_CRITICAL_TABLE,
    'Left Arm': ARM_CRITICAL_TABLE,
    'Right Arm': ARM_CRITICAL_TABLE,
    Body: BODY_CRITICAL_TABLE,
    'Left Leg': LEG_CRITICAL_TABLE,
    'Right Leg': LEG_CRITICAL_TABLE,
  };
  const locationArb = fc.constantFrom<HitLocation>(
    'Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg',
  );

  it('lookupCriticalWound returns an entry from the expected table for all six locations', () => {
    fc.assert(
      fc.property(locationArb, fc.integer({ min: 1, max: 100 }), (location, roll) => {
        const entry = lookupCriticalWound(location, roll);
        expect(entry).toBeDefined();
        expect(EXPECTED[location]).toContainEqual(entry!);
      }),
      { numRuns: 300 },
    );
  });
});

// ─── Property 3: parser never throws, only emits known names ─────────────────

describe('attack-consequences, Property 3: parser determinism / no-crash', () => {
  it('arbitrary strings never throw and only emit known condition names', () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const result = deriveCriticalWoundSuggestions(s);
        for (const sug of result) {
          expect(CONDITION_NAMES).toContain(sug.name);
          expect(sug.count).toBeGreaterThanOrEqual(1);
        }
      }),
      { numRuns: 300 },
    );
  });

  it('condition-name fragments embedded in arbitrary text are always captured', () => {
    const nameArb = fc.constantFrom(...CONDITION_NAMES);
    fc.assert(
      fc.property(nameArb, fc.integer({ min: 1, max: 9 }), (name, n) => {
        const result = deriveCriticalWoundSuggestions(`Suffer ${n} ${name} Conditions`);
        const match = result.find((s) => s.name === name);
        expect(match).toBeDefined();
        expect(match!.count).toBe(Math.min(n, CONDITION_MAX.get(name)!));
      }),
      { numRuns: 200 },
    );
  });
});

// ─── Property 4: buildDefendHandoff split preserves pre-mitigation sum ────────

describe('attack-consequences, Property 4: buildDefendHandoff split', () => {
  const locationArb = fc.constantFrom<HitLocation>(
    'Head', 'Left Arm', 'Right Arm', 'Body', 'Left Leg', 'Right Leg',
  );

  it('damage + sl equals the original pre-mitigation sum and location is preserved', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 50 }),
        fc.integer({ min: -10, max: 20 }),
        locationArb,
        (damage, sl, location) => {
          const handoff = buildDefendHandoff(damage, sl, location);
          expect(handoff.damage + handoff.sl).toBe(damage + sl);
          expect(handoff.location).toBe(location);
        },
      ),
      { numRuns: 200 },
    );
  });
});
