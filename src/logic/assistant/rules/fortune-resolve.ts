import type { Character } from '../../../types/character';
import type { Suggestion } from '../types';

/**
 * Unspent Fortune / Resolve nudge (Character Assistant catalog §1). Reads the
 * stored pools directly — the fortune-resolve.ts helpers are spend/burn
 * MUTATORS, not read predicates, so the trigger is a plain `> 0` read,
 * consistent with how the engine reads `xpCur`. This module invents no
 * mechanic; it only points the player at the existing spend UI.
 *
 * Core p.169 (Fortune & Fate — Spending Fortune): spend a Fortune point to
 * reroll a failed Test, add +1 SL to a successful one, or act out of Initiative
 * order. Core p.170 (Resilience & Resolve — Spending Resolve): spend a Resolve
 * point for immunity to Psychology until the end of the next Round, to ignore a
 * Critical Wound's modifiers for one Round, or to end a Condition.
 *
 * Emits up to two independent suggestions (one per non-empty pool) so a player
 * with only Fortune never sees a Resolve nudge.
 */
export function fortuneResolveSuggestions(character: Character): Suggestion[] {
  const out: Suggestion[] = [];

  if (character.fortune > 0) {
    out.push({
      // Core p.169: Spending Fortune
      id: 'resource:fortune-available',
      title: `You have ${character.fortune} Fortune available`,
      rationale: 'Spend Fortune to reroll a failed Test or add +1 SL.',
      category: 'resource',
      urgency: 'info',
      action: { kind: 'navigate', page: 'combat' },
      citation: 'Core p.169: Spending Fortune',
    });
  }

  if (character.resolve > 0) {
    out.push({
      // Core p.170: Spending Resolve
      id: 'resource:resolve-available',
      title: `You have ${character.resolve} Resolve available`,
      rationale:
        'Spend Resolve for immunity to Psychology until end of next round, or to remove Conditions.',
      category: 'resource',
      urgency: 'info',
      action: { kind: 'navigate', page: 'combat' },
      citation: 'Core p.170: Spending Resolve',
    });
  }

  return out;
}
