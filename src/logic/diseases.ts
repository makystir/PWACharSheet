import type { DiseaseEntry } from '../data/diseases';
import type { SymptomEntry } from '../data/symptoms';
import { DISEASE_REGISTRY } from '../data/diseases';
import { SYMPTOM_CATALOGUE } from '../data/symptoms';
import type { DifficultyLevel } from './dice-roller';
import type { Character } from '../types/character';
import { getBonus } from './calculators';

/**
 * Find a disease by exact case-sensitive name match.
 */
export function findDisease(name: string): DiseaseEntry | undefined {
  return DISEASE_REGISTRY.find(d => d.name === name);
}

/**
 * Find a symptom by exact case-sensitive name match.
 */
export function findSymptom(name: string): SymptomEntry | undefined {
  return SYMPTOM_CATALOGUE.find(s => s.name === name);
}

/**
 * A symptom reference may carry a severity tag, e.g. "Flux (Severe)".
 * Split it into the base symptom name and the optional severity.
 */
export function parseSymptomReference(ref: string): { baseName: string; severity: string | null } {
  const match = ref.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { baseName: match[1].trim(), severity: match[2].trim() };
  }
  return { baseName: ref.trim(), severity: null };
}

/** A resolved disease symptom, including any per-disease severity tag. */
export interface ResolvedSymptom extends SymptomEntry {
  /** Severity tag from the disease reference (e.g. "Severe"), or null. */
  severity: string | null;
  /** Display name including severity, e.g. "Flux (Severe)". */
  displayName: string;
}

/**
 * Get the resolved symptom entries for a disease, in order.
 * Returns undefined if the disease name is not found.
 * Parses optional severity tags (e.g. "Blight (Moderate)") and resolves the
 * base name against the symptom catalogue. Defensively filters out any
 * unresolved symptom references.
 */
export function getDiseaseSymptoms(diseaseName: string): ResolvedSymptom[] | undefined {
  const disease = findDisease(diseaseName);
  if (!disease) {
    return undefined;
  }
  return disease.symptoms
    .map((ref) => {
      const { baseName, severity } = parseSymptomReference(ref);
      const entry = findSymptom(baseName);
      if (!entry) return undefined;
      return {
        ...entry,
        severity,
        displayName: severity ? `${entry.name} (${severity})` : entry.name,
      };
    })
    .filter((s): s is ResolvedSymptom => s !== undefined);
}

// ─── Dice-expression rolling (for Incubation / Duration) ─────────────────────

/** A parsed/rolled dice expression, e.g. "3d10+10" → rolls, modifier, total. */
export interface DiceRollResult {
  /** Canonical notation, e.g. "3d10+10". */
  notation: string;
  /** The individual die results, in order. */
  rolls: number[];
  /** Flat modifier added after the dice (may be negative). */
  modifier: number;
  /** Sum of rolls + modifier (never below 0). */
  total: number;
}

/** Random source returning an integer in [1, sides]. Injectable for tests. */
export type DieRoller = (sides: number) => number;

const defaultDieRoller: DieRoller = (sides) => Math.floor(Math.random() * sides) + 1;

/**
 * Parse a dice expression of the form NdX, NdX+M, or NdX-M (whitespace tolerant).
 * Returns null if the string does not contain a dice expression.
 */
export function parseDiceExpression(expr: string): { count: number; sides: number; modifier: number } | null {
  const match = expr.match(/(\d+)\s*d\s*(\d+)\s*([+-]\s*\d+)?/i);
  if (!match) return null;
  const count = parseInt(match[1], 10);
  const sides = parseInt(match[2], 10);
  const modifier = match[3] ? parseInt(match[3].replace(/\s+/g, ''), 10) : 0;
  return { count, sides, modifier };
}

/**
 * Roll a dice expression such as "1d10", "3d10+10", or "1d10+7".
 * Returns null if no dice expression is present (e.g. "Instant").
 */
export function rollDiceExpression(expr: string, roller: DieRoller = defaultDieRoller): DiceRollResult | null {
  const parsed = parseDiceExpression(expr);
  if (!parsed) return null;
  const { count, sides, modifier } = parsed;
  const rolls: number[] = [];
  for (let i = 0; i < count; i++) {
    rolls.push(roller(sides));
  }
  const sum = rolls.reduce((a, b) => a + b, 0);
  const modStr = modifier === 0 ? '' : modifier > 0 ? `+${modifier}` : `${modifier}`;
  return {
    notation: `${count}d${sides}${modStr}`,
    rolls,
    modifier,
    total: Math.max(0, sum + modifier),
  };
}

/** A disease timing (Incubation or Duration) resolved into a rolled value. */
export interface TimingRollResult {
  /** The dice roll breakdown. */
  dice: DiceRollResult;
  /** The time unit parsed from the timing string (e.g. "days", "hours"). */
  unit: string;
  /** Human-readable result, e.g. "11 days". */
  display: string;
  /** Breakdown string for a tooltip, e.g. "3d10+10 → [4, 6, 2]+10 = 22 days". */
  breakdown: string;
}

/** Extract the time unit (days/hours/minutes/etc.) from a timing string. */
function parseTimingUnit(timing: string): string {
  const match = timing.match(/\b(minutes?|hours?|days?|weeks?|months?|years?|rounds?)\b/i);
  return match ? match[1].toLowerCase() : 'days';
}

/**
 * Roll a disease timing string such as "3d10+10 days" or "1d10 hours".
 * Returns null when the timing has no dice to roll (e.g. "Instant"), or when
 * the string only contains a conditional note without a leading dice term.
 */
export function rollDiseaseTiming(timing: string, roller: DieRoller = defaultDieRoller): TimingRollResult | null {
  const dice = rollDiceExpression(timing, roller);
  if (!dice) return null;
  const unit = parseTimingUnit(timing);
  const rollsStr = dice.rolls.join(', ');
  const modStr = dice.modifier === 0 ? '' : dice.modifier > 0 ? `+${dice.modifier}` : `${dice.modifier}`;
  return {
    dice,
    unit,
    display: `${dice.total} ${unit}`,
    breakdown: `${dice.notation} → [${rollsStr}]${modStr} = ${dice.total} ${unit}`,
  };
}

// ─── Active Disease Management ────────────────────────────────────────────────

/** A persisted rolled timing value stored on an active disease. */
export interface RolledTiming {
  /** The resolved total (e.g. 11). */
  total: number;
  /** The time unit (e.g. "days"). */
  unit: string;
  /** Breakdown for display/tooltip. */
  breakdown: string;
}

export interface ActiveDisease {
  id: number;
  diseaseName: string;
  contracted: number;   // Date.now() timestamp (real-world, when the record was added)
  notes: string;
  /** Rolled incubation result (persisted once rolled). */
  rolledIncubation?: RolledTiming;
  /** Rolled duration result (persisted once rolled). */
  rolledDuration?: RolledTiming;
  /**
   * In-game days the character has had the disease so far. WFRP diseases
   * progress in game time (not real time), so this is tracked manually and
   * compared against the rolled Duration. Defaults to 0.
   */
  elapsedDays?: number;
}

/**
 * Add a new active disease record with auto-incrementing ID and timestamp.
 * Returns a new array without mutating the input.
 */
export function addDisease(diseases: ActiveDisease[], diseaseName: string): ActiveDisease[] {
  const newId = diseases.length === 0 ? 1 : Math.max(...diseases.map(d => d.id)) + 1;
  const newDisease: ActiveDisease = {
    id: newId,
    diseaseName,
    contracted: Date.now(),
    notes: '',
  };
  return [...diseases, newDisease];
}

/**
 * Remove an active disease by ID.
 * Returns a new array without mutating the input.
 * No-op if the ID is not found.
 */
export function removeDisease(diseases: ActiveDisease[], id: number): ActiveDisease[] {
  return diseases.filter(d => d.id !== id);
}

/**
 * Update the notes field for an active disease by ID.
 * Returns a new array without mutating the input.
 * No-op if the ID is not found.
 */
export function updateDiseaseNotes(diseases: ActiveDisease[], id: number, notes: string): ActiveDisease[] {
  return diseases.map(d =>
    d.id === id ? { ...d, notes } : d
  );
}

/**
 * Adjust the in-game elapsed days for an active disease by `delta` (may be
 * negative). The result is clamped to a minimum of 0. Returns a new array
 * without mutating the input. No-op if the ID is not found.
 */
export function adjustDiseaseElapsed(diseases: ActiveDisease[], id: number, delta: number): ActiveDisease[] {
  return diseases.map(d =>
    d.id === id ? { ...d, elapsedDays: Math.max(0, (d.elapsedDays ?? 0) + delta) } : d
  );
}

/**
 * Set the in-game elapsed days for an active disease to an absolute value
 * (clamped to a minimum of 0). Returns a new array without mutating the input.
 */
export function setDiseaseElapsed(diseases: ActiveDisease[], id: number, value: number): ActiveDisease[] {
  return diseases.map(d =>
    d.id === id ? { ...d, elapsedDays: Math.max(0, Math.floor(value) || 0) } : d
  );
}

/** Progress of an active disease against its rolled Duration. */
export interface DiseaseProgress {
  /** Elapsed in-game days so far (>= 0). */
  elapsed: number;
  /** The rolled Duration total, if the duration has been rolled. */
  durationTotal: number | null;
  /** The Duration unit (e.g. "days"), if rolled. */
  durationUnit: string | null;
  /** True when a Duration is rolled and elapsed has reached/exceeded it. */
  durationReached: boolean;
}

/**
 * Summarise a disease's elapsed-time progress against its rolled Duration.
 * `durationReached` is only meaningful once a Duration has been rolled.
 */
export function getDiseaseProgress(disease: ActiveDisease): DiseaseProgress {
  const elapsed = disease.elapsedDays ?? 0;
  const rolled = disease.rolledDuration;
  const durationTotal = rolled ? rolled.total : null;
  const durationUnit = rolled ? rolled.unit : null;
  return {
    elapsed,
    durationTotal,
    durationUnit,
    durationReached: durationTotal != null && elapsed >= durationTotal,
  };
}

/**
 * Store a rolled Incubation or Duration on an active disease by ID.
 * Returns a new array without mutating the input. No-op if the ID is not found.
 */
export function setDiseaseTiming(
  diseases: ActiveDisease[],
  id: number,
  field: 'rolledIncubation' | 'rolledDuration',
  value: RolledTiming,
): ActiveDisease[] {
  return diseases.map(d => (d.id === id ? { ...d, [field]: value } : d));
}

// ─── Symptom Tests (recurring rolls a symptom calls for) ─────────────────────

/**
 * Describes a recurring Test that a symptom requires during play, per WFRP4e
 * Core p.187-188. `skill` is the skill/characteristic tested (Endurance or
 * Cool for disease symptoms), `difficulty` the Test Difficulty, and `cadence`
 * a short note on when/how often it is made. Severity-dependent Blight uses a
 * lookup keyed by severity tag.
 */
export interface SymptomTest {
  skill: 'Endurance' | 'Cool';
  difficulty: DifficultyLevel;
  cadence: string;
}

/** Blight's Endurance-or-die Test difficulty scales with severity (Core p.187). */
const BLIGHT_TEST_BY_SEVERITY: Record<string, DifficultyLevel> = {
  '': 'Very Easy',       // standard Blight
  Moderate: 'Easy',
  Severe: 'Average',
};

/**
 * Get the recurring Test a symptom requires, or null if the symptom has no
 * die-roll of its own. `severity` is the tag from the disease reference.
 * Sources: Core Rulebook p.187-188.
 */
export function getSymptomTest(symptomName: string, severity: string | null): SymptomTest | null {
  switch (symptomName) {
    case 'Blight':
      return { skill: 'Endurance', difficulty: BLIGHT_TEST_BY_SEVERITY[severity ?? ''] ?? 'Very Easy', cadence: 'Daily (or die)' };
    case 'Buboes':
      // Only rolled once lanced; surface it so players can track re-swelling.
      return { skill: 'Endurance', difficulty: 'Difficult', cadence: 'Daily once lanced (or buboes return)' };
    case 'Gangrene':
      return { skill: 'Endurance', difficulty: 'Average', cadence: 'Daily (fail > TB times = lose location)' };
    case 'Lingering':
      // Difficulty comes from the severity tag; handled via getLingeringDifficulty.
      return { skill: 'Endurance', difficulty: getLingeringDifficulty(severity), cadence: 'When duration ends' };
    case 'Wounded':
      return { skill: 'Endurance', difficulty: 'Easy', cadence: 'Daily (or gain a Festering Wound)' };
    case 'Pox':
      return { skill: 'Cool', difficulty: 'Average', cadence: 'To resist scratching; again when the Pox ends' };
    default:
      // Convulsions, Coughs and Sneezes, Fever, Flux, Malaise, Nausea:
      // no self-contained die-roll (flat penalties / GM-triggered effects).
      return null;
  }
}

/** Map a Lingering severity tag to its Endurance Test difficulty (Core p.188). */
export function getLingeringDifficulty(severity: string | null): DifficultyLevel {
  switch (severity) {
    case 'Easy': return 'Easy';
    case 'Average': return 'Average';
    case 'Challenging': return 'Challenging';
    case 'Difficult': return 'Difficult';
    case 'Hard': return 'Hard';
    case 'Very Hard': return 'Very Hard';
    case 'Very Easy': return 'Very Easy';
    default: return 'Average';
  }
}

/** True if the symptom requires a Hit Location roll when it manifests (Gangrene). */
export function symptomRollsHitLocation(symptomName: string): boolean {
  return symptomName === 'Gangrene';
}

/**
 * Compute the base target number for a symptom Test from the character:
 * the tested characteristic total (i+a+b) plus any advances in the matching
 * skill (Endurance → T, Cool → WP). Difficulty is applied by performRoll.
 */
export function getSymptomTestBaseTarget(character: Character, skill: 'Endurance' | 'Cool'): number {
  const charKey = skill === 'Endurance' ? 'T' : 'WP';
  const c = character.chars[charKey];
  const charTotal = c.i + c.a + c.b;
  const allSkills = [...character.bSkills, ...character.aSkills];
  const skillEntry = allSkills.find((s) => s.n === skill);
  const advances = skillEntry ? skillEntry.a : 0;
  return charTotal + advances;
}

/** Toughness Bonus, used to show Gangrene's "fail more than TB times" threshold. */
export function getToughnessBonus(character: Character): number {
  const t = character.chars.T;
  return getBonus(t.i + t.a + t.b);
}
