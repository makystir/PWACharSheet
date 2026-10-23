import type { Character, RangedDamageSBMode } from '../types/character';
import { BLANK_CHARACTER } from '../types/character';
import { importFromJSON } from '../storage/export-import';
import { isValidPortraitDataUrl } from '../storage/portrait-codec';

/**
 * Highest character schema version this build understands. Mirrors
 * export-import.ts CURRENT_VERSION / the Character._v literal (8). A shared
 * payload claiming a newer version is rejected before import.
 */
export const CURRENT_VERSION = 8;

/**
 * Array-valued Character fields that `importFromJSON` copies verbatim from the
 * (untrusted) source. deepMergeImport preserves present-but-wrong-typed values,
 * so each of these must be re-normalised to an array after import. Single
 * source of truth shared by the validator and its hardening test.
 */
export const ARRAY_FIELDS = [
  'weapons', 'armour', 'bSkills', 'aSkills', 'talents', 'trappings',
  'conditions', 'spells', 'ammo', 'mutations', 'diseases',
] as const;

/** Scalar numeric fields that must coerce non-finite values to 0. */
const SCALAR_NUMERIC_FIELDS = [
  'wCur', 'corr', 'sin', 'fate', 'fortune', 'wGC', 'wSS', 'wD',
] as const;

const RANGED_SB_MODES: RangedDamageSBMode[] = ['none', 'halfSB', 'fullSB'];

export type ValidateResult =
  | { ok: true; character: Character }
  | { ok: false; error: string };

function isFiniteNumber(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Validate and normalise an untrusted shared-character JSON string into a
 * Character safe for deriveSheetTotals and read-only display.
 *
 * Order:
 *  1. Version pre-check — parse raw JSON and reject unless `_v` is a finite
 *     number <= CURRENT_VERSION. This catches a non-numeric `_v` (e.g. 'abc',
 *     null) that importFromJSON would otherwise relabel to the current version.
 *  2. Delegate structural validation + BLANK_CHARACTER merge to importFromJSON.
 *  3. Normalise in place: array fields, chars triples, movement, houseRules,
 *     species, armour worn flags, scalar numerics, and portrait.
 *
 * Performs no storage writes.
 */
export function validateSharedPayload(json: string): ValidateResult {
  // (1) Version pre-check on the raw parse.
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'Invalid JSON: failed to parse.' };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Invalid data: expected a JSON object.' };
  }
  const rawObj = raw as Record<string, unknown>;
  if (!isFiniteNumber(rawObj._v) || rawObj._v > CURRENT_VERSION) {
    return {
      ok: false,
      error: `Unsupported version: maximum supported version is ${CURRENT_VERSION}.`,
    };
  }

  // Pre-coerce array fields on the RAW object before importFromJSON. Its
  // deepMerge copies them verbatim, and its armour-migration step calls
  // .map/.length assuming an array — a present-but-wrong-typed `armour`
  // (e.g. a string) would otherwise throw inside importFromJSON. Coercing here
  // keeps that delegation crash-free.
  for (const field of ARRAY_FIELDS) {
    if (!Array.isArray(rawObj[field])) {
      rawObj[field] = [];
    }
  }

  // (2) Structural validation + merge onto BLANK_CHARACTER.
  const imported = importFromJSON(JSON.stringify(rawObj));
  if (!imported.success || !imported.character) {
    return { ok: false, error: imported.error ?? 'Invalid data.' };
  }
  const c = imported.character as unknown as Record<string, unknown>;

  // (3) Normalise in place.
  // Array fields: non-array -> [] (defensive; already coerced on the raw input).
  for (const field of ARRAY_FIELDS) {
    const v = c[field];
    if (!Array.isArray(v)) {
      c[field] = [];
    }
  }

  // Characteristic triples: a non-object triple -> {i:0,a:0,b:0}; non-finite
  // i/a/b -> 0. deriveSheetTotals reads chars[k].{i,a,b}, so each must be a
  // well-formed triple of finite numbers.
  const chars = c.chars;
  if (!chars || typeof chars !== 'object' || Array.isArray(chars)) {
    c.chars = structuredClone(BLANK_CHARACTER.chars);
  } else {
    const charsObj = chars as Record<string, unknown>;
    for (const key of Object.keys(charsObj)) {
      const triple = charsObj[key];
      if (!triple || typeof triple !== 'object' || Array.isArray(triple)) {
        charsObj[key] = { i: 0, a: 0, b: 0 };
        continue;
      }
      const t = triple as Record<string, unknown>;
      for (const comp of ['i', 'a', 'b'] as const) {
        if (!isFiniteNumber(t[comp])) t[comp] = 0;
      }
    }
  }

  // Movement m/w/r: non-object -> {m:0,w:0,r:0}; non-finite component -> 0.
  const move = c.move;
  if (!move || typeof move !== 'object' || Array.isArray(move)) {
    c.move = { m: 0, w: 0, r: 0 };
  } else {
    const m = move as Record<string, unknown>;
    for (const comp of ['m', 'w', 'r'] as const) {
      if (!isFiniteNumber(m[comp])) m[comp] = 0;
    }
  }

  // House rules: non-object -> BLANK default; validate the fields we rely on.
  if (!c.houseRules || typeof c.houseRules !== 'object' || Array.isArray(c.houseRules)) {
    c.houseRules = structuredClone(BLANK_CHARACTER.houseRules);
  } else {
    const hr = c.houseRules as Record<string, unknown>;
    if (!RANGED_SB_MODES.includes(hr.rangedDamageSBMode as RangedDamageSBMode)) {
      hr.rangedDamageSBMode = BLANK_CHARACTER.houseRules.rangedDamageSBMode;
    }
    if (typeof hr.ignoreBackpackEnc !== 'boolean') {
      hr.ignoreBackpackEnc = BLANK_CHARACTER.houseRules.ignoreBackpackEnc;
    }
  }

  // Species: non-string -> ''.
  if (typeof c.species !== 'string') {
    c.species = '';
  }

  // Armour worn flags: worn defaults to true unless explicitly false.
  const armour = c.armour;
  if (Array.isArray(armour)) {
    for (const item of armour) {
      if (item && typeof item === 'object') {
        (item as Record<string, unknown>).worn = (item as Record<string, unknown>).worn !== false;
      }
    }
  }

  // Scalar numerics: non-finite -> 0.
  for (const field of SCALAR_NUMERIC_FIELDS) {
    if (!isFiniteNumber(c[field])) {
      c[field] = 0;
    }
  }

  // Portrait: keep only a valid data-URL, else ''.
  if (typeof c.portrait !== 'string' || !isValidPortraitDataUrl(c.portrait)) {
    c.portrait = '';
  }

  return { ok: true, character: c as unknown as Character };
}
