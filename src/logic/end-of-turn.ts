/**
 * End-of-turn processing logic for combat rounds.
 * Handles automatic condition effects: Bleeding/Ablaze damage,
 * removal of Stunned/Surprised, and round advancement.
 */

export interface EndOfTurnEffect {
  type: 'damage' | 'remove_condition' | 'reminder';
  condition: string;
  amount?: number;
  d10Roll?: number;
  description: string;
}

export interface EndOfTurnResult {
  newWounds: number;
  removedConditions: string[];
  effects: EndOfTurnEffect[];
  roundAdvanced: number;
}

export interface EndOfTurnParams {
  currentWounds: number;
  conditions: { name: string; level: number }[];
  currentRound: number;
  tb: number;
  lowestAP: number;
  injectedD10?: number;
}

/**
 * Process end-of-turn effects for a character.
 * - Bleeding: reduce wounds by level (flat damage)
 * - Ablaze: reduce wounds by d10 + (level-1) - TB - lowestAP (min 1)
 * - Poisoned: reduce wounds by level (flat damage, like Bleeding)
 * - Stunned: emit reminder (NOT auto-removed; requires Endurance Test)
 * - Surprised: auto-remove
 * - Broken/Blinded/Deafened: emit reminders
 * - Wounds floor at 0
 * - Skip all damage if wounds already at 0
 */
export interface CharacterCombatState {
  wounds: number;
  conditions: { name: string; level: number }[];
  currentRound: number;
}

/**
 * Apply a pre-computed EndOfTurnResult to character combat state.
 * Sets wounds to result.newWounds, removes conditions listed in
 * result.removedConditions, and sets round to result.roundAdvanced.
 */
export function applyEndOfTurnResult(
  state: CharacterCombatState,
  result: EndOfTurnResult
): CharacterCombatState {
  const remainingConditions = state.conditions.filter(
    (c) => !result.removedConditions.includes(c.name)
  );

  return {
    wounds: result.newWounds,
    conditions: remainingConditions,
    currentRound: result.roundAdvanced,
  };
}

export function processEndOfTurn(params: EndOfTurnParams): EndOfTurnResult {
  const { currentWounds, conditions, currentRound, tb, lowestAP, injectedD10 } = params;
  const effects: EndOfTurnEffect[] = [];
  const removedConditions: string[] = [];
  let newWounds = currentWounds;

  // Process damage conditions (Bleeding, Ablaze, Poisoned) only if wounds > 0
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
      const d10Roll = injectedD10 ?? Math.floor(Math.random() * 10) + 1;
      const rawDamage = d10Roll + (ablaze.level - 1) - tb - lowestAP;
      const finalDamage = Math.max(1, rawDamage);
      effects.push({
        type: 'damage',
        condition: 'Ablaze',
        amount: finalDamage,
        d10Roll,
        description: `Ablaze ${ablaze.level}: rolled ${d10Roll} + ${ablaze.level - 1} - ${tb} TB - ${lowestAP} AP = ${finalDamage} wound${finalDamage > 1 ? 's' : ''}`
      });
      newWounds -= finalDamage;
    }

    const poisoned = conditions.find(c => c.name === 'Poisoned');
    if (poisoned) {
      effects.push({
        type: 'damage',
        condition: 'Poisoned',
        amount: poisoned.level,
        description: `Poisoned ${poisoned.level}: lost ${poisoned.level} wound${poisoned.level > 1 ? 's' : ''}`
      });
      newWounds -= poisoned.level;
    }

    // Floor wounds at 0
    newWounds = Math.max(0, newWounds);
  }

  // Stunned: emit reminder (requires Endurance Test to remove)
  const stunned = conditions.find(c => c.name === 'Stunned');
  if (stunned) {
    effects.push({
      type: 'reminder',
      condition: 'Stunned',
      description: 'Endurance Test (Challenging +0) required to remove'
    });
  }

  // Surprised: auto-remove (correct per RAW)
  const surprised = conditions.find(c => c.name === 'Surprised');
  if (surprised) {
    removedConditions.push('Surprised');
    effects.push({
      type: 'remove_condition',
      condition: 'Surprised',
      description: 'Surprised removed automatically'
    });
  }

  // Poisoned reminder (in addition to damage above)
  const poisoned = conditions.find(c => c.name === 'Poisoned');
  if (poisoned) {
    effects.push({
      type: 'reminder',
      condition: 'Poisoned',
      description: 'Endurance Test to remove (each SL removes extra)'
    });
  }

  // Broken reminder
  const broken = conditions.find(c => c.name === 'Broken');
  if (broken) {
    effects.push({
      type: 'reminder',
      condition: 'Broken',
      description: 'Cool Test to remove'
    });
  }

  // Blinded reminder
  const blinded = conditions.find(c => c.name === 'Blinded');
  if (blinded) {
    effects.push({
      type: 'reminder',
      condition: 'Blinded',
      description: '1 level removed every other round'
    });
  }

  // Deafened reminder
  const deafened = conditions.find(c => c.name === 'Deafened');
  if (deafened) {
    effects.push({
      type: 'reminder',
      condition: 'Deafened',
      description: '1 level removed every other round'
    });
  }

  return {
    newWounds,
    removedConditions,
    effects,
    roundAdvanced: currentRound + 1
  };
}
