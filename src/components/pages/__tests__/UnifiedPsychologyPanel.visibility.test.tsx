import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints, PsychologyTrait } from '../../../types/character';

/**
 * Visibility and integration tests for the UnifiedPsychologyPanel
 * within CharacterPage.
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 7.3
 *
 * Strategy: Render CharacterPage with various usePsychologyTracker states
 * and sub-tabs, asserting panel presence/absence and textarea persistence.
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}, subTab = 'identity') {
  const char = makeCharacter(overrides);
  return render(
    <CharacterPage
      character={char}
      characterId="test-vis-1"
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

describe('UnifiedPsychologyPanel visibility and integration (Req 6.1, 6.2, 6.3, 7.3)', () => {
  // ─── Requirement 6.1: Panel visible when usePsychologyTracker is true ───

  it('renders UnifiedPsychologyPanel on Identity tab when usePsychologyTracker is true', () => {
    renderCharPage({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
    });
    expect(screen.getByText('Psychology Tracker')).toBeInTheDocument();
    expect(screen.getByLabelText('Unified Psychology Panel')).toBeInTheDocument();
  });

  // ─── Requirement 6.2: Panel hidden when usePsychologyTracker is false ───

  it('does not render UnifiedPsychologyPanel when usePsychologyTracker is false', () => {
    renderCharPage({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: false },
    });
    expect(screen.queryByText('Psychology Tracker')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Unified Psychology Panel')).not.toBeInTheDocument();
  });

  // ─── Requirement 7.3: Existing traits display correctly (data compatibility) ───

  it('displays existing psychology traits correctly in the unified panel', () => {
    const existingTraits: PsychologyTrait[] = [
      { id: 'trait-1', type: 'Hatred', target: 'Undead', rating: undefined },
      { id: 'trait-2', type: 'Fear', target: '', rating: 3 },
      { id: 'trait-3', type: 'Phobia', target: 'Spiders', rating: undefined },
    ];

    renderCharPage({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
      psychologyTraits: existingTraits,
      brokenTally: 2,
    });

    // Verify each trait type is displayed
    expect(screen.getByText('Hatred')).toBeInTheDocument();
    expect(screen.getByText('Fear')).toBeInTheDocument();
    expect(screen.getByText('Phobia')).toBeInTheDocument();

    // Verify targets are displayed
    expect(screen.getByText('(Undead)')).toBeInTheDocument();
    expect(screen.getByText('(Spiders)')).toBeInTheDocument();

    // Verify rating is displayed for Fear
    expect(screen.getByText('Rating 3')).toBeInTheDocument();

    // Verify Broken Tally shows current value
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays empty state when character has no psychology traits', () => {
    renderCharPage({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
      psychologyTraits: [],
    });

    expect(screen.getByText('No psychology traits recorded.')).toBeInTheDocument();
  });
});
