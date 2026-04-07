import type { Character, CharacteristicKey, AdvancementEntry } from '../types/character';
import { CAREER_SCHEMES } from '../data/careers';
import type { CareerLevel } from '../types/character';

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
 * Check if a career level is complete.
 * A career level is complete when:
 * - All required characteristics have at least `threshold` advances
 * - At least `requiredSkillCount` skills from the career level have at least `threshold` advances
 */
export function isCareerLevelComplete(
  character: Character,
  careerName: string,
  level: number,
  charThreshold: number = 1,
  skillThreshold: number = 1,
  requiredSkillCount?: number
): boolean {
  const scheme = CAREER_SCHEMES[careerName];
  if (!scheme) return false;

  const careerLevel = scheme[`level${level}` as keyof typeof scheme] as CareerLevel | undefined;
  if (!careerLevel) return false;

  // Check characteristics
  for (const charKey of careerLevel.characteristics) {
    if (character.chars[charKey].a < charThreshold) return false;
  }

  // Check skills: need requiredSkillCount skills with >= skillThreshold advances
  const allSkills = [...character.bSkills, ...character.aSkills];
  const skillCount = requiredSkillCount ?? careerLevel.skills.length;
  let matchedSkills = 0;

  for (const skillName of careerLevel.skills) {
    const skill = allSkills.find(s => s.n === skillName);
    if (skill && skill.a >= skillThreshold) {
      matchedSkills++;
    }
  }

  return matchedSkills >= skillCount;
}
