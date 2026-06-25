import type { Character, YenluiState } from '../types/character';
import { isElf } from './endeavours';

/** Allowed Yenlui state values for validation. */
const VALID_STATES: YenluiState[] = ['light', 'balanced', 'dark'];

/**
 * Normalize a potentially invalid stored value to a valid YenluiState or undefined.
 * Any value not in the allowed set is treated as undefined.
 */
export function normalizeYenluiState(value: unknown): YenluiState | undefined {
  if (typeof value === 'string' && VALID_STATES.includes(value as YenluiState)) {
    return value as YenluiState;
  }
  return undefined;
}

/**
 * Determine if the Yenlui panel should be visible for a character.
 * Visible only when useYenlui house rule is enabled AND the character is an Elf.
 */
export function isYenluiVisible(character: Character): boolean {
  return character.houseRules.useYenlui === true && isElf(character.species);
}

/** Sword-dancing difficulty information. */
export interface DifficultyInfo {
  label: string;
  modifier: string;
}

/**
 * Compute sword-dancing difficulty based on Yenlui state and talents.
 * Returns Very Hard (-30) only when state is 'dark' AND character lacks
 * "Sanctuary of the Mind" at level 3 or higher.
 */
export function getYenluiDifficulty(character: Character): DifficultyInfo {
  const sanctuaryTalent = character.talents.find(t => t.n === 'Sanctuary of the Mind');
  if (sanctuaryTalent && sanctuaryTalent.lvl >= 3) {
    return { label: 'Challenging', modifier: '(+0)' };
  }

  if (character.yenluiState === 'dark') {
    return { label: 'Very Hard', modifier: '(-30)' };
  }

  return { label: 'Challenging', modifier: '(+0)' };
}

/** A note describing how a specific talent interacts with the Yenlui system. */
export interface TalentNote {
  talentName: string;
  note: string;
}

/**
 * Get Yenlui-relevant talent notes for the character.
 * Returns notes for qualifying talents only:
 * - "Blood of Aenarion" (present) → weekly Cool Test warning
 * - "Cadai Meditation" (present) → daily Pray Test opportunity
 * - "Sanctuary of the Mind" at level ≥ 3 → negates Dark penalty
 * Returns an empty array when no qualifying talents are present.
 */
export function getYenluiTalentNotes(character: Character): TalentNote[] {
  const notes: TalentNote[] = [];

  if (character.talents.some(t => t.n === 'Blood of Aenarion')) {
    notes.push({
      talentName: 'Blood of Aenarion',
      note: 'Weekly Average (+20) Cool Test required or Yenlui shifts to Dark.',
    });
  }

  if (character.talents.some(t => t.n === 'Cadai Meditation')) {
    notes.push({
      talentName: 'Cadai Meditation',
      note: 'Daily meditation (1hr+) with Average (+20) Pray Test can shift Yenlui to Light.',
    });
  }

  const sanctuary = character.talents.find(t => t.n === 'Sanctuary of the Mind');
  if (sanctuary && sanctuary.lvl >= 3) {
    notes.push({
      talentName: 'Sanctuary of the Mind',
      note: 'Negates the -30 Yenlui (Dark) penalty to sword-dancing difficulty.',
    });
  }

  return notes;
}

/** State display metadata — label and roleplaying description (≤120 chars each). */
export const YENLUI_STATE_META: Record<string, { label: string; description: string }> = {
  light: {
    label: 'Light',
    description: 'Soul drawn toward purity, restraint, and the Cadai. Sword-dancing flows freely.',
  },
  balanced: {
    label: 'Balanced',
    description: 'Harmony between light and dark. The ideal Elven state of spiritual equilibrium.',
  },
  dark: {
    label: 'Dark',
    description: 'Soul drawn toward excess and the Cytharai. Sword-dancing suffers (-30 penalty).',
  },
};
