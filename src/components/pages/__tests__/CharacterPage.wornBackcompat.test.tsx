import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Render test for backward compatibility of the trapping worn feature.
 * Validates: Requirements 7.1
 *
 * Feature: worn-trappings-encumbrance
 *
 * A character saved before this feature has trappings with no `worn` field.
 * Loading such a character SHALL treat every trapping as not worn, so the
 * displayed carried Trappings encumbrance equals the legacy base-Enc × quantity
 * sum (unchanged from before the feature was added).
 *
 * The Trappings carried total is rendered by a TooltipTriggerCell with
 * ariaLabel "Trappings encumbrance breakdown" and displayValue = the total.
 */

// ─── Test Helpers ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    // Legacy trappings: NO `worn` field on any item, none stored on horse.
    trappings: [
      { name: 'Backpack', enc: '2', quantity: 3 },
      { name: 'Rope', enc: '1', quantity: 1 },
    ],
    ...overrides,
  });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}) {
  const updateCharacter = vi.fn();
  const update = vi.fn();
  const char = makeCharacter(overrides);

  const result = render(
    <CharacterPage
      character={char}
      characterId="test-worn-backcompat"
      update={update}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={30}
      coinWeight={0}
      rollHistory={[]}
      addRoll={vi.fn()}
      clearHistory={vi.fn()}
      subTab="gear"
      onSubTabChange={vi.fn()}
    />
  );

  return { ...result, updateCharacter, update, char };
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('CharacterPage backward compatibility (Req 7.1)', () => {
  it('displays the legacy base-Enc total for trappings that lack a worn field', () => {
    renderCharPage();

    // Legacy base-Enc computation: base × quantity summed over non-horse items.
    // Backpack: 2 × 3 = 6, Rope: 1 × 1 = 1 → total 7 (no worn reduction applied).
    const expectedTotal = 2 * 3 + 1 * 1;
    expect(expectedTotal).toBe(7);

    const trappingsCell = screen.getByRole('button', {
      name: 'Trappings encumbrance breakdown',
    });

    expect(trappingsCell).toHaveTextContent(String(expectedTotal));
  });
});
