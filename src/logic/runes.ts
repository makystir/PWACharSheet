import { RUNE_CATALOGUE } from '../data/runes';
import type { RuneDefinition, RuneCategory } from '../data/runes';
import type { WeaponItem, ArmourItem, CharacteristicKey, Character } from '../types/character';

export type { RuneDefinition, RuneCategory };

// --- Catalogue Lookup ---

export function getRuneById(id: string): RuneDefinition | undefined {
  return RUNE_CATALOGUE.find(r => r.id === id);
}

export function getRunesByCategory(category: RuneCategory): RuneDefinition[] {
  return RUNE_CATALOGUE.filter(r => r.category === category);
}

// --- Validation ---

export interface RuneValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRunePlacement(
  runeId: string,
  currentRunes: string[],
  itemType: 'weapon' | 'armour'
): RuneValidationResult {
  // Max 3 runes per item (Property 1)
  if (currentRunes.length >= 3) {
    return { valid: false, error: 'This item already has the maximum of 3 runes.' };
  }

  const rune = getRuneById(runeId);
  if (!rune) {
    return { valid: false, error: 'Unknown rune.' };
  }

  // Category restrictions (Property 9): weapon runes only on weapons, armour runes only on armour
  // Talismanic runes allowed on both (Property 10)
  if (rune.category === 'weapon' && itemType === 'armour') {
    return { valid: false, error: 'Weapon runes cannot be placed on armour.' };
  }
  if (rune.category === 'armour' && itemType === 'weapon') {
    return { valid: false, error: 'Armour runes cannot be placed on weapons.' };
  }

  // Max 1 Master Rune per item (Property 2)
  if (rune.isMaster) {
    const hasMaster = currentRunes.some(id => {
      const existing = getRuneById(id);
      return existing?.isMaster === true;
    });
    if (hasMaster) {
      return { valid: false, error: 'This item already has a Master Rune. Only one Master Rune is allowed per item.' };
    }
  }

  // Per-rune maxPerItem limit (Property 8)
  const count = currentRunes.filter(id => id === runeId).length;
  if (count >= rune.maxPerItem) {
    return { valid: false, error: 'This rune has already been inscribed the maximum number of times on this item.' };
  }

  return { valid: true };
}

// --- Filtering ---

export function getAvailableRunesForItem(
  itemType: 'weapon' | 'armour',
  currentRunes: string[],
  knownRunes: string[]
): RuneDefinition[] {
  // Get all runes the character knows
  const known = RUNE_CATALOGUE.filter(r => knownRunes.includes(r.id));

  // Filter by category compatibility: weapon → weapon+talisman, armour → armour+talisman
  const categoryCompatible = known.filter(
    r => r.category === itemType || r.category === 'talisman'
  );

  // Exclude runes that would fail validateRunePlacement
  return categoryCompatible.filter(
    r => validateRunePlacement(r.id, currentRunes, itemType).valid
  );
}

// --- Effect Calculation ---

export function getRuneDamageBonus(runeIds: string[]): number {
  let total = 0;
  for (const id of runeIds) {
    const rune = getRuneById(id);
    if (!rune) continue;
    for (const effect of rune.effects) {
      if (effect.type === 'damage') {
        total += effect.value;
      }
    }
  }
  return total;
}

export function getRuneAPBonus(runeIds: string[]): number {
  let total = 0;
  for (const id of runeIds) {
    const rune = getRuneById(id);
    if (!rune) continue;
    for (const effect of rune.effects) {
      if (effect.type === 'ap') {
        total += effect.value;
      }
    }
  }
  return total;
}

export function getRuneCharacteristicBonuses(
  weapons: WeaponItem[],
  armour: ArmourItem[]
): Partial<Record<CharacteristicKey, number>> {
  const bonuses: Partial<Record<CharacteristicKey, number>> = {};

  const allRuneIds: string[] = [];
  for (const w of weapons) {
    for (const id of (w.runes ?? [])) {
      allRuneIds.push(id);
    }
  }
  for (const a of armour) {
    for (const id of (a.runes ?? [])) {
      allRuneIds.push(id);
    }
  }

  for (const id of allRuneIds) {
    const rune = getRuneById(id);
    if (!rune) continue;
    for (const effect of rune.effects) {
      if (effect.type === 'characteristic' && effect.characteristic) {
        const key = effect.characteristic;
        bonuses[key] = (bonuses[key] ?? 0) + effect.value;
      }
    }
  }

  return bonuses;
}

export function getRuneQualities(runeIds: string[]): string[] {
  const qualities: string[] = [];
  for (const id of runeIds) {
    const rune = getRuneById(id);
    if (!rune) continue;
    for (const effect of rune.effects) {
      if (effect.type === 'quality' && effect.quality) {
        qualities.push(effect.quality);
      }
    }
  }
  return qualities;
}

export interface AggregatedRuneEffects {
  damageByWeapon: { weaponName: string; bonus: number }[];
  apByArmour: { armourName: string; bonus: number }[];
  characteristics: Partial<Record<CharacteristicKey, number>>;
  qualities: { weaponName: string; qualities: string[] }[];
  special: { itemName: string; description: string }[];
}

export function aggregateAllRuneEffects(
  weapons: WeaponItem[],
  armour: ArmourItem[]
): AggregatedRuneEffects {
  const damageByWeapon: { weaponName: string; bonus: number }[] = [];
  const apByArmour: { armourName: string; bonus: number }[] = [];
  const characteristics: Partial<Record<CharacteristicKey, number>> = {};
  const qualities: { weaponName: string; qualities: string[] }[] = [];
  const special: { itemName: string; description: string }[] = [];

  for (const w of weapons) {
    const runes = w.runes ?? [];
    if (runes.length === 0) continue;

    const dmg = getRuneDamageBonus(runes);
    if (dmg > 0) {
      damageByWeapon.push({ weaponName: w.name, bonus: dmg });
    }

    const quals = getRuneQualities(runes);
    if (quals.length > 0) {
      qualities.push({ weaponName: w.name, qualities: quals });
    }

    for (const id of runes) {
      const rune = getRuneById(id);
      if (!rune) continue;
      for (const effect of rune.effects) {
        if (effect.type === 'characteristic' && effect.characteristic) {
          const key = effect.characteristic;
          characteristics[key] = (characteristics[key] ?? 0) + effect.value;
        }
        if (effect.type === 'special' && effect.description) {
          special.push({ itemName: w.name, description: effect.description });
        }
      }
    }
  }

  for (const a of armour) {
    const runes = a.runes ?? [];
    if (runes.length === 0) continue;

    const ap = getRuneAPBonus(runes);
    if (ap > 0) {
      apByArmour.push({ armourName: a.name, bonus: ap });
    }

    for (const id of runes) {
      const rune = getRuneById(id);
      if (!rune) continue;
      for (const effect of rune.effects) {
        if (effect.type === 'characteristic' && effect.characteristic) {
          const key = effect.characteristic;
          characteristics[key] = (characteristics[key] ?? 0) + effect.value;
        }
        if (effect.type === 'special' && effect.description) {
          special.push({ itemName: a.name, description: effect.description });
        }
      }
    }
  }

  return { damageByWeapon, apByArmour, characteristics, qualities, special };
}


// --- Learning ---

export function canLearnRune(
  runeId: string,
  character: Character
): { canLearn: boolean; error?: string } {
  const rune = getRuneById(runeId);
  if (!rune) {
    return { canLearn: false, error: 'Unknown rune.' };
  }

  // Check if already known (Property 15)
  const knownRunes = character.knownRunes ?? [];
  if (knownRunes.includes(runeId)) {
    return { canLearn: false, error: 'This rune is already known.' };
  }

  // Check talent prerequisites (Property 12)
  if (rune.isMaster) {
    const hasMasterRuneMagic = character.talents.some(t => t.n.startsWith('Master Rune Magic'));
    if (!hasMasterRuneMagic) {
      return { canLearn: false, error: 'Requires Master Rune Magic talent.' };
    }
  } else {
    const hasRuneMagic = character.talents.some(t => t.n.startsWith('Rune Magic'));
    if (!hasRuneMagic) {
      return { canLearn: false, error: 'Requires Rune Magic talent.' };
    }
  }

  // Check sufficient XP (Property 14)
  if (character.xpCur < rune.xpCost) {
    return { canLearn: false, error: `Insufficient XP. Need ${rune.xpCost}, have ${character.xpCur}.` };
  }

  return { canLearn: true };
}

export function learnRune(character: Character, runeId: string): Character {
  const rune = getRuneById(runeId)!;
  const knownRunes = [...(character.knownRunes ?? []), runeId];

  const entry = {
    timestamp: Date.now(),
    type: 'rune',
    name: rune.name,
    from: 0,
    to: 1,
    xpCost: rune.xpCost,
    careerLevel: character.careerLevel,
    inCareer: true,
  };

  return {
    ...character,
    xpCur: character.xpCur - rune.xpCost,
    xpSpent: character.xpSpent + rune.xpCost,
    knownRunes,
    advancementLog: [...character.advancementLog, entry],
  };
}
