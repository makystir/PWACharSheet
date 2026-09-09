import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { InitiativeRollResult } from '../../../logic/initiative';

// ─── Mocks ───────────────────────────────────────────────────────────────────
//
// InitiativeTracker calls rollInitiative() without an injected die function, so
// it uses Math.random internally. To assert the exact value that lands in the
// input before commit, mock rollInitiative to a fixed InitiativeRollResult.
// appendEvent is mocked so we can assert a `combat` event is appended on roll.

const FIXED_ROLL: InitiativeRollResult = {
  value: 11,
  die: 7,
  formula: 'initiativePlusD10',
  breakdown: 'Ibonus 4 + d10(7) = 11',
};

vi.mock('../../../logic/initiative', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../logic/initiative')>();
  return {
    ...actual,
    rollInitiative: vi.fn(() => FIXED_ROLL),
  };
});

vi.mock('../../../logic/event-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../logic/event-log')>();
  return {
    ...actual,
    appendEvent: vi.fn((character: Character) => character),
  };
});

import { InitiativeTracker } from '../InitiativeTracker';
import { rollInitiative } from '../../../logic/initiative';
import { appendEvent } from '../../../logic/event-log';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

/**
 * Render the tracker with a controlled character. `updateCharacter` invokes the
 * supplied mutator (as the real app wiring does) so that appendEvent — which the
 * component calls inside the mutator — actually runs and can be asserted.
 */
function renderTracker(initial?: Character) {
  const character = initial ?? makeCharacter();
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    mutator(character);
  });
  const utils = render(
    <InitiativeTracker character={character} updateCharacter={updateCharacter} />,
  );
  return { updateCharacter, character, ...utils };
}

const rollBtn = () => screen.getByRole('button', { name: /roll initiative/i });
const initInput = () => screen.getByPlaceholderText('Init') as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 7.3: Roll fills input before commit (Req 4.1, 4.2, 4.7) ─────────────────

describe('InitiativeTracker — Roll Initiative fills input before commit', () => {
  it('renders a Roll Initiative control', () => {
    renderTracker();
    expect(rollBtn()).toBeInTheDocument();
  });

  it('populates the initiative input with the formula result on roll', () => {
    renderTracker();
    expect(initInput().value).toBe('');
    fireEvent.click(rollBtn());
    expect(initInput().value).toBe(String(FIXED_ROLL.value));
  });

  it('rolls using the configured house-rule formula and the character', () => {
    const character = makeCharacter();
    character.houseRules.initiativeFormula = 'initiativePlusD10';
    renderTracker(character);
    fireEvent.click(rollBtn());
    expect(rollInitiative).toHaveBeenCalledWith('initiativePlusD10', character);
  });

  it('does NOT commit the rolled value to the combatant list (input only)', () => {
    const { updateCharacter } = renderTracker();
    fireEvent.click(rollBtn());
    // The value is in the input, but no combatant has been added to the list.
    // updateCharacter is only invoked for the event-log append, never with a
    // mutator that grows initiativeList.
    const grewList = updateCharacter.mock.calls.some(([mutator]) => {
      const before = makeCharacter();
      const after = (mutator as (c: Character) => Character)(before);
      return (after.initiativeList ?? []).length > (before.initiativeList ?? []).length;
    });
    expect(grewList).toBe(false);
  });

  it('shows the rolled breakdown while awaiting commit (calculated-total tooltip)', () => {
    renderTracker();
    fireEvent.click(rollBtn());
    expect(screen.getByText('Rolled')).toBeInTheDocument();
    // The rolled value is surfaced as a tooltip trigger for the breakdown.
    expect(
      screen.getByLabelText(`Initiative roll ${FIXED_ROLL.value}. Show breakdown.`),
    ).toBeInTheDocument();
  });
});

// ─── 7.3: Per-combatant roll works (Req 4.3) ─────────────────────────────────

describe('InitiativeTracker — per-combatant roll and commit', () => {
  it('rolled value can be committed as a combatant via Add', () => {
    const { updateCharacter } = renderTracker();
    // Provide a name so the form is valid, then roll to fill the initiative.
    fireEvent.change(screen.getByPlaceholderText('e.g. Goblin #1'), {
      target: { value: 'Goblin #1' },
    });
    fireEvent.click(rollBtn());
    expect(initInput().value).toBe(String(FIXED_ROLL.value));

    fireEvent.click(screen.getByRole('button', { name: /add combatant/i }));

    // Find the add mutator and verify it appends a combatant with the rolled value.
    const addCall = updateCharacter.mock.calls
      .map(([mutator]) => (mutator as (c: Character) => Character)(makeCharacter()))
      .find((result) => (result.initiativeList ?? []).length > 0);

    expect(addCall).toBeDefined();
    const added = addCall!.initiativeList![0];
    expect(added.name).toBe('Goblin #1');
    expect(added.initiative).toBe(FIXED_ROLL.value);
  });
});

// ─── 7.3: A combat event is appended on roll (Req 4.5) ───────────────────────

describe('InitiativeTracker — logs a combat event on roll', () => {
  it('appends a combat.initiative event summarising the roll', () => {
    const { updateCharacter } = renderTracker();
    fireEvent.click(rollBtn());

    expect(appendEvent).toHaveBeenCalledTimes(1);
    const [, input] = (appendEvent as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(input).toMatchObject({
      category: 'combat',
      type: 'combat.initiative',
    });
    expect(input.summary).toContain(FIXED_ROLL.breakdown);
    expect(input.payload).toMatchObject({
      value: FIXED_ROLL.value,
      die: FIXED_ROLL.die,
      formula: FIXED_ROLL.formula,
    });

    // The append is routed through updateCharacter.
    expect(updateCharacter).toHaveBeenCalled();
  });
});
