import { RUNE_CATALOGUE } from '../data/runes';
import type { RuneDefinition } from '../data/runes';
import type { DoomRuneActivation, Talent } from '../types/character';

const DOOM_RUNE_IDS = [
  'rune-of-hearth-and-home',
  'rune-of-oath-and-steel',
  'rune-of-wrath-and-ruin',
] as const;

/**
 * Returns all 3 doom runes if the character knows any master rune, else empty array.
 *
 * A character qualifies for doom runes when their knownRunes list contains
 * at least one rune whose RuneDefinition has isMaster === true.
 */
export function getDoomRunesForCharacter(knownRunes: string[]): RuneDefinition[] {
  const knowsMaster = knownRunes.some(id => {
    const rune = RUNE_CATALOGUE.find(r => r.id === id);
    return rune?.isMaster === true;
  });

  if (!knowsMaster) {
    return [];
  }

  return RUNE_CATALOGUE.filter(r => r.category === 'doom');
}

/**
 * Returns true if character has Master Rune Magic talent and does not already
 * know all doom runes. Used to trigger auto-learning of doom runes.
 */
export function shouldAutoLearnDoomRunes(knownRunes: string[], talents: Talent[]): boolean {
  const hasMasterRuneMagic = talents.some(t => t.n.startsWith('Master Rune Magic'));

  if (!hasMasterRuneMagic) {
    return false;
  }

  const knowsAllDoom = DOOM_RUNE_IDS.every(id => knownRunes.includes(id));
  return !knowsAllDoom;
}

/**
 * Activates a doom rune for the current session.
 *
 * Rejects if the rune has already been activated this session (duplicate entry
 * in currentActivations). Otherwise appends a new activation entry.
 */
export function activateDoomRune(
  runeId: string,
  currentActivations: DoomRuneActivation[]
): { success: boolean; error?: string; activation?: DoomRuneActivation } {
  if (isDoomRuneUsedThisSession(runeId, currentActivations)) {
    return {
      success: false,
      error: 'This Doom Rune has already been activated this session.',
    };
  }

  const rune = RUNE_CATALOGUE.find(r => r.id === runeId);
  const runeName = rune?.name ?? runeId;

  const activation: DoomRuneActivation = {
    runeId,
    timestamp: Date.now(),
    label: `Doom Rune activation: ${runeName}`,
  };

  return { success: true, activation };
}

/**
 * Checks whether a doom rune has already been used in the current session.
 */
export function isDoomRuneUsedThisSession(
  runeId: string,
  activations: DoomRuneActivation[]
): boolean {
  return activations.some(a => a.runeId === runeId);
}
