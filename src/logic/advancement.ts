import type { Character, CharacteristicKey, AdvancementEntry, Skill, CareerScheme, CareerLevel, RitualItem } from '../types/character';
import { CAREER_SCHEMES } from '../data/careers';
import { ADV_SKILL_DB } from '../data/advanced-skills';
import type { RitualData } from '../data/rituals';

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

/** Well-known characteristic links for skill bases that can't be looked up in ADV_SKILL_DB */
const SKILL_CHAR_FALLBACKS: Record<string, string> = {
  'Channelling': 'WP',
  'Language': 'Int',
  'Lore': 'Int',
  'Melee': 'WS',
  'Ranged': 'BS',
  'Ride': 'Ag',
  'Sail': 'Ag',
  'Stealth': 'Ag',
  'Entertain': 'Fel',
  'Trade': 'Dex',
  'Perform': 'Ag',
  'Secret Signs': 'Int',
  'Play': 'Dex',
  'Animal Training': 'Int',
  'Art': 'Dex',
};

/**
 * Resolve the characteristic for a career skill name.
 * Tries exact match in ADV_SKILL_DB first, then falls back to base-name lookup.
 */
function resolveSkillCharacteristic(careerSkillName: string): string {
  // Exact match in database
  const exact = ADV_SKILL_DB.find(s => s.n === careerSkillName);
  if (exact) return exact.c;

  // Extract base name (before parentheses) and look up fallback
  const parenIdx = careerSkillName.indexOf(' (');
  const baseName = parenIdx !== -1 ? careerSkillName.substring(0, parenIdx) : careerSkillName;

  // Check if we have a known fallback for this base
  if (SKILL_CHAR_FALLBACKS[baseName]) return SKILL_CHAR_FALLBACKS[baseName];

  // Check if any ADV_SKILL_DB entry starts with the same base
  const dbMatch = ADV_SKILL_DB.find(s => s.n.startsWith(baseName + ' ('));
  if (dbMatch) return dbMatch.c;

  // Default to Int as safest fallback
  return 'Int';
}

/**
 * Ensure all career skills for a given career level exist on the character.
 * If a career skill is not already present as a basic or advanced skill, it is
 * added to aSkills with 0 advances. Skills with "(Any)" wildcards are skipped
 * since they require the player to choose a specialisation.
 *
 * Returns the character unchanged if all career skills already exist.
 */
export function ensureCareerSkillsExist(character: Character, careerSkills: string[]): Character {
  const allExistingSkills = [...character.bSkills, ...character.aSkills];
  const newASkills: Skill[] = [];

  for (const careerSkill of careerSkills) {
    // Skip wildcard skills — the player needs to choose a specialisation
    if (careerSkill.includes('(Any)') || careerSkill.includes('(Any ')) continue;

    // Check if ANY existing skill already matches this career skill
    const alreadyExists = allExistingSkills.some(s => careerSkillMatches(careerSkill, s.n));
    if (alreadyExists) continue;

    // Also check the skills we're about to add (avoid duplicates within this batch)
    if (newASkills.some(s => careerSkillMatches(careerSkill, s.n))) continue;

    // Resolve the correct characteristic for this skill
    const characteristic = resolveSkillCharacteristic(careerSkill);

    newASkills.push({ n: careerSkill, c: characteristic, a: 0 });
  }

  if (newASkills.length === 0) return character;

  return {
    ...character,
    aSkills: [...character.aSkills, ...newASkills],
  };
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
      if (currentAdvances < threshold) {
        baseCost = cost;
        break;
      }
    }
  } else if (type === 'skill') {
    baseCost = SKILL_MAX_COST;
    for (const [threshold, cost] of SKILL_COST_TABLE) {
      if (currentAdvances < threshold) {
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

  if (currentLevel >= 5) return null;

  for (let level = currentLevel + 1; level <= 5; level++) {
    const careerLevel = scheme[`level${level}` as keyof CareerScheme] as CareerLevel | undefined;
    if (!careerLevel) continue;

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
 * WFRP 4e spell/miracle XP cost calculation.
 *
 * Petty Spells: 50 XP per spell up to WP Bonus×1, 100 XP up to WP Bonus×2, etc.
 * Arcane Lore Spells: 100 XP per spell up to Int Bonus×1, 200 XP up to Int Bonus×2, etc.
 * Miracles (Invoke): 100 XP × number of miracles currently known.
 * Blessings: Free (all 6 granted with the Bless talent).
 * Chaos Magic: Always 100 XP per spell.
 */
export function getSpellLearningCost(
  spellType: 'petty' | 'arcane' | 'miracle' | 'chaos',
  spellsCurrentlyKnown: number,
  characteristicBonus: number
): number {
  const bonus = Math.max(characteristicBonus, 1);
  switch (spellType) {
    case 'petty': {
      // Core Rulebook p.142: Petty Magic talent grants WPB petty spells for free.
      // "Up to WP Bonus × 1: 50 XP; Up to WP Bonus × 2: 100 XP"
      // The initial WPB spells are free (cost 0). After that, the tier cost applies.
      if (spellsCurrentlyKnown < bonus) return 0; // Free initial spells from Petty Magic talent
      const tier = Math.ceil(spellsCurrentlyKnown / bonus);
      return tier * 50;
    }
    case 'arcane': {
      // Same tier logic as petty but with Int Bonus and 100 XP base.
      const tier = spellsCurrentlyKnown > 0
        ? Math.ceil(spellsCurrentlyKnown / bonus)
        : 1;
      return tier * 100;
    }
    case 'miracle': {
      // Core Rulebook p.140: Invoke talent grants 1 miracle free.
      // Extra miracles cost "100 XP per miracle you currently know."
      // So: 1st miracle = free (0 XP), 2nd = 100 XP (know 1), 3rd = 200 XP (know 2), etc.
      if (spellsCurrentlyKnown === 0) return 0;
      return 100 * spellsCurrentlyKnown;
    }
    case 'chaos': {
      // Always 100 XP
      return 100;
    }
  }
}

/**
 * Determine what kind of spellcasting the character has based on their talents.
 * Returns an array of spell types available to the character.
 */
export function getSpellcastingTypes(character: Character): Array<'petty' | 'arcane' | 'miracle' | 'chaos'> {
  const types: Array<'petty' | 'arcane' | 'miracle' | 'chaos'> = [];
  for (const t of character.talents) {
    if (t.n === 'Petty Magic' && !types.includes('petty')) types.push('petty');
    if (t.n.startsWith('Arcane Magic') && !types.includes('arcane')) types.push('arcane');
    if (t.n.startsWith('Invoke') && !types.includes('miracle')) types.push('miracle');
    if (t.n.startsWith('Chaos Magic') && !types.includes('chaos')) types.push('chaos');
  }
  return types;
}

/**
 * Count how many spells/miracles of each type the character currently knows (memorized).
 */
export function countMemorizedByType(character: Character): { petty: number; arcane: number; miracle: number; chaos: number } {
  // Count based on CN: petty spells have CN 0, arcane/chaos have CN > 0, miracles are identified by Invoke talent presence
  // We need a heuristic since SpellItem doesn't track type directly.
  // Convention: CN "0" or "-" = petty spell; otherwise arcane/miracle/chaos
  // To distinguish miracles from arcane, we check if character has Invoke vs Arcane Magic talent.
  const hasMiracles = character.talents.some(t => t.n.startsWith('Invoke'));
  const hasArcane = character.talents.some(t => t.n.startsWith('Arcane Magic'));
  const hasChaos = character.talents.some(t => t.n.startsWith('Chaos Magic'));

  let petty = 0;
  let arcane = 0;
  let miracle = 0;
  let chaos = 0;

  for (const spell of character.spells) {
    if (!spell.memorized) continue;
    const cn = parseInt(spell.cn, 10);
    if (isNaN(cn) || cn === 0) {
      petty++;
    } else if (hasMiracles && !hasArcane && !hasChaos) {
      miracle++;
    } else if (hasChaos && !hasArcane) {
      chaos++;
    } else {
      // Default to arcane if character has arcane talent, or is ambiguous
      arcane++;
    }
  }

  return { petty, arcane, miracle, chaos };
}

/**
 * Learn a spell: add it to the character's spell list as memorized, deduct XP, and log.
 */
export function learnSpell(
  character: Character,
  spell: { name: string; cn: string; range: string; target: string; duration: string; effect: string },
  spellType: 'petty' | 'arcane' | 'miracle' | 'chaos',
  cost: number
): Character {
  if (character.xpCur < cost) return { ...character };

  const counts = countMemorizedByType(character);
  const currentCount = counts[spellType];

  const entry: AdvancementEntry = {
    timestamp: Date.now(),
    type: 'spell',
    name: spell.name,
    from: currentCount,
    to: currentCount + 1,
    xpCost: cost,
    careerLevel: character.careerLevel,
    inCareer: true,
  };

  return {
    ...character,
    spells: [...character.spells, { ...spell, memorized: true }],
    xpCur: character.xpCur - cost,
    xpSpent: character.xpSpent + cost,
    advancementLog: [...character.advancementLog, entry],
  };
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
const CAREER_COMPLETION_THRESHOLDS: Record<number, number> = { 1: 5, 2: 10, 3: 15, 4: 20, 5: 25 };

/**
 * Check if a career skill name matches a character's skill.
 * Handles grouped skills: career "Melee (Any)" matches character "Melee (Basic)",
 * career "Channelling (Any Colour)" matches character "Channelling (Aqshy)",
 * career "Art (Calligraphy or Engraving)" matches character "Art (Calligraphy)",
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
  // "(Any X)" grouped skill: "Channelling (Any Colour)" matches any "Channelling (...)"
  if (careerSkillName.includes('(Any ')) {
    const base = careerSkillName.substring(0, careerSkillName.indexOf(' (Any'));
    return characterSkillName.startsWith(base + ' (');
  }
  // "(X or Y)" choice pattern: "Art (Calligraphy or Engraving)" matches "Art (Calligraphy)" or "Art (Engraving)"
  const parenOpen = careerSkillName.indexOf('(');
  const parenClose = careerSkillName.indexOf(')');
  if (parenOpen !== -1 && parenClose !== -1) {
    const parenContent = careerSkillName.substring(parenOpen + 1, parenClose);
    if (parenContent.includes(' or ')) {
      const base = careerSkillName.substring(0, parenOpen).trimEnd();
      const options = parenContent.split(' or ');
      return options.some(option => characterSkillName === base + ' (' + option.trim() + ')');
    }
  }
  // Ungrouped career skill matching a specialised character skill:
  // e.g., career "Stealth" matches character "Stealth (Urban)"
  if (!careerSkillName.includes('(') && characterSkillName.startsWith(careerSkillName + ' (')) {
    return true;
  }
  return false;
}

/**
 * Get the talents that are NEW at a specific career level (not inherited from lower levels).
 * Per Core Rulebook p.47: "Talents are only available when you are in the level of the Career
 * that lists them." This means only the talents unique to the CURRENT level are purchasable.
 *
 * Computes the difference between the current level's talent list and the previous level's.
 */
export function getCurrentLevelTalents(
  careerName: string,
  level: number,
): string[] {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return [];

  const careerLevel = scheme[`level${level}` as keyof typeof scheme] as CareerLevel | undefined;
  if (!careerLevel) return [];

  // Level 1 has no previous level — all talents are new
  if (level <= 1) return careerLevel.talents;

  // Get previous level's cumulative talents
  const prevLevel = scheme[`level${level - 1}` as keyof typeof scheme] as CareerLevel | undefined;
  const prevTalents = prevLevel ? prevLevel.talents : [];

  // Return only talents that are NOT in the previous level's list
  return careerLevel.talents.filter(t => !prevTalents.includes(t));
}

/**
 * Check if a career level is complete per WFRP 4e rules (p.48).
 *
 * To complete a career level, you must have:
 * - The level's required advances (5/10/15/20) in ALL career level characteristics
 * - The level's required advances in at least 8 of the career level's available skills
 * - At least 1 talent from the CURRENT career level (NOT lower levels)
 *
 * Per Core Rulebook p.47: "Talents are only available when you are in the level of the Career
 * that lists them." The completion check enforces this by requiring a talent that is NEW at
 * the current level.
 *
 * Skills and characteristics gained from prior careers count towards completion.
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

  // Check talents: at least 1 from CURRENT career level only (not cumulative lower levels)
  // Per Core Rulebook p.47: "Talents are only available when you are in the level of the Career that lists them."
  const currentLevelTalents = getCurrentLevelTalents(careerName, level);
  const hasTalent = currentLevelTalents.some(tn =>
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
      const firstOldLevel = (oldScheme.level1 || oldScheme.level2)!;
      let oldLevelTitle = firstOldLevel.title;
      let oldStatus = firstOldLevel.status;
      if (newLog.length > 0) {
        const prevEntry = newLog[newLog.length - 1];
        oldLevelTitle = prevEntry.careerLevel;
        // Look up the status from the scheme
        for (let lvl = 1; lvl <= 5; lvl++) {
          const level = oldScheme[`level${lvl}` as keyof typeof oldScheme] as CareerLevel | undefined;
          if (level && level.title === oldLevelTitle) {
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

    case 'spell': {
      // Remove the last memorized spell with this name
      const spellIdx = base.spells.findLastIndex(s => s.name === entry.name && s.memorized);
      if (spellIdx >= 0) {
        const newSpells = base.spells.filter((_, i) => i !== spellIdx);
        return { character: { ...base, spells: newSpells }, undoneEntry: entry };
      }
      return { character: base, undoneEntry: entry };
    }

    default:
      return { character: base, undoneEntry: entry };
  }
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

      const level1 = (newScheme.level1 || newScheme.level2)!;
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

    case 'spell': {
      // Re-add the spell as memorized
      const newSpells = [...base.spells, { name: entry.name, cn: '', range: '', target: '', duration: '', effect: '', memorized: true }];
      return { character: { ...base, spells: newSpells } };
    }

    default:
      return { character: base };
  }
}


/**
 * Check whether a character has any talent that qualifies them for ritual magic.
 * Qualifying talents: Arcane Magic (Any), Chaos Magic (Any).
 */
export function hasRitualMagicTalent(character: Character): boolean {
  return character.talents.some(t =>
    t.n.startsWith('Arcane Magic') ||
    t.n.startsWith('Chaos Magic')
  );
}

/**
 * Determine the character's Lore from their Arcane/Chaos Magic talent.
 * Returns the lore name (e.g., "Beasts", "Fire") or null if not found.
 */
export function getCharacterLore(character: Character): string | null {
  for (const t of character.talents) {
    if (t.n.startsWith('Arcane Magic (') || t.n.startsWith('Chaos Magic (')) {
      const match = t.n.match(/\(([^)]+)\)/);
      if (match) return match[1];
    }
  }
  return null;
}

/**
 * Learn a ritual: add it to the character's rituals array, deduct XP, and log.
 * Returns the character unchanged if XP is insufficient.
 */
export function learnRitual(
  character: Character,
  ritual: RitualData,
): Character {
  const cost = ritual.learningXP;
  if (character.xpCur < cost) return character;

  const currentRituals = character.rituals ?? [];
  const ritualCount = currentRituals.length;

  const newRitual: RitualItem = {
    name: ritual.name,
    cn: ritual.cn,
    type: ritual.type,
    learningXP: ritual.learningXP,
    ingredients: ritual.ingredients,
    conditions: ritual.conditions,
    description: ritual.description,
  };

  const entry: AdvancementEntry = {
    timestamp: Date.now(),
    type: 'ritual',
    name: ritual.name,
    from: ritualCount,
    to: ritualCount + 1,
    xpCost: cost,
    careerLevel: character.careerLevel,
    inCareer: true,
  };

  return {
    ...character,
    rituals: [...currentRituals, newRitual],
    xpCur: character.xpCur - cost,
    xpSpent: character.xpSpent + cost,
    advancementLog: [...character.advancementLog, entry],
  };
}

// --- Quality-of-life: XP Budget Feedback & Bulk Advancement ---

/** Tier boundaries for skill/characteristic advancement. */
const TIER_BOUNDARIES = [5, 10, 15, 20, 25] as const;

/**
 * Format the insufficient-XP feedback message.
 * Returns a human-readable string indicating the cost required and XP available.
 */
export function formatXpFeedback(cost: number, available: number): string {
  return `Need ${cost} XP, have ${available}`;
}

/**
 * Calculate cumulative cost from current advances to the next tier boundary.
 * Tier boundaries are at 5, 10, 15, 20, 25.
 * Returns the target advance count and total XP cost to reach it.
 */
export function calculateTierBoundaryCost(
  type: 'skill' | 'characteristic',
  currentAdvances: number,
  inCareer: boolean
): { targetAdvances: number; totalCost: number } {
  // Find the next tier boundary above currentAdvances
  const targetAdvances = TIER_BOUNDARIES.find(b => b > currentAdvances) ?? 25;

  // Sum up individual advancement costs from currentAdvances to targetAdvances
  let totalCost = 0;
  for (let adv = currentAdvances; adv < targetAdvances; adv++) {
    totalCost += getAdvancementCost(type, adv, inCareer);
  }

  return { targetAdvances, totalCost };
}

/**
 * Apply bulk advancement to a character's skill, advancing it to the next tier boundary.
 * Calculates cumulative cost from current advances to the next tier boundary (5, 10, 15, 20, 25).
 * If XP is sufficient: applies all advances atomically, deducts total XP, creates individual log entries.
 * If XP is insufficient: returns error with cost and available values (no state change).
 * When a skill is already AT a tier boundary, calculates to the NEXT boundary above.
 */
export function applyBulkAdvancement(
  character: Character,
  skillIndex: number,
  isBasic: boolean,
  inCareer: boolean
): { character: Character; entries: AdvancementEntry[] } | { error: string; cost: number; available: number } {
  const skills = isBasic ? character.bSkills : character.aSkills;
  if (skillIndex < 0 || skillIndex >= skills.length) {
    return { error: 'Invalid skill index', cost: 0, available: character.xpCur };
  }

  const skill = skills[skillIndex];
  const currentAdvances = skill.a;

  // Calculate cost to next tier boundary
  const { targetAdvances, totalCost } = calculateTierBoundaryCost('skill', currentAdvances, inCareer);

  // If already at max tier boundary (25), nothing to advance
  if (targetAdvances <= currentAdvances) {
    return { error: 'Skill is already at maximum advances', cost: 0, available: character.xpCur };
  }

  // Check if XP is sufficient
  if (character.xpCur < totalCost) {
    return {
      error: formatXpFeedback(totalCost, character.xpCur),
      cost: totalCost,
      available: character.xpCur,
    };
  }

  // Apply all advances atomically: build individual log entries
  const entries: AdvancementEntry[] = [];
  let xpDeducted = 0;

  for (let adv = currentAdvances; adv < targetAdvances; adv++) {
    const cost = getAdvancementCost('skill', adv, inCareer);
    entries.push({
      timestamp: Date.now(),
      type: 'skill',
      name: skill.n,
      from: adv,
      to: adv + 1,
      xpCost: cost,
      careerLevel: character.careerLevel,
      inCareer,
    });
    xpDeducted += cost;
  }

  // Update the skill advances
  const newSkills = [...skills];
  newSkills[skillIndex] = { ...skill, a: targetAdvances };

  // Build updated character
  const updates: Partial<Character> = {
    xpCur: character.xpCur - xpDeducted,
    xpSpent: character.xpSpent + xpDeducted,
    advancementLog: [...character.advancementLog, ...entries],
  };

  if (isBasic) {
    return { character: { ...character, ...updates, bSkills: newSkills }, entries };
  } else {
    return { character: { ...character, ...updates, aSkills: newSkills }, entries };
  }
}
