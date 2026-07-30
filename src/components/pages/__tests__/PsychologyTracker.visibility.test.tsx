import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Conditional visibility tests for PsychologyTracker on the Identity tab.
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4
 *
 * Strategy: Render CharacterPage on the Identity sub-tab with
 * usePsychologyTracker toggled on/off and assert the "Psychology Tracker"
 * CollapsibleSection is present or absent from the DOM.
 */

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({ ...BLANK_CHARACTER, ...overrides });
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function renderCharPage(overrides: Partial<Character> = {}) {
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
      subTab="identity"
      onSubTabChange={vi.fn()}
    />
  );
}

describe('PsychologyTracker conditional visibility (Req 3.1–3.4)', () => {
  // ─── Requirement 3.1: Renders when usePsychologyTracker is true ───

  it('renders PsychologyTracker when usePsychologyTracker is true', () => {
    renderCharPage({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
    });
    expect(screen.getByText('Psychology Tracker')).toBeInTheDocument();
  });

  // ─── Requirement 3.2: Renders zero DOM elements when usePsychologyTracker is false ───

  it('renders zero DOM elements for tracker when usePsychologyTracker is false', () => {
    renderCharPage({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: false },
    });
    expect(screen.queryByText('Psychology Tracker')).not.toBeInTheDocument();
  });

  // ─── Requirement 3.3: Toggling on immediately shows tracker ───

  it('toggling on immediately shows tracker without page refresh', () => {
    const charOff = makeCharacter({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: false },
    });
    const charOn = makeCharacter({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
    });

    const { rerender } = render(
      <CharacterPage
        character={charOff}
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
        subTab="identity"
        onSubTabChange={vi.fn()}
      />
    );

    // Initially not rendered
    expect(screen.queryByText('Psychology Tracker')).not.toBeInTheDocument();

    // Rerender with toggle on — simulates state change without page refresh
    rerender(
      <CharacterPage
        character={charOn}
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
        subTab="identity"
        onSubTabChange={vi.fn()}
      />
    );

    expect(screen.getByText('Psychology Tracker')).toBeInTheDocument();
  });

  // ─── Requirement 3.4: Toggling off immediately removes tracker ───

  it('toggling off immediately removes tracker without page refresh', () => {
    const charOn = makeCharacter({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: true },
    });
    const charOff = makeCharacter({
      houseRules: { ...BLANK_CHARACTER.houseRules, usePsychologyTracker: false },
    });

    const { rerender } = render(
      <CharacterPage
        character={charOn}
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
        subTab="identity"
        onSubTabChange={vi.fn()}
      />
    );

    // Initially rendered
    expect(screen.getByText('Psychology Tracker')).toBeInTheDocument();

    // Rerender with toggle off — simulates state change without page refresh
    rerender(
      <CharacterPage
        character={charOff}
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
        subTab="identity"
        onSubTabChange={vi.fn()}
      />
    );

    expect(screen.queryByText('Psychology Tracker')).not.toBeInTheDocument();
  });
});
