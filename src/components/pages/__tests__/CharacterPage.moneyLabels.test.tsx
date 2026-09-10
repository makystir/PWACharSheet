import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Render/label + id-stability tests for the money-locations-clarity feature,
 * Character-page surfaces (money-locations-clarity Task 8).
 *
 * Validates: Requirements 1.1, 1.3, 4.1, 4.3, 7.2
 *
 * Req 1.1 / 1.3 / 7.2 — the Character gear sub-tab is labelled "Gear" (not the
 *   old "Gear & Wealth"), reached via role="tab", while the routing id 'gear'
 *   is unchanged (the tab still selects the gear content).
 * Req 4.1 / 4.3 — the Coin Purse card shows the Treasury cross-reference hint
 *   unconditionally, and its "Coin Purse (carried)" title is unchanged.
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

/**
 * Render CharacterPage on a given sub-tab. Passing an explicit `subTab` lets us
 * assert the gear-sub-tab content (Coin Purse card + hint) without a click.
 */
function renderCharPage(overrides: Partial<Character> = {}, subTab?: string) {
  const char = makeCharacter(overrides);
  return render(
    <CharacterPage
      character={char}
      characterId="test-char-1"
      update={vi.fn()}
      updateCharacter={vi.fn()}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={30}
      coinWeight={0}
      rollHistory={[]}
      addRoll={vi.fn()}
      clearHistory={vi.fn()}
      subTab={subTab}
      onSubTabChange={vi.fn()}
    />
  );
}

describe('CharacterPage money labels (money-locations-clarity Task 8)', () => {
  // ─── Req 1.1 / 1.3 / 7.2: gear sub-tab label ───
  describe('gear sub-tab label', () => {
    it('renders a sub-tab labelled "Gear"', () => {
      renderCharPage();
      expect(screen.getByRole('tab', { name: 'Gear' })).toBeInTheDocument();
    });

    it('does not render the old "Gear & Wealth" label', () => {
      renderCharPage();
      expect(screen.queryByText('Gear & Wealth')).not.toBeInTheDocument();
    });

    it('the "Gear" tab keeps the id \'gear\' (selecting it shows gear content)', () => {
      // subTab='gear' drives the gear content; the Coin Purse card living there
      // confirms the id 'gear' still resolves to the gear sub-tab (Req 7.2).
      renderCharPage({}, 'gear');
      expect(screen.getByRole('heading', { name: 'Coin Purse (carried)' })).toBeInTheDocument();
    });
  });

  // ─── Req 4.1 / 4.3: Coin Purse card + Treasury cross-reference hint ───
  describe('Coin Purse card cross-reference hint', () => {
    it('shows the Treasury hint unconditionally on the gear sub-tab', () => {
      renderCharPage({}, 'gear');
      expect(
        screen.getByText('Estate funds are stored in the Treasury (Estate page).')
      ).toBeInTheDocument();
    });

    it('keeps the "Coin Purse (carried)" card title unchanged', () => {
      renderCharPage({}, 'gear');
      expect(screen.getByRole('heading', { name: 'Coin Purse (carried)' })).toBeInTheDocument();
    });

    it('shows the hint even when both money pools are empty (unconditional)', () => {
      // BLANK_CHARACTER already has zeroed wealth + treasury; assert the hint is
      // present regardless of balances (Design Decision 1 — character.estate is
      // always present, so the hint is never gated away).
      renderCharPage({ wGC: 0, wSS: 0, wD: 0 }, 'gear');
      expect(
        screen.getByText('Estate funds are stored in the Treasury (Estate page).')
      ).toBeInTheDocument();
    });
  });
});
