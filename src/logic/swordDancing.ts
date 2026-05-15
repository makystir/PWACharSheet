import { SWORD_DANCING_TECHNIQUES } from '../data/swordDancingTechniques';
import type { SwordDancingTechnique, Character } from '../types/character';

export type { SwordDancingTechnique };

// --- Catalogue Lookup ---

export function getTechniqueById(id: string): SwordDancingTechnique | undefined {
  return SWORD_DANCING_TECHNIQUES.find(t => t.id === id);
}

// --- XP Cost Calculation ---

export function getTechniqueXpCost(knownCount: number): number {
  return knownCount * 100;
}

// --- Character Queries ---

export function hasSwordDancingTalent(character: Character): boolean {
  return character.talents.some(t => t.n === 'Sword-dancing');
}

export function getLearnedTechniques(character: Character): string[] {
  return character.learnedTechniques ?? [];
}

// --- Validation ---

export function canLearnTechnique(techniqueId: string, character: Character): { canLearn: boolean; error?: string } {
  const technique = getTechniqueById(techniqueId);
  if (!technique) {
    return { canLearn: false, error: 'Unknown technique.' };
  }

  if (!hasSwordDancingTalent(character)) {
    return { canLearn: false, error: 'Requires Sword-dancing talent.' };
  }

  const learned = getLearnedTechniques(character);
  if (learned.includes(techniqueId)) {
    return { canLearn: false, error: 'This technique is already known.' };
  }

  const cost = getTechniqueXpCost(learned.length);
  if (character.xpCur < cost) {
    return { canLearn: false, error: `Insufficient XP. Need ${cost}, have ${character.xpCur}.` };
  }

  return { canLearn: true };
}

// --- Learning ---

export function learnTechnique(character: Character, techniqueId: string): Character {
  const technique = getTechniqueById(techniqueId);
  if (!technique) {
    return character;
  }

  const learned = getLearnedTechniques(character);
  const cost = getTechniqueXpCost(learned.length);

  const entry = {
    timestamp: Date.now(),
    type: 'technique',
    name: technique.name,
    from: 0,
    to: 1,
    xpCost: cost,
    careerLevel: character.careerLevel,
    inCareer: true,
  };

  return {
    ...character,
    xpCur: character.xpCur - cost,
    xpSpent: character.xpSpent + cost,
    learnedTechniques: [...learned, techniqueId],
    advancementLog: [...character.advancementLog, entry],
  };
}
