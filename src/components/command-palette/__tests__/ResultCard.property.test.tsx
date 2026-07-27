import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { ResultCard } from '../ResultCard';
import { buildSearchIndex } from '../searchIndex';
import type { SearchableEntity, SearchResultEntry } from '../searchIndex';

// Feature: command-palette-search
// Property 8: ResultCard displays name, type badge, and type-specific summary

// ─── Shared Setup ────────────────────────────────────────────────────────────

const index = buildSearchIndex();

// Group entities by type for targeted generators
const spells = index.filter(e => e.type === 'spell');
const talents = index.filter(e => e.type === 'talent');
const skills = index.filter(e => e.type === 'skill');
const careers = index.filter(e => e.type === 'career');
const runes = index.filter(e => e.type === 'rune');
const conditions = index.filter(e => e.type === 'condition');

// ─── Generators ──────────────────────────────────────────────────────────────

/** Wraps a SearchableEntity into a SearchResultEntry with arbitrary score */
function toResultEntry(entity: SearchableEntity, score: number): SearchResultEntry {
  return {
    entity,
    score,
    nameMatchRanges: [],
  };
}

/** Generator for arbitrary SearchResultEntry from the real index */
const arbitraryResultEntry = fc.record({
  entity: fc.constantFrom(...index),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

/** Type-specific generators for targeted sub-type assertions */
const arbitrarySpellEntry = fc.record({
  entity: fc.constantFrom(...spells),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

const arbitraryTalentEntry = fc.record({
  entity: fc.constantFrom(...talents),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

const arbitrarySkillEntry = fc.record({
  entity: fc.constantFrom(...skills),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

const arbitraryCareerEntry = fc.record({
  entity: fc.constantFrom(...careers),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

const arbitraryRuneEntry = fc.record({
  entity: fc.constantFrom(...runes),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

const arbitraryConditionEntry = fc.record({
  entity: fc.constantFrom(...conditions),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getExpectedBadge(type: string): string {
  switch (type) {
    case 'spell': return 'Spell';
    case 'talent': return 'Talent';
    case 'skill': return 'Skill';
    case 'career': return 'Career';
    case 'rune': return 'Rune';
    case 'ritual': return 'Ritual';
    case 'condition': return 'Condition';
    default: return type;
  }
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: command-palette-search', () => {
  describe('Property 8: ResultCard displays name, type badge, and type-specific summary', () => {
    /**
     * **Validates: Requirements 6.4, 6.5, 6.6, 6.7, 6.8, 6.9, 6.10**
     *
     * For any SearchResultEntry, the rendered ResultCard SHALL contain
     * the entity name text, a type badge matching the entity type, and
     * the type-specific summary field.
     */

    it('rendered ResultCard contains entity name and correct type badge', () => {
      fc.assert(
        fc.property(
          arbitraryResultEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';

            // Entity name must be present
            expect(text).toContain(entry.entity.name);

            // Type badge must match expected label
            const expectedBadge = getExpectedBadge(entry.entity.type);
            expect(text).toContain(expectedBadge);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('spell entries show CN and/or lore in summary', () => {
      fc.assert(
        fc.property(
          arbitrarySpellEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';
            const data = entry.entity.displayData;

            if (data.type === 'spell') {
              const cn = data.cn ? `CN ${data.cn}` : '';
              const lore = data.lore || '';
              const parts = [cn, lore].filter(Boolean);

              if (parts.length > 0) {
                // At least one of CN or lore should be present in output
                const hasCn = cn ? text.includes(cn) : true;
                const hasLore = lore ? text.includes(lore) : true;
                expect(hasCn || hasLore).toBe(true);
              } else {
                // Fallback: should show "—"
                expect(text).toContain('—');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('talent entries show max level in summary', () => {
      fc.assert(
        fc.property(
          arbitraryTalentEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';
            const data = entry.entity.displayData;

            if (data.type === 'talent') {
              if (data.max) {
                expect(text).toContain(`Max: ${data.max}`);
              } else {
                expect(text).toContain('—');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('skill entries show linked characteristic in summary', () => {
      fc.assert(
        fc.property(
          arbitrarySkillEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';
            const data = entry.entity.displayData;

            if (data.type === 'skill') {
              if (data.characteristic) {
                expect(text).toContain(data.characteristic);
              } else {
                expect(text).toContain('—');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('career entries show career class in summary', () => {
      fc.assert(
        fc.property(
          arbitraryCareerEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';
            const data = entry.entity.displayData;

            if (data.type === 'career') {
              if (data.class) {
                expect(text).toContain(data.class);
              } else {
                expect(text).toContain('—');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rune entries show rune category in summary', () => {
      fc.assert(
        fc.property(
          arbitraryRuneEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';
            const data = entry.entity.displayData;

            if (data.type === 'rune') {
              if (data.category) {
                expect(text).toContain(data.category);
              } else {
                expect(text).toContain('—');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('condition entries show stackable status in summary', () => {
      fc.assert(
        fc.property(
          arbitraryConditionEntry,
          (entry) => {
            const { container } = render(
              <ResultCard
                entry={entry}
                isSelected={false}
                onClick={() => {}}
                id="test-card"
              />
            );

            const text = container.textContent || '';
            const data = entry.entity.displayData;

            if (data.type === 'condition') {
              if (data.stackable) {
                expect(text).toContain('Stackable');
              } else {
                expect(text).toContain('Non-stackable');
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
