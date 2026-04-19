import type { Character, CharacteristicKey, AdvancementEntry, Skill, CareerScheme, CareerLevel } from '../types/character';
import { CAREER_SCHEMES } from '../data/careers';

/** A skill entry tagged with its original array index, type, and career status for sorted rendering. */
export interface SortedSkillEntry {
  skill: Skill;
  originalIndex: number;
  isBasic: boolean;
  inCareer: boolean;
}

/**
 * Merge basic and advanced skills into a single sorted array grouped by career status.
 * In-career skills appear first, then out-of-career. Within each group, skills are sorted
 * alphabetically by name. Empty-name advanced skills are filtered out.
 * Does not mutate the input arrays.
 */
export function sortSkillsByCareerStatus(
  bSkills: Skill[],
  aSkills: Skill[],
  careerSkills: string[]
): SortedSkillEntry[] {
  const entries: SortedSkillEntry[] = [];

  // Tag basic skills
  bSkills.forEach((skill, i) => {
    entries.push({
      skill,
      originalIndex: i,
      isBasic: true,
      inCareer: careerSkills.some(cs => careerSkillMatches(cs, skill.n)),
    });
  });

  // Tag advanced skills (skip empty-name entries)
  aSkills.forEach((skill, i) => {
    if (skill.n === '') return;
    entries.push({
      skill,
      originalIndex: i,
      isBasic: false,
      inCareer: careerSkills.some(cs => careerSkillMatches(cs, skill.n)),
    });
  });

  // Sort: in-career first, then alphabetically by name within each group
  entries.sort((a, b) => {
    if (a.inCareer !== b.inCareer) return a.inCareer ? -1 : 1;
    return a.skill.n.localeCompare(b.skill.n);
  });

  return entries;
}

/**
 * WFRP 4e XP cost tables from the Core Rulebook (pp. 44-45).
 * Characteristics and skills have different cost progressions.
 * Talents cost 100 × (times taken + 1).
 */
const CHAR_COST_TABLE: [number, number][] = [
  [5, 25], [10, 30], [15, 40], [20, 50], [25, 70], [30, 90], [35, 120],
  [40, 150], [45, 190], [50, 230], [55, 280], [60, 330], [65, 390], [70, 450],
];
const CHAR_MAX_COST = 520; // 70+

const SKILL_COST_TABLE: [number, number][] = [
  [5, 10], [10, 15], [15, 20], [20, 30], [25, 40], [30, 60], [35, 80],
  [40, 110], [45, 140], [50, 180], [55, 220], [60, 270], [65, 320], [70, 380],
];
const SKILL_MAX_COST = 440; // 70+

/**
 * Get the base XP cost for a single advance at the given current advance count.
 * Doubles the cost if out-of-career.
 */
export function getAdvancementCost(
  type: string,
  currentAdvances: number,
  inCareer: boolean
): number {
  let baseCost: number;

  if (type === 'characteristic') {
    baseCost = CHAR_MAX_COST;
    for (const [threshold, cost] of CHAR_COST_TABLE) {
      if (currentAdvances <= threshold) {
        baseCost = cost;
        break;
      }
    }
  } else if (type === 'skill') {
    baseCost = SKILL_MAX_COST;
    for (const [threshold, cost] of SKILL_COST_TABLE) {
      if (currentAdvances <= threshold) {
        baseCost = cost;
        break;
      }
    }
  } else if (type === 'talent') {
    baseCost = 100 * (currentAdvances + 1);
  } else {
    return 0;
  }

  return inCareer ? baseCost : baseCost * 2;
}

/**
 * Calculate how many advances can be purchased within a budget.
 * Returns the count and total cost.
 */
export function calculateBulkAdvancement(
  type: string,
  currentAdvances: number,
  availableXP: number,
  inCareer: boolean,
  maxBulk: number
): { count: number; totalCost: number } {
  let count = 0;
  let totalCost = 0;
  let advances = currentAdvances;

  while (count < maxBulk) {
    const cost = getAdvancementCost(type, advances, inCareer);
    if (totalCost + cost > availableXP) break;
    totalCost += cost;
    advances++;
    count++;
  }

  return { count, totalCost };
}

/**
 * Determine the earliest future career level where a target becomes in-career.
 *
 * @param careerName - The career name to look up in CAREER_SCHEMES
 * @param currentLevel - The character's current level number (1–4)
 * @param target - The advancement target to check
 * @returns The earliest future level number (2, 3, or 4) where the target
 *          becomes in-career, or null if it doesn't appear in any future level.
 */
export function getFutureCareerLevel(
  careerName: string,
  currentLevel: number,
  target:
    | { type: 'characteristic'; key: CharacteristicKey }
    | { type: 'skill'; name: string }
    | { type: 'talent'; name: string }
): number | null {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return null;

  if (currentLevel >= 4) return null;

  for (let level = currentLevel + 1; level <= 4; level++) {
    const careerLevel = scheme[`level${level}` as keyof CareerScheme] as CareerLevel;

    switch (target.type) {
      case 'characteristic':
        if (careerLevel.characteristics.includes(target.key)) return level;
        break;
      case 'skill':
        if (careerLevel.skills.some(cs => careerSkillMatches(cs, target.name))) return level;
        break;
      case 'talent':
        if (careerLevel.talents.includes(target.name)) return level;
        break;
    }
  }

  return null;
}

/**
 * Check whether a character has any talent that grants spellcasting ability.
 * Qualifying talents: Arcane Magic (Any), Petty Magic, Bless (Any), Invoke (Any).
 */
export function hasSpellcastingTalent(character: Character): boolean {
  return character.talents.some(t =>
    t.n.startsWith('Arcane Magic') ||
    t.n === 'Petty Magic' ||
    t.n.startsWith('Bless') ||
    t.n.startsWith('Invoke')
  );
}

/**
 * Check whether a character has any talent that grants rune magic ability.
 * Qualifying talents: Rune Magic (Any), Master Rune Magic (Any).
 */
export function hasRuneMagicTalent(character: Character): boolean {
  return character.talents.some(t =>
    t.n.startsWith('Rune Magic') ||
    t.n.startsWith('Master Rune Magic')
  );
}

/**
 * Apply a single characteristic advance, deduct XP, and log the entry.
 */
export function advanceCharacteristic(
  character: Character,
  charKey: CharacteristicKey,
  inCareer: boolean
): Character {
  const currentAdvances = character.chars[charKey].a;
  const cost = getAdvancementCost('characteristic', currentAdvances, inCareer);

  if (character.xpCur < cost) return { ...character };

  const newChars = { ...character.chars };
  newChars[charKey] = { ...newChars[charKey], a: currentAdvances + 1 };

  const entry: AdvancementEntry = {
    timestamp: Date.now(),
    type: 'characteristic',
    name: charKey,
    from: currentAdvances,
    to: currentAdvances + 1,
    xpCost: cost,
    careerLevel: character.careerLevel,
    inCareer,
  };

  return {
    ...character,
    chars: newChars,
    xpCur: character.xpCur - cost,
    xpSpent: character.xpSpent + cost,
    advancementLog: [...character.advancementLog, entry],
  };
}

/**
 * Apply a single skill advance, deduct XP, and log the entry.
 */
export function advanceSkill(
  character: Character,
  skillIndex: number,
  isBasic: boolean,
  inCareer: boolean
): Character {
  const skills = isBasic ? character.bSkills : character.aSkills;
  if (skillIndex < 0 || skillIndex >= skills.length) return { ...character };

  const skill = skills[skillIndex];
  const cost = getAdvancementCost('skill', skill.a, inCareer);

  if (character.xpCur < cost) return { ...character };

  const newSkills = [...skills];
  newSkills[skillIndex] = { ...skill, a: skill.a + 1 };

  const entry: AdvancementEntry = {
    timestamp: Date.now(),
    type: 'skill',
    name: skill.n,
    from: skill.a,
    to: skill.a + 1,
    xpCost: cost,
    careerLevel: character.careerLevel,
    inCareer,
  };

  const updates: Partial<Character> = {
    xpCur: character.xpCur - cost,
    xpSpent: character.xpSpent + cost,
    advancementLog: [...character.advancementLog, entry],
  };

  if (isBasic) {
    return { ...character, ...updates, bSkills: newSkills };
  } else {
    return { ...character, ...updates, aSkills: newSkills };
  }
}

/**
 * WFRP 4e career completion advance thresholds by level.
 * Level 1 = 5, Level 2 = 10, Level 3 = 15, Level 4 = 20.
 */
const CAREER_COMPLETION_THRESHOLDS: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20 };

/**
 * Check if a career skill name matches a character's skill.
 * Handles grouped skills: career "Melee (Any)" matches character "Melee (Basic)",
 * career "Melee (Basic)" matches character "Melee (Basic)" exactly,
 * and career "Stealth" matches character "Stealth (Urban)" etc.
 */
export function careerSkillMatches(careerSkillName: string, characterSkillName: string): boolean {
  if (careerSkillName === characterSkillName) return true;
  // "(Any)" grouped skill: "Melee (Any)" matches any "Melee (...)"
  if (careerSkillName.includes('(Any)')) {
    const base = careerSkillName.replace('(Any)', '').trim();
    return characterSkillName.startsWith(base + ' (') || characterSkillName === base;
  }
  // Ungrouped career skill matching a specialised character skill:
  // e.g., career "Stealth" matches character "Stealth (Urban)"
  if (!careerSkillName.includes('(') && characterSkillName.startsWith(careerSkillName + ' (')) {
    return true;
  }
  return false;
}

/**
 * Check if a career level is complete per WFRP 4e rules (p.48).
 *
 * To complete a career level, you must have:
 * - The level's required advances (5/10/15/20) in ALL career level characteristics
 * - The level's required advances in at least 8 of the career level's available skills
 * - At least 1 talent from the current career level
 *
 * Skills and talents gained from prior careers count towards completion.
 */
export function isCareerLevelComplete(
  character: Character,
  careerName: string,
  level: number,
): boolean {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return false;

  const careerLevel = scheme[`level${level}` as keyof typeof scheme] as CareerLevel | undefined;
  if (!careerLevel) return false;

  const threshold = CAREER_COMPLETION_THRESHOLDS[level];
  if (!threshold) return false;

  // Check characteristics: ALL must have >= threshold advances
  for (const charKey of careerLevel.characteristics) {
    if (character.chars[charKey].a < threshold) return false;
  }

  // Check skills: at least 8 (or all if fewer than 8) must have >= threshold advances
  const allSkills = [...character.bSkills, ...character.aSkills];
  const requiredSkillCount = Math.min(8, careerLevel.skills.length);
  let matchedSkills = 0;

  for (const careerSkillName of careerLevel.skills) {
    const skill = allSkills.find(s => careerSkillMatches(careerSkillName, s.n));
    if (skill && skill.a >= threshold) {
      matchedSkills++;
    }
  }

  // Check talents: at least 1 from current career level
  const hasTalent = careerLevel.talents.some(tn =>
    character.talents.some(t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' ('))
  );

  return matchedSkills >= requiredSkillCount && hasTalent;
}

/**
 * If the active advancement log exceeds 100 entries, move the oldest
 * entries to the archive, keeping only the 100 most recent in the active log.
 * Merges newly archived entries with existing archive entries, sorted by
 * timestamp ascending.
 * Returns the character unchanged if the log has 100 or fewer entries.
 */
export function archiveOldEntries(character: Character): Character {
  const MAX_ACTIVE = 100;
  if (character.advancementLog.length <= MAX_ACTIVE) return character;

  const overflow = character.advancementLog.length - MAX_ACTIVE;
  const entriesToArchive = character.advancementLog.slice(0, overflow);
  const remainingLog = character.advancementLog.slice(overflow);

  const mergedArchive = [...character.advancementLogArchive, ...entriesToArchive]
    .sort((a, b) => a.timestamp - b.timestamp);

  return {
    ...character,
    advancementLog: remainingLog,
    advancementLogArchive: mergedArchive,
  };
}

/**
 * Remove an entry from the archive by index and append it to the active log.
 * Returns the character unchanged if the index is out of bounds.
 */
export function restoreArchivedEntry(character: Character, archiveIndex: number): Character {
  if (archiveIndex < 0 || archiveIndex >= character.advancementLogArchive.length) {
    return character;
  }

  const entry = character.advancementLogArchive[archiveIndex];
  const newArchive = character.advancementLogArchive.filter((_, i) => i !== archiveIndex);
  const newLog = [...character.advancementLog, entry];

  return {
    ...character,
    advancementLog: newLog,
    advancementLogArchive: newArchive,
  };
}

/** Result of an undo operation */
export interface UndoResult {
  character: Character;
  undoneEntry: AdvancementEntry;
}

/**
 * Undo the most recent advancement log entry.
 * Returns the updated character and the undone entry (for pushing onto redo stack),
 * or null if the advancement log is empty.
 *
 * Handles: characteristic, skill, talent, career_level, career_switch.
 */
export function undoAdvancement(character: Character): UndoResult | null {
  if (character.advancementLog.length === 0) return null;

  const newLog = character.advancementLog.slice(0, -1);
  const entry = character.advancementLog[character.advancementLog.length - 1];
  const delta = entry.to - entry.from;

  const base: Character = {
    ...character,
    xpCur: character.xpCur + entry.xpCost,
    xpSpent: character.xpSpent - entry.xpCost,
    advancementLog: newLog,
  };

  switch (entry.type) {
    case 'characteristic': {
      const key = entry.name as CharacteristicKey;
      const newChars = { ...base.chars };
      newChars[key] = { ...newChars[key], a: newChars[key].a - delta };
      return { character: { ...base, chars: newChars }, undoneEntry: entry };
    }

    case 'skill': {
      const bIdx = base.bSkills.findIndex(s => s.n === entry.name);
      if (bIdx >= 0) {
        const newSkills = [...base.bSkills];
        newSkills[bIdx] = { ...newSkills[bIdx], a: newSkills[bIdx].a - delta };
        return { character: { ...base, bSkills: newSkills }, undoneEntry: entry };
      }
      const aIdx = base.aSkills.findIndex(s => s.n === entry.name);
      if (aIdx >= 0) {
        const newSkills = [...base.aSkills];
        newSkills[aIdx] = { ...newSkills[aIdx], a: newSkills[aIdx].a - delta };
        return { character: { ...base, aSkills: newSkills }, undoneEntry: entry };
      }
      // Skill not found — return with only XP and log changes (defensive)
      return { character: base, undoneEntry: entry };
    }

    case 'talent': {
      const tIdx = base.talents.findIndex(t => t.n === entry.name);
      if (tIdx >= 0) {
        const newLevel = base.talents[tIdx].lvl - delta;
        if (newLevel <= 0) {
          const newTalents = base.talents.filter((_, i) => i !== tIdx);
          return { character: { ...base, talents: newTalents }, undoneEntry: entry };
        }
        const newTalents = [...base.talents];
        newTalents[tIdx] = { ...newTalents[tIdx], lvl: newLevel };
        return { character: { ...base, talents: newTalents }, undoneEntry: entry };
      }
      // Talent not found — return with only XP and log changes (defensive)
      return { character: base, undoneEntry: entry };
    }

    case 'career_level': {
      // entry.name format: "CareerName → LevelTitle"
      // entry.from = previous level number, entry.to = new level number
      const prevLevelNum = entry.from;
      const careerName = entry.name.split(' → ')[0];
      const scheme = CAREER_SCHEMES[careerName];
      if (!scheme) return { character: base, undoneEntry: entry };

      const prevLevel = scheme[`level${prevLevelNum}` as keyof typeof scheme] as CareerLevel | undefined;
      if (!prevLevel) return { character: base, undoneEntry: entry };

      return {
        character: {
          ...base,
          careerLevel: prevLevel.title,
          status: prevLevel.status,
        },
        undoneEntry: entry,
      };
    }

    case 'career_switch': {
      // entry.name format: "OldCareer → NewCareer"
      const parts = entry.name.split(' → ');
      if (parts.length < 2) return null;
      const oldCareerName = parts[0];
      const oldScheme = CAREER_SCHEMES[oldCareerName];
      if (!oldScheme) return null;

      // Determine the old career level from the remaining log entries
      // The last entry before this career_switch would have the careerLevel title
      // from the old career. If no previous entries, default to level1.
      let oldLevelTitle = oldScheme.level1.title;
      let oldStatus = oldScheme.level1.status;
      if (newLog.length > 0) {
        const prevEntry = newLog[newLog.length - 1];
        oldLevelTitle = prevEntry.careerLevel;
        // Look up the status from the scheme
        for (let lvl = 1; lvl <= 4; lvl++) {
          const level = oldScheme[`level${lvl}` as keyof typeof oldScheme] as CareerLevel;
          if (level.title === oldLevelTitle) {
            oldStatus = level.status;
            break;
          }
        }
      }

      // Trim the last segment from careerPath
      const pathParts = base.careerPath.split(' → ');
      const trimmedPath = pathParts.slice(0, -1).join(' → ');

      return {
        character: {
          ...base,
          career: oldCareerName,
          class: oldScheme.class,
          careerLevel: oldLevelTitle,
          status: oldStatus,
          careerPath: trimmedPath,
        },
        undoneEntry: entry,
      };
    }

    default:
      return { character: base, undoneEntry: entry };
  }
}

/** Result of a redo operation */
export interface RedoResult {
  character: Character;
}

/**
 * Redo a previously undone advancement entry.
 * Returns the updated character, or null if xpCur is insufficient.
 *
 * Handles: characteristic, skill, talent, career_level, career_switch.
 */
export function redoAdvancement(character: Character, entry: AdvancementEntry): RedoResult | null {
  if (character.xpCur < entry.xpCost) return null;

  const delta = entry.to - entry.from;

  const base: Character = {
    ...character,
    xpCur: character.xpCur - entry.xpCost,
    xpSpent: character.xpSpent + entry.xpCost,
    advancementLog: [...character.advancementLog, entry],
  };

  switch (entry.type) {
    case 'characteristic': {
      const key = entry.name as CharacteristicKey;
      const newChars = { ...base.chars };
      newChars[key] = { ...newChars[key], a: newChars[key].a + delta };
      return { character: { ...base, chars: newChars } };
    }

    case 'skill': {
      const bIdx = base.bSkills.findIndex(s => s.n === entry.name);
      if (bIdx >= 0) {
        const newSkills = [...base.bSkills];
        newSkills[bIdx] = { ...newSkills[bIdx], a: newSkills[bIdx].a + delta };
        return { character: { ...base, bSkills: newSkills } };
      }
      const aIdx = base.aSkills.findIndex(s => s.n === entry.name);
      if (aIdx >= 0) {
        const newSkills = [...base.aSkills];
        newSkills[aIdx] = { ...newSkills[aIdx], a: newSkills[aIdx].a + delta };
        return { character: { ...base, aSkills: newSkills } };
      }
      // Skill not found — return with only XP and log changes (defensive)
      return { character: base };
    }

    case 'talent': {
      const tIdx = base.talents.findIndex(t => t.n === entry.name);
      if (tIdx >= 0) {
        const newTalents = [...base.talents];
        newTalents[tIdx] = { ...newTalents[tIdx], lvl: newTalents[tIdx].lvl + delta };
        return { character: { ...base, talents: newTalents } };
      }
      // Talent doesn't exist — create it
      const newTalents = [...base.talents, { n: entry.name, lvl: delta, desc: '' }];
      return { character: { ...base, talents: newTalents } };
    }

    case 'career_level': {
      // entry.name format: "CareerName → LevelTitle"
      // entry.to = new level number
      const careerName = entry.name.split(' → ')[0];
      const scheme = CAREER_SCHEMES[careerName];
      if (!scheme) return { character: base };

      const newLevel = scheme[`level${entry.to}` as keyof typeof scheme] as CareerLevel | undefined;
      if (!newLevel) return { character: base };

      return {
        character: {
          ...base,
          careerLevel: newLevel.title,
          status: newLevel.status,
        },
      };
    }

    case 'career_switch': {
      // entry.name format: "OldCareer → NewCareer"
      const parts = entry.name.split(' → ');
      if (parts.length < 2) return null;
      const newCareerName = parts[1];
      const newScheme = CAREER_SCHEMES[newCareerName];
      if (!newScheme) return null;

      const level1 = newScheme.level1;
      const currentPath = base.careerPath;
      const newPath = currentPath ? `${currentPath} → ${level1.title}` : level1.title;

      return {
        character: {
          ...base,
          career: newCareerName,
          class: newScheme.class,
          careerLevel: level1.title,
          status: level1.status,
          careerPath: newPath,
        },
      };
    }

    default:
      return { character: base };
  }
}
