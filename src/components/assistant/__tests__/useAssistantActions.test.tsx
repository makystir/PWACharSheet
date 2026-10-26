import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { SuggestionAction } from '../../../logic/assistant/types';
import { resolveReminderBaseTarget } from '../../../logic/reminders-target';
import { useAssistantActions } from '../useAssistantActions';
import type { ReminderRollState } from '../useAssistantActions';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...structuredClone(BLANK_CHARACTER),
    name: 'Test Hero',
    ...overrides,
  };
}

describe('useAssistantActions.dispatchAction', () => {
  it('routes a navigate action to the injected navigate(page, subTab)', () => {
    const navigate = vi.fn();
    const openReminderRoll = vi.fn();
    const character = makeCharacter();

    const { result } = renderHook(() =>
      useAssistantActions({ character, navigate, openReminderRoll }),
    );

    const action: SuggestionAction = { kind: 'navigate', page: 'character', subTab: 'notes' };
    result.current(action);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('character', 'notes');
    // The roll path is not touched.
    expect(openReminderRoll).not.toHaveBeenCalled();
  });

  it('forwards an undefined subTab through navigate', () => {
    const navigate = vi.fn();
    const openReminderRoll = vi.fn();
    const character = makeCharacter();

    const { result } = renderHook(() =>
      useAssistantActions({ character, navigate, openReminderRoll }),
    );

    result.current({ kind: 'navigate', page: 'advancement' });
    expect(navigate).toHaveBeenCalledWith('advancement', undefined);
  });

  it('resolves a roll action into the reminder-roll state (baseTarget + descriptor difficulty)', () => {
    const navigate = vi.fn();
    const openReminderRoll = vi.fn<(state: ReminderRollState) => void>();
    const character = makeCharacter();

    const { result } = renderHook(() =>
      useAssistantActions({ character, navigate, openReminderRoll }),
    );

    const action: SuggestionAction = {
      kind: 'roll',
      test: {
        def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
        difficulty: 'Challenging',
        rollName: 'Endurance (resist Corruption)',
      },
    };
    result.current(action);

    // The target is resolved via the SHARED resolver, not re-derived here.
    const expectedTarget = resolveReminderBaseTarget(character, action.test.def);
    expect(openReminderRoll).toHaveBeenCalledTimes(1);
    expect(openReminderRoll).toHaveBeenCalledWith({
      name: 'Endurance (resist Corruption)',
      baseTarget: expectedTarget,
      difficulty: 'Challenging',
    });
    // Navigation is not touched for a roll.
    expect(navigate).not.toHaveBeenCalled();
  });

  it('never mutates the character and never calls an advance/apply/mutation handler', () => {
    const navigate = vi.fn();
    const openReminderRoll = vi.fn();
    const character = makeCharacter({ xpCur: 100, corr: 5 });
    const snapshot = structuredClone(character);

    const { result } = renderHook(() =>
      useAssistantActions({ character, navigate, openReminderRoll }),
    );

    result.current({ kind: 'navigate', page: 'advancement' });
    result.current({
      kind: 'roll',
      test: {
        def: { kind: 'characteristic', char: 'T' },
        difficulty: 'Average',
        rollName: 'Toughness',
      },
    });

    // Dispatcher only routes/seeds — the character is untouched.
    expect(character).toEqual(snapshot);
  });
});
