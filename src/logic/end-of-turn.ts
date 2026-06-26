/**
 * End-of-turn processing logic for combat rounds.
 * Handles automatic condition effects: Bleeding/Ablaze damage,
 * removal of Stunned/Surprised, and round advancement.
 */

export interface EndOfTurnEffect {
  type: 'damage' | 'remove_condition';
  condition: string;
  amount?: number;
  description: string;
}

export interface EndOfTurnResult {
  newWounds: number;
  removedConditions: string[];
  effects: EndOfTurnEffect[];
  roundAdvanced: number;
}

/**
 * Process end-of-turn effects for a character.
 * - Bleeding: reduce wounds by level
 * - Ablaze: reduce wounds by level
 * - Stunned/Surprised: auto-remove
 * - Wounds floor at 0
 * - Skip all damage if wounds already at 0
 */
export function processEndOfTurn(
  currentWounds: number,
  conditions: { name: string; level: number }[],
  currentRound: number
): EndOfTurnResult {
  const effects: EndOfTurnEffect[] = [];
  const removedConditions: string[] = [];
  let newWounds = currentWounds;

  // Process damage conditions (Bleeding and Ablaze) only if wounds > 0
  if (currentWounds > 0) {
    const bleeding = conditions.find(c => c.name === 'Bleeding');
    if (bleeding) {
      effects.push({
        type: 'damage',
        condition: 'Bleeding',
        amount: bleeding.level,
        description: `Bleeding ${bleeding.level}: lost ${bleeding.level} wound${bleeding.level > 1 ? 's' : ''}`
      });
      newWounds -= bleeding.level;
    }

    const ablaze = conditions.find(c => c.name === 'Ablaze');
    if (ablaze) {
      effects.push({
        type: 'damage',
        condition: 'Ablaze',
        amount: ablaze.level,
        description: `Ablaze ${ablaze.level}: lost ${ablaze.level} wound${ablaze.level > 1 ? 's' : ''}`
      });
      newWounds -= ablaze.level;
    }

    // Floor wounds at 0
    newWounds = Math.max(0, newWounds);
  }

  // Auto-remove Stunned and Surprised regardless of wound state
  const stunned = conditions.find(c => c.name === 'Stunned');
  if (stunned) {
    removedConditions.push('Stunned');
    effects.push({
      type: 'remove_condition',
      condition: 'Stunned',
      description: 'Stunned removed automatically'
    });
  }

  const surprised = conditions.find(c => c.name === 'Surprised');
  if (surprised) {
    removedConditions.push('Surprised');
    effects.push({
      type: 'remove_condition',
      condition: 'Surprised',
      description: 'Surprised removed automatically'
    });
  }

  return {
    newWounds,
    removedConditions,
    effects,
    roundAdvanced: currentRound + 1
  };
}
