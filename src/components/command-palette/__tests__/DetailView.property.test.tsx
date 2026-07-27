import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { DetailView } from '../DetailView';
import { buildSearchIndex } from '../searchIndex';
import type { SearchableEntity, SearchResultEntry } from '../searchIndex';

// Feature: command-palette-search
// Property 9: DetailView renders all required fields per entity type

// ─── Shared Setup ────────────────────────────────────────────────────────────

const index = buildSearchIndex();

// Group entities by type for targeted generators
const spells = index.filter(e => e.type === 'spell');
const talents = index.filter(e => e.type === 'talent');
const skills = index.filter(e => e.type === 'skill');
const careers = index.filter(e => e.type === 'career');
const runes = index.filter(e => e.type === 'rune');
const rituals = index.filter(e => e.type === 'ritual');
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

const arbitraryRitualEntry = fc.record({
  entity: fc.constantFrom(...rituals),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

const arbitraryConditionEntry = fc.record({
  entity: fc.constantFrom(...conditions),
  score: fc.double({ min: 0.1, max: 100, noNaN: true }),
}).map(({ entity, score }) => toResultEntry(entity, score));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Extracts all <dt> text content from a container (the field labels) */
function getLabels(container: HTMLElement): string[] {
  const dts = container.querySelectorAll('dt');
  return Array.from(dts).map(dt => dt.textContent || '');
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Feature: command-palette-search', () => {
  describe('Property 9: DetailView renders all required fields per entity type', () => {
    /**
     * **Validates: Requirements 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8**
     *
     * For any entity, the rendered DetailView SHALL contain every required
     * field for that entity's type.
     */

    it('spell detail renders name heading and all required field labels', () => {
      fc.assert(
        fc.property(
          arbitrarySpellEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // All required field labels must be present
            const labels = getLabels(container);
            expect(labels).toContain('CN');
            expect(labels).toContain('Range');
            expect(labels).toContain('Target');
            expect(labels).toContain('Duration');
            expect(labels).toContain('Effect');
            expect(labels).toContain('Lore');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('talent detail renders name heading and all required field labels', () => {
      fc.assert(
        fc.property(
          arbitraryTalentEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // All required field labels must be present
            const labels = getLabels(container);
            expect(labels).toContain('Max');
            expect(labels).toContain('Description');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('skill detail renders name heading and all required field labels', () => {
      fc.assert(
        fc.property(
          arbitrarySkillEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // All required field labels must be present
            const labels = getLabels(container);
            expect(labels).toContain('Characteristic');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('career detail renders name heading, class, and level field labels', () => {
      fc.assert(
        fc.property(
          arbitraryCareerEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // Class label must be present
            const labels = getLabels(container);
            expect(labels).toContain('Class');

            // Each career level should have Status, Characteristics, Skills, Talents labels
            const data = entry.entity.displayData;
            if (data.type === 'career') {
              const levelCount = data.levels.length;
              // Each level contributes Status, Characteristics, Skills, Talents
              const statusCount = labels.filter(l => l === 'Status').length;
              const characteristicsCount = labels.filter(l => l === 'Characteristics').length;
              const skillsCount = labels.filter(l => l === 'Skills').length;
              const talentsCount = labels.filter(l => l === 'Talents').length;

              expect(statusCount).toBe(levelCount);
              expect(characteristicsCount).toBe(levelCount);
              expect(skillsCount).toBe(levelCount);
              expect(talentsCount).toBe(levelCount);

              // Level titles should also be rendered
              for (const level of data.levels) {
                if (level.title) {
                  const h4s = container.querySelectorAll('h4');
                  const titles = Array.from(h4s).map(h => h.textContent || '');
                  expect(titles).toContain(level.title);
                }
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rune detail renders name heading and all required field labels', () => {
      fc.assert(
        fc.property(
          arbitraryRuneEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // All required field labels must be present
            const labels = getLabels(container);
            expect(labels).toContain('Category');
            expect(labels).toContain('Master Rune');
            expect(labels).toContain('Max Per Item');
            expect(labels).toContain('XP Cost');
            expect(labels).toContain('Effects');
            expect(labels).toContain('Description');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('ritual detail renders name heading and all required field labels', () => {
      fc.assert(
        fc.property(
          arbitraryRitualEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // All required field labels must be present
            const labels = getLabels(container);
            expect(labels).toContain('CN');
            expect(labels).toContain('Type');
            expect(labels).toContain('Learning XP');
            expect(labels).toContain('Ingredients');
            expect(labels).toContain('Conditions');
            expect(labels).toContain('Description');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('condition detail renders name heading and all required field labels', () => {
      fc.assert(
        fc.property(
          arbitraryConditionEntry,
          (entry) => {
            const { container } = render(
              <DetailView entity={entry} onBack={vi.fn()} />
            );

            // Name appears as heading
            const heading = container.querySelector('h2');
            expect(heading?.textContent).toBe(entry.entity.name);

            // All required field labels must be present
            const labels = getLabels(container);
            expect(labels).toContain('Stackable');
            expect(labels).toContain('Description');
            expect(labels).toContain('Effects');
            expect(labels).toContain('Duration');
            expect(labels).toContain('Removed By');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
