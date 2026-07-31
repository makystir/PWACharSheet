import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { render } from '@testing-library/react';
import { PrintLayout } from '../PrintLayout';
import { arbitraryCharacter, arbitraryArmourPoints } from './printLayoutGenerators';
import type { CharacteristicKey } from '../../../types/character';

/**
 * Validates: Requirements 5.3, 5.4
 */
describe('Feature: print-layout-redesign', () => {
  it('Property 3: Skill total calculation correctness', () => {
    const VALID_KEYS: CharacteristicKey[] = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'];

    fc.assert(
      fc.property(
        arbitraryCharacter(),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          // Collect all skills with valid characteristic links
          const allSkills = [...character.bSkills, ...character.aSkills];
          const skillsWithValidChar = allSkills.filter(s => VALID_KEYS.includes(s.c as CharacteristicKey));

          if (skillsWithValidChar.length === 0) return; // skip if no valid skills

          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          // For each skill with a valid characteristic, verify the displayed total
          for (const skill of skillsWithValidChar) {
            const cv = character.chars[skill.c as CharacteristicKey];
            const expectedTotal = (cv.i + cv.a + cv.b) + skill.a;

            // Find the skill row in the rendered output
            const rows = container.querySelectorAll('tr');
            for (const row of rows) {
              const cells = row.querySelectorAll('td');
              if (cells.length >= 4 && cells[0]?.textContent === skill.n && cells[1]?.textContent === skill.c) {
                const displayedTotal = cells[3]?.textContent;
                expect(displayedTotal).toBe(String(expectedTotal));
                break;
              }
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.2
   */
  it('Property 2: Non-essential content is excluded from print output', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().map(c => ({
          ...c,
          // Populate non-essential fields with identifiable content
          advancementLog: [{ timestamp: 1000, type: 'skill', name: 'ADVLOG_MARKER', from: 0, to: 5, xpCost: 10, careerLevel: 'Level 1', inCareer: true }],
          sessionHistory: [{ startTime: 1000, endTime: 2000, summary: 'SESSION_HIST_MARKER' }],
          xpCur: 999,
          xpSpent: 888,
          xpTotal: 1887,
          portrait: 'data:image/png;base64,PORTRAIT_MARKER',
          endeavours: [{ id: '1', label: 'ENDEAVOUR_MARKER', slots: 2, entries: [], statusWarning: false }],
          estate: { ...c.estate, ledger: [{ timestamp: 1000, type: 'income', description: 'LEDGER_MARKER', amount: { d: 0, ss: 0, gc: 10 } }] },
        })),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const html = container.innerHTML;

          // Non-essential content should not appear
          expect(html).not.toContain('ADVLOG_MARKER');
          expect(html).not.toContain('SESSION_HIST_MARKER');
          expect(html).not.toContain('PORTRAIT_MARKER');
          expect(html).not.toContain('ENDEAVOUR_MARKER');
          expect(html).not.toContain('LEDGER_MARKER');

          // XP totals ARE now displayed per Req 1.1 (current/spent/total)
          // Verify they appear in the Experience section
          expect(html).toContain('999');
          expect(html).toContain('888');
          expect(html).toContain('1887');

          // No img tags with portrait
          const imgs = container.querySelectorAll('img');
          for (const img of imgs) {
            expect(img.getAttribute('src')).not.toContain('PORTRAIT_MARKER');
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 1.5
   */
  it('Property 7: Companion stat block completeness', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().filter(c => c.companions.length > 0),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          // Use textContent to avoid HTML encoding issues with special characters
          const text = container.textContent || '';

          for (const comp of character.companions) {
            // Verify all companion fields are present
            expect(text).toContain(comp.name);
            expect(text).toContain(comp.species);
            expect(text).toContain(String(comp.M));
            expect(text).toContain(String(comp.WS));
            expect(text).toContain(String(comp.BS));
            expect(text).toContain(String(comp.S));
            expect(text).toContain(String(comp.T));
            expect(text).toContain(String(comp.I));
            expect(text).toContain(String(comp.Ag));
            expect(text).toContain(String(comp.Dex));
            expect(text).toContain(String(comp.Int));
            expect(text).toContain(String(comp.WP));
            expect(text).toContain(String(comp.Fel));
            expect(text).toContain(String(comp.W));
            expect(text).toContain(comp.traits);
            // Trained skills are joined with comma
            for (const skill of comp.trained) {
              expect(text).toContain(skill);
            }
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 8.1
   */
  it('Property 6: Spell fields completeness when present', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().filter(c => c.spells.length > 0),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          // Spells section should be present
          expect(text).toContain('Spells and Prayers');

          for (const spell of character.spells) {
            expect(text).toContain(spell.name);
            expect(text).toContain(spell.cn);
            expect(text).toContain(spell.range);
            expect(text).toContain(spell.target);
            expect(text).toContain(spell.duration);
            expect(text).toContain(spell.effect);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 6.4, 6.5
   */
  it('Property 4: Wound breakdown calculation correctness', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter(),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const sTotal = character.chars.S.i + character.chars.S.a + character.chars.S.b;
          const tTotal = character.chars.T.i + character.chars.T.a + character.chars.T.b;
          const wpTotal = character.chars.WP.i + character.chars.WP.a + character.chars.WP.b;
          const expectedSB = Math.floor(sTotal / 10);
          const expectedTBx2 = 2 * Math.floor(tTotal / 10);
          const expectedWPB = Math.floor(wpTotal / 10);
          const hardyLevel = character.talents.find(t => t.n === 'Hardy')?.lvl ?? 0;
          const TB = Math.floor(tTotal / 10);
          const expectedHardy = hardyLevel > 0 ? hardyLevel * TB : 0;

          // Find the Wounds section - look for rows with wound breakdown labels
          const rows = container.querySelectorAll('tr');
          const woundValues: Record<string, string> = {};

          for (const row of rows) {
            const cells = row.querySelectorAll('td');
            if (cells.length === 2) {
              const label = cells[0]?.textContent?.trim();
              const value = cells[1]?.textContent?.trim();
              if (label && value !== undefined && ['SB', 'TB×2', 'WPB', 'Hardy'].includes(label)) {
                woundValues[label] = value;
              }
            }
          }

          expect(woundValues['SB']).toBe(String(expectedSB));
          expect(woundValues['TB×2']).toBe(String(expectedTBx2));
          expect(woundValues['WPB']).toBe(String(expectedWPB));
          expect(woundValues['Hardy']).toBe(String(expectedHardy));
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 6.1
   */
  it('Property 5: Weapon fields completeness', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter().filter(c => c.weapons.length > 0),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          const text = container.textContent || '';

          for (const weapon of character.weapons) {
            expect(text).toContain(weapon.name);
            expect(text).toContain(weapon.group);
            expect(text).toContain(weapon.enc);
            // Range/reach uses fallback: rangeReach || maxR || ''
            const expectedRange = weapon.rangeReach || weapon.maxR || '';
            if (expectedRange) {
              expect(text).toContain(expectedRange);
            }
            expect(text).toContain(weapon.damage);
            expect(text).toContain(weapon.qualities);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Validates: Requirements 9.3
   */
  it('Property 8: No interactive elements in print output', () => {
    fc.assert(
      fc.property(
        arbitraryCharacter(),
        arbitraryArmourPoints,
        fc.integer({ min: 1, max: 30 }),
        (character, armourPoints, totalWounds) => {
          const { container } = render(
            <PrintLayout character={character} totalWounds={totalWounds} armourPoints={armourPoints} />
          );

          // No interactive elements should exist
          expect(container.querySelectorAll('button').length).toBe(0);
          expect(container.querySelectorAll('input').length).toBe(0);
          expect(container.querySelectorAll('select').length).toBe(0);
          expect(container.querySelectorAll('textarea').length).toBe(0);
          expect(container.querySelectorAll('[contenteditable]').length).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});