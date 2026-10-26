import { useCallback } from 'react';
import type { Character } from '../../types/character';
import type { PageSection } from '../layout/navItems';
import type { DifficultyLevel } from '../../logic/dice-roller';
import type { SuggestionAction } from '../../logic/assistant/types';
import { resolveReminderBaseTarget } from '../../logic/reminders-target';

/** The shell state a seeded reminder roll opens the `RollDialog` with. */
export interface ReminderRollState {
  name: string;
  baseTarget: number;
  difficulty: DifficultyLevel;
}

export interface UseAssistantActionsArgs {
  /** The active character — used to resolve a roll's base target. */
  character: Character;
  /** The existing navigate(page, subTab) threaded through App.tsx. */
  navigate: (page: PageSection, subTab?: string | null) => void;
  /** Opens the shell's reminder-roll `RollDialog` (mirrors handleRollReminder). */
  openReminderRoll: (state: ReminderRollState) => void;
}

/**
 * Maps a serializable `SuggestionAction` descriptor to the real, player-confirmed
 * app handler already in scope (FR-6). The dispatcher NEVER applies a mutation:
 * `navigate` just routes, and `roll` only SEEDS the shared `RollDialog` exactly
 * as `CombatDashboard.handleRollReminder` does — it does not advance, apply, or
 * mutate the character (design §"The provider, hook, and app-shell wiring").
 */
export function useAssistantActions({
  character,
  navigate,
  openReminderRoll,
}: UseAssistantActionsArgs): (action: SuggestionAction) => void {
  return useCallback(
    (action: SuggestionAction) => {
      switch (action.kind) {
        case 'navigate':
          navigate(action.page, action.subTab);
          break;
        case 'roll': {
          // Mirror CombatDashboard.handleRollReminder: resolve def -> baseTarget
          // and carry the descriptor's difficulty through to RollDialog. The
          // quick-roll { name, baseTarget } path is insufficient (no difficulty,
          // no def resolution), so this uses the dedicated reminder-roll state.
          const baseTarget = resolveReminderBaseTarget(character, action.test.def);
          openReminderRoll({
            name: action.test.rollName,
            baseTarget,
            difficulty: action.test.difficulty,
          });
          break;
        }
        default: {
          // Compile-time exhaustiveness guard: any future action.kind the UI
          // does not understand (e.g. from a later async source) is a no-op
          // plus a warning — never a crash (design §"Error handling").
          const _exhaustive: never = action;
          console.warn('Assistant: unknown action', _exhaustive);
        }
      }
    },
    [character, navigate, openReminderRoll],
  );
}
