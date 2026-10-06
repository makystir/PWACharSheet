/**
 * Random Character Generator — RNG seam and pure dice helpers.
 *
 * This module isolates all randomness behind an injectable `RNG` function so the
 * generator is deterministic (and unit-testable) when seeded, mirroring the testing
 * seam used by the existing personal-details generation. Production code passes
 * `Math.random`; tests pass a deterministic seeded RNG. No seeding dependency lives
 * in production code (Design "The RNG seam"; Req 1.5).
 *
 * Rulebook citations (rules-compliance steering rule):
 *  - 2d10 characteristic rolls: Core p.33 ("roll 2d10 for each Characteristic").
 *  - d100 rolls (Random Species Table, Random Talents): Core p.24 / p.30.
 */

import type {
  Character,
  CharacteristicKey,
  CareerLevel,
} from '../types/character';
import { BLANK_CHARACTER, CHARACTERISTIC_KEYS } from '../types/character';
import { SPECIES_DATA } from '../data/species';
import { CAREER_SCHEMES } from '../data/careers';
import { rollRandomTalent } from '../data/randomTalents';
import { ensureCareerSkillsExist, resolveSkillCharacteristic } from './advancement';
import { findTalentData } from './talents';
import { getEligibleCareers } from './career-eligibility';
import { resolveTrapping } from './trapping-resolver';
import { CLASS_TRAPPINGS } from '../data/class-trappings';
import { resolveNamePool } from '../data/character-names';
import { AGE_FORMULAS, HEIGHT_FORMULAS } from '../data/personal-details';
import {
  getSpeciesGroup,
  generateAge,
  generateHeight,
  humanHeightNeedsBonus,
  lookupHairColour,
  lookupEyeColour,
  formatVariegatedEyes,
  lookupDwarfAlternateTable,
} from './personal-details';
import { resolveFeaturePool } from '../data/distinguishing-features';

/** Random-number source: a function returning a float in [0, 1), like Math.random. */
export type RNG = () => number;

/**
 * Roll a single d10, returning an integer in 1..10.
 * Maps the RNG's [0, 1) output into ten equal bands.
 * (Building block for 2d10 characteristic rolls — Core p.33.)
 */
export function rollD10(rng: RNG): number {
  return Math.floor(rng() * 10) + 1;
}

/**
 * Roll 2d10, returning an integer in 2..20 (two independent d10 summed).
 * Core p.33: characteristics are rolled as 2d10 each.
 */
export function roll2d10(rng: RNG): number {
  return rollD10(rng) + rollD10(rng);
}

/**
 * Roll a d100 (percentile), returning an integer in 1..100.
 * Core p.24 (Random Species Table) / Core p.30 (Random Class & Career) use d100.
 */
export function rollD100(rng: RNG): number {
  return Math.floor(rng() * 100) + 1;
}

/**
 * Uniformly pick one element from a non-empty array.
 *
 * Defensive guard: an empty array is a developer error (a caller passed an empty
 * option list), so this throws rather than returning `undefined` — per the design
 * Error Handling table. This is a programming-error guard, not a game rule.
 */
export function pick<T>(rng: RNG, items: T[]): T {
  if (items.length === 0) {
    throw new Error('pick(): cannot choose from an empty array');
  }
  return items[Math.floor(rng() * items.length)];
}

// ─── Skill-characteristic resolution ─────────────────────────────────────────
//
// Linked characteristics come from the shared `resolveSkillCharacteristic` and
// talent descriptions from the shared `findTalentData`, the same helpers the
// CharacterWizard uses, so the generator and the wizard cannot drift apart.

/**
 * Apply `advances` to a named skill on the character, mirroring the wizard's
 * Basic/Advanced resolution (Core p.35): add to an existing Basic entry, else to an
 * existing Advanced entry, else push a new Advanced skill with the resolved
 * characteristic. Mutates `char` in place (the generator works on a fresh clone).
 */
function applySkillAdvance(char: Character, skillName: string, advances: number): void {
  if (advances <= 0) return;
  const bIdx = char.bSkills.findIndex((s) => s.n === skillName);
  if (bIdx >= 0) {
    char.bSkills[bIdx] = { ...char.bSkills[bIdx], a: char.bSkills[bIdx].a + advances };
    return;
  }
  const aIdx = char.aSkills.findIndex((s) => s.n === skillName);
  if (aIdx >= 0) {
    char.aSkills[aIdx] = { ...char.aSkills[aIdx], a: char.aSkills[aIdx].a + advances };
    return;
  }
  char.aSkills.push({ n: skillName, c: resolveSkillCharacteristic(skillName), a: advances });
}

/** Push a talent (deduplicated by name), mirroring the wizard's talent assembly. */
function addTalent(char: Character, name: string): void {
  if (char.talents.some((t) => t.n === name)) return;
  char.talents.push({ n: name, lvl: 1, desc: findTalentData(name)?.desc ?? '' });
}

// ─── Step 1: Species — Random Species Table (Core p.24) ──────────────────────

/**
 * Map a d100 roll to a species via the Core p.24 Random Species Table:
 *   01–90 Human, 91–94 Halfling, 95–98 Dwarf, 99 High Elf, 00(=100) Wood Elf.
 * Human resolves to the "Human / Reiklander" SPECIES_DATA key. Verbatim from
 * CharacterWizard.handleRandomSpecies. Awards +20 XP for accepting the roll (p.24),
 * folded into the fixed Bonus XP total by the orchestrator.
 */
export function rollSpecies(rng: RNG): string {
  const roll = rollD100(rng); // Core p.24: 1d100 on the Random Species Table.
  if (roll <= 90) return 'Human / Reiklander';
  if (roll <= 94) return 'Halfling';
  if (roll <= 98) return 'Dwarf';
  if (roll === 99) return 'High Elf';
  return 'Wood Elf';
}

// ─── Step 2: Eligible career (Core p.30–31) ──────────────────────────────────

/**
 * Pick a random startable career for a species: `getEligibleCareers(species)`
 * restricted to careers that have a level-1 entry (Core p.30–31). The `level1`
 * filter excludes High-Elf elite careers that start at level 2 (Smith-Priest of
 * Vaul, Storm Weaver, Loremaster of Hoeth). Awards +50 XP for a random career
 * (confirmed interpretation; Core p.30–31), folded into the Bonus XP total.
 */
export function pickEligibleCareer(rng: RNG, species: string): string {
  const careers = getEligibleCareers(species).filter((c) => CAREER_SCHEMES[c]?.level1);
  return pick(rng, careers);
}

// ─── Step 3: Characteristics — roll, rearrange, modify (Core p.33) ───────────

/** Roll one raw 2d10 value for each of the ten characteristics (Core p.33). */
export function rollCharacteristics(rng: RNG): number[] {
  // Core p.33 (Attributes Table): each Characteristic is 2d10 + species modifier,
  // stored on the RAW scale (NOT scaled by 10). The species modifier is added by
  // the orchestrator; this returns the raw 2d10 roll (2..20) per characteristic.
  return CHARACTERISTIC_KEYS.map(() => roll2d10(rng));
}

/**
 * Rearrange rolled values so the highest land on the advance-scheme characteristics
 * (Core p.33 Step 2 "rearrange"). Returns a map of characteristic → assigned roll.
 *
 * Deterministic permutation of the ten rolled values:
 *  - Sort rolls descending (stable: equal values keep encounter order).
 *  - Assign the largest values, in order, to the advance-scheme chars (in listed order).
 *  - Assign the remaining values to the remaining chars in canonical key order.
 */
export function assignByRearrange(
  rolls: number[],
  schemeChars: CharacteristicKey[],
): Record<CharacteristicKey, number> {
  // Stable descending sort (indices as tiebreak keeps the result fully determined).
  const sorted = rolls
    .map((v, i) => ({ v, i }))
    .sort((a, b) => (b.v - a.v) || (a.i - b.i))
    .map((x) => x.v);

  const assigned = {} as Record<CharacteristicKey, number>;
  const schemeSet = new Set(schemeChars);
  let next = 0;

  // Highest rolls → advance-scheme chars, in the scheme's listed order.
  for (const k of schemeChars) {
    assigned[k] = sorted[next++];
  }
  // Remaining rolls → the rest, in canonical CHARACTERISTIC_KEYS order.
  for (const k of CHARACTERISTIC_KEYS) {
    if (schemeSet.has(k)) continue;
    assigned[k] = sorted[next++];
  }
  return assigned;
}

// ─── Step 4: Characteristic advances (Core p.34) ─────────────────────────────

/**
 * Distribute exactly 5 characteristic advances round-robin across the advance-scheme
 * characteristics only (Core p.34). For the usual three scheme chars this yields
 * 2,2,1. Deterministic (no RNG) and never lands outside the scheme set.
 */
export function distributeCharAdvances(
  schemeChars: CharacteristicKey[],
): Record<CharacteristicKey, number> {
  const advances = {} as Record<CharacteristicKey, number>;
  for (const k of CHARACTERISTIC_KEYS) advances[k] = 0;
  if (schemeChars.length === 0) return advances; // defensive: nothing to advance.
  for (let i = 0; i < 5; i++) {
    const k = schemeChars[i % schemeChars.length];
    advances[k] += 1;
  }
  return advances;
}

// ─── Step 5: Species skills — 3×+5 / 3×+3 (Core p.35) ────────────────────────

/**
 * Pick 3 species skills at +5 and 3 (disjoint) at +3 from the species skill list and
 * apply them to the character with Basic/Advanced resolution (Core p.35). Shuffles the
 * list via the RNG (Fisher–Yates), takes the first 3 for +5 and the next 3 for +3.
 * Defensive: if fewer than 6 skills exist, it allocates as many as are available.
 */
export function pickSpeciesSkills(rng: RNG, char: Character, speciesSkills: string[]): void {
  const pool = [...speciesSkills];
  // Fisher–Yates shuffle driven by the RNG seam (deterministic when seeded).
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const five = pool.slice(0, 3);
  const three = pool.slice(3, 6);
  for (const s of five) applySkillAdvance(char, s, 5);
  for (const s of three) applySkillAdvance(char, s, 3);
}

// ─── Step 6: Species talents — fixed, choices, random slots (Core p.35) ──────

/**
 * Resolve the species talents (Core p.35) onto the character:
 *  - Plain entry → grant it.
 *  - "A or B" → pick one option via the RNG.
 *  - Then fill `randomTalentSlots` via rollRandomTalent(rollD100), rerolling results
 *    that duplicate an already-granted talent until unique.
 *
 * The dup-reroll is bounded: the Random Talent table has 36 distinct outcomes and
 * species grant far fewer, so a non-duplicate always exists. A safety cap prevents a
 * pathological infinite loop (programming guard, not a game rule).
 */
export function resolveSpeciesTalents(rng: RNG, char: Character, speciesKey: string): void {
  const data = SPECIES_DATA[speciesKey];
  const talents = data?.talents ?? [];

  for (const entry of talents) {
    if (entry.includes(' or ')) {
      // Core p.35: "A or B" species talents are a single pick.
      const chosen = pick(rng, entry.split(' or ').map((o) => o.trim()));
      addTalent(char, chosen);
    } else {
      addTalent(char, entry);
    }
  }

  // Fill Random Talent slots (Core p.35), rerolling duplicates (bounded).
  const slots = data?.randomTalentSlots ?? 0;
  const MAX_REROLLS = 100; // safety cap; 36-entry table ≫ talents granted.
  for (let s = 0; s < slots; s++) {
    let rolled = rollRandomTalent(rollD100(rng));
    let guard = 0;
    while (char.talents.some((t) => t.n === rolled) && guard < MAX_REROLLS) {
      rolled = rollRandomTalent(rollD100(rng));
      guard++;
    }
    addTalent(char, rolled);
  }
}

// ─── Step 7: Career skills — 40 advances, ≤10 each (Core p.35) ───────────────

/**
 * Distribute 40 career-skill advances as +5 to each of the 8 level-1 career skills
 * (Core p.35 worked example: "enough to add 5 Advances to every Career Skill"), then
 * ensure every non-wildcard career skill exists on the character (Core p.35). Sum is
 * exactly 40 with each skill at 5 (≤10 cap).
 *
 * Defensive branch for data variance (careers with ≠ 8 skills): distribute 40 as
 * evenly as possible (floor each + remainder from the top), clamped so no skill
 * exceeds the 10-cap (cap compliance takes precedence over reaching 40, Core p.35).
 */
export function distributeCareerSkillAdvances(char: Character, careerSkills: string[]): Character {
  const n = careerSkills.length;
  if (n > 0) {
    if (n === 8) {
      // Standard Core case: +5 to each of 8 skills → sum 40, max 5.
      for (const s of careerSkills) applySkillAdvance(char, s, 5);
    } else {
      // Defensive even split with the 10-cap (Core p.35 cap compliance wins).
      const base = Math.floor(40 / n);
      const remainder = 40 - base * n;
      careerSkills.forEach((s, i) => {
        const extra = i < remainder ? 1 : 0;
        const advances = Math.min(10, base + extra);
        applySkillAdvance(char, s, advances);
      });
    }
  }
  return ensureCareerSkillsExist(char, careerSkills);
}

// ─── Step 8: Career talent (Core p.35) ───────────────────────────────────────

/** Pick exactly one of the four level-1 career talents (Core p.35). */
export function pickCareerTalent(rng: RNG, char: Character, careerTalents: string[]): void {
  if (careerTalents.length === 0) return; // defensive: no talents to pick.
  addTalent(char, pick(rng, careerTalents));
}

// ─── Step 9: Derived attributes (Core p.33–34) ───────────────────────────────

/**
 * Build the derived attributes from species data (Core p.33–34):
 *  - Movement: Walk = Move ×2, Run = Move ×4.
 *  - Extra Points split: floor(extraPoints / 2) → Fate, remainder → Resilience
 *    (confirmed interpretation; the total is fixed by the Attributes Table, the split
 *    is a creation choice). Fortune = Fate, Resolve = Resilience.
 *  - woundsUseSB and speciesExtraPoints copied from the species data.
 */
export function buildDerived(char: Character, speciesKey: string): void {
  const data = SPECIES_DATA[speciesKey];
  const move = data?.move ?? 4;
  char.move = { m: move, w: move * 2, r: move * 4 }; // Core p.34 Movement.

  const extraPoints = data?.extraPoints ?? 0;
  const fateExtra = Math.floor(extraPoints / 2); // confirmed split (Design §9).
  const resilienceExtra = extraPoints - fateExtra;

  const baseFate = data?.fate ?? 0;
  const baseResilience = data?.resilience ?? 0;
  char.fate = baseFate + fateExtra; // Core p.33–34 Fate.
  char.fortune = char.fate; // Core p.34: Fortune starts equal to Fate.
  char.resilience = baseResilience + resilienceExtra; // Core p.33–34 Resilience.
  char.resolve = char.resilience; // Core p.34: Resolve starts equal to Resilience.

  char.speciesExtraPoints = extraPoints;
  char.woundsUseSB = data?.woundsUseSB ?? false; // Core p.34 (Halflings exclude SB).
}

// ─── Step 10: Gear assembly (Core p.36–37) ───────────────────────────────────

/**
 * Assemble starting gear from career trappings (Core p.36) + class trappings
 * (Core p.37). Each granted string is resolved via `resolveTrapping` and routed into
 * `weapons` / `armour` / `trappings` on the character. Mutates `char` in place.
 */
export function assembleGear(
  rng: RNG,
  char: Character,
  level1: CareerLevel,
  className: string,
): void {
  const entries = [
    ...(level1.trappings ?? []), // Career Trappings (Core p.36).
    ...(CLASS_TRAPPINGS[className] ?? []), // Class Trappings (Core p.37).
  ];
  for (const entry of entries) {
    for (const resolved of resolveTrapping(entry, rng)) {
      if (resolved.kind === 'weapon') char.weapons.push(resolved.item);
      else if (resolved.kind === 'armour') char.armour.push(resolved.item);
      else char.trappings.push(resolved.item);
    }
  }
}

// ─── Step 11: Starting wealth (Core p.37) ────────────────────────────────────

/**
 * Roll starting wealth from the career status string (Core p.37). The status is
 * "Tier Standing" (e.g. "Silver 2"). Per Status Level (Standing):
 *   Brass  → 2d10 brass pennies  (wD)
 *   Silver → 1d10 silver shillings (wSS)
 *   Gold   → 1 Gold crown        (wGC)
 *
 * Unparseable status (unknown tier or non-numeric standing) → zero wealth, no throw
 * (keeps generation total; avoids inventing a wealth value — Core p.37 / Req 13.3).
 */
export function rollStartingWealth(
  rng: RNG,
  status: string,
): { wD: number; wSS: number; wGC: number } {
  const result = { wD: 0, wSS: 0, wGC: 0 };
  const parts = status.trim().split(/\s+/);
  if (parts.length < 2) return result; // unparseable → zero wealth, no throw.

  const tier = parts[0];
  const standing = parseInt(parts[1], 10);
  if (!Number.isFinite(standing) || standing <= 0) return result; // unparseable → zero.

  if (tier === 'Brass') {
    // 2d10 brass pennies per Status Level (Core p.37) → 2×standing d10 summed.
    for (let i = 0; i < 2 * standing; i++) result.wD += rollD10(rng);
  } else if (tier === 'Silver') {
    // 1d10 silver shillings per Status Level (Core p.37).
    for (let i = 0; i < standing; i++) result.wSS += rollD10(rng);
  } else if (tier === 'Gold') {
    // 1 Gold crown per Status Level (Core p.37).
    result.wGC = standing;
  }
  // Any other tier string → zero wealth (unparseable; no throw).
  return result;
}

// ─── Step 11a: Personal details — age/height/hair/eyes/feature ───────────────

/**
 * Populate the character's personal details (Core p.24–25 "Height and Age" plus the
 * species colour/feature tables; Dwarf features from the dwarfguide.md p.40 alternate
 * d100 table). Mirrors the behaviour of `usePersonalDetailsGeneration` but routes every
 * die through the RNG seam — NO `Math.random` (Req 16.8–16.9 determinism). Reuses the
 * pure logic in `logic/personal-details.ts`; this function only sources the dice.
 *
 * If the species has no recognised SpeciesGroup, the fields are left at their blank
 * defaults and no error is thrown (Req 16.2 — unknown species degrades gracefully).
 */
export function buildPersonalDetails(rng: RNG, char: Character, species: string): void {
  const group = getSpeciesGroup(species);
  if (!group) return; // Unknown species → leave age/height/hair/eyes/feature blank, no throw.

  // Age (Req 16.1; Core p.24–25). Full-auto uses the default AGE_FORMULAS tier for
  // High Elves (no interactive tier prompt), so no HighElfAgeTier is passed.
  const ageDice = Array.from({ length: AGE_FORMULAS[group].diceCount }, () => rollD10(rng));
  char.age = String(generateAge(group, ageDice));

  // Height (Req 16.1, 16.3; Core p.24–25). Humans roll a bonus die when either of the
  // two height dice is a 10 (`humanHeightNeedsBonus`).
  const heightDice = Array.from({ length: HEIGHT_FORMULAS[group].diceCount }, () => rollD10(rng));
  if (group === 'Human' && humanHeightNeedsBonus(heightDice as [number, number])) {
    const bonusDie = rollD10(rng);
    char.height = generateHeight(group, heightDice, bonusDie);
  } else {
    char.height = generateHeight(group, heightDice);
  }

  // Hair (Req 16.1; Core p.24–25). 2d10 summed (dice[0] + dice[1]).
  char.hair = lookupHairColour(group, rollD10(rng) + rollD10(rng));

  // Eyes (Req 16.1, 16.4; Core p.24–25). 2d10 summed; High/Wood Elves roll a second
  // 2d10 and combine the two colours into a variegated result.
  const firstEyes = lookupEyeColour(group, rollD10(rng) + rollD10(rng));
  if (group === 'High_Elf' || group === 'Wood_Elf') {
    const secondEyes = lookupEyeColour(group, rollD10(rng) + rollD10(rng));
    char.eyes = formatVariegatedEyes(firstEyes, secondEyes);
  } else {
    char.eyes = firstEyes;
  }

  // Distinguishing feature (Req 16.5, 16.6). Dwarves use the official d100 alternate
  // table (dwarfguide.md p.40); every other species draws from the curated flavour
  // pool (no mechanical effect; see data/distinguishing-features.ts).
  if (group === 'Dwarf') {
    char.distinguishingFeature = lookupDwarfAlternateTable(rollD100(rng), species).feature;
  } else {
    char.distinguishingFeature = pick(rng, resolveFeaturePool(group));
  }
}

// ─── Step 1b: Sex (flavour only) ─────────────────────────────────────────────

/**
 * Roll a random sex for a generated character. Flavour only, with NO mechanical
 * effect: random generation picks 'Male' or 'Female' with equal probability. 'Other'
 * is a deliberate player choice offered in the UI dropdown and is never auto-rolled.
 * Rolled up front (before the name) so the generated name can be drawn from the
 * matching sex's curated name list.
 */
export function rollSex(rng: RNG): 'Male' | 'Female' {
  return pick(rng, ['Male', 'Female'] as const);
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

/**
 * Generate a complete, rules-legal `Character` from an injectable RNG. Pure and
 * deterministic under a seeded RNG (Req 1.5). Builds over `structuredClone(BLANK_CHARACTER)`,
 * exactly as CharacterWizard.buildCharacter does, and never sets `wCur` — the existing
 * wound backfill (useCharacter) initialises current wounds to the wound maximum
 * (Core p.36–37; Req 12.1–12.2).
 *
 * Bonus XP = 20 (species, p.24) + 25 (characteristic rearrange, p.33) + 50 (random
 * career, p.30–31; confirmed interpretation) = 95, left unspent (xpCur = xpTotal = 95,
 * xpSpent = 0; Req 10.x).
 */
export function generateRandomCharacter(rng: RNG): Character {
  const char = structuredClone(BLANK_CHARACTER);

  // Step 1 — Species (Core p.24).
  const species = rollSpecies(rng);
  char.species = species;
  const speciesData = SPECIES_DATA[species];

  // Step 1b — Sex (flavour only). Rolled before the name so the name matches the sex.
  char.sex = rollSex(rng);

  // Name — curated flavour pool for the species, filtered to the rolled sex so a male
  // never gets a female name or vice versa (Req 2.1; no mechanical effect).
  char.name = pick(rng, resolveNamePool(species, char.sex));

  // Step 2 — Eligible career (Core p.30–31).
  const career = pickEligibleCareer(rng, species);
  const scheme = CAREER_SCHEMES[career];
  const level1 = scheme.level1 as CareerLevel; // guaranteed by pickEligibleCareer's filter.
  char.class = scheme.class;
  char.career = career;
  char.careerPath = career;
  char.careerLevel = level1.title;
  char.status = level1.status;

  // Step 3 — Characteristics: roll, rearrange, modify (Core p.33).
  const rolls = rollCharacteristics(rng);
  const schemeChars = level1.characteristics;
  const assigned = assignByRearrange(rolls, schemeChars);
  // Step 4 — Characteristic advances (Core p.34).
  const advances = distributeCharAdvances(schemeChars);
  for (const k of CHARACTERISTIC_KEYS) {
    const specMod = speciesData?.chars[k] ?? 0; // Attributes Table modifier (Core p.33).
    char.chars[k] = { i: assigned[k] + specMod, a: advances[k], b: 0 };
  }

  // Step 5 — Species skills (Core p.35).
  pickSpeciesSkills(rng, char, speciesData?.skills ?? []);
  char.speciesSkills = speciesData?.skills ?? []; // copy verbatim (Req 6.4).

  // Step 6 — Species talents (Core p.35).
  resolveSpeciesTalents(rng, char, species);
  char.speciesTalents = speciesData?.talents ?? []; // copy verbatim (Req 7.5).

  // Step 7 — Career skills (Core p.35). Reassign because ensureCareerSkillsExist
  // returns a new character (immutable helper).
  const withCareerSkills = distributeCareerSkillAdvances(char, level1.skills);
  Object.assign(char, withCareerSkills);

  // Step 8 — Career talent (Core p.35).
  pickCareerTalent(rng, char, level1.talents);

  // Step 9 — Derived attributes (Core p.33–34).
  buildDerived(char, species);

  // Step 10 — Gear assembly (Core p.36–37).
  assembleGear(rng, char, level1, scheme.class);

  // Step 11 — Starting wealth (Core p.37).
  const wealth = rollStartingWealth(rng, level1.status);
  char.wD = wealth.wD;
  char.wSS = wealth.wSS;
  char.wGC = wealth.wGC;

  // Step 11a — Personal details (Core p.24–25; dwarfguide.md p.40). Appended AFTER all
  // existing RNG consumption so earlier seeded outputs stay byte-for-byte identical.
  buildPersonalDetails(rng, char, species);

  // XP: Bonus XP total = 95, unspent (Core p.24 / p.30–31 / p.33; Req 10.x).
  char.xpCur = 95;
  char.xpTotal = 95;
  char.xpSpent = 0;

  // wCur deliberately left unset (0) — backfilled to the wound maximum downstream
  // (Core p.36–37; Req 12.1–12.2).
  return char;
}
