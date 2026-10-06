import { SKILL_GROUPS, type SkillGroupData } from '../data/advanced-skills';

/**
 * Shared reading of grouped skill and talent names such as "Language (Magick)",
 * "Channelling (Any Colour)" or "Art (Calligraphy or Engraving)".
 *
 * Everything that needs to know which group a name belongs to, or whether a
 * character's skill/talent satisfies a career entry, goes through this module.
 * It works on the shape of the name only: no skill, talent or specialisation is
 * listed here, so homebrew specialisations behave like any other.
 */

/** A name split into its group and specialisation. */
export interface GroupedName {
  /** Group name (the part before the parentheses). */
  base: string;
  /** Specialisation inside the parentheses, or null when there is none. */
  spec: string | null;
}

/** How a career entry constrains the specialisation. */
export type RequirementKind = 'bare' | 'any' | 'oneOf' | 'exact';

/** A career skill/talent entry read as a requirement. */
export interface Requirement {
  /** The entry as written. */
  entry: string;
  base: string;
  kind: RequirementKind;
  /** oneOf: the listed specialisations; exact: the single one; otherwise empty. */
  options: string[];
}

export interface SatisfyOptions {
  /**
   * Let a name with no specialisation satisfy an entry that asks for a specific
   * one ("Strider" for "Strider (Woodlands)"). Used for talents, which have
   * always been matched this leniently.
   */
  bareOwnedSatisfiesSpecific?: boolean;
}

// Lower-cased group name or alias -> canonical group name.
const CANONICAL_GROUP = new Map<string, string>();
for (const [group, data] of Object.entries(SKILL_GROUPS)) {
  CANONICAL_GROUP.set(group.toLowerCase(), group);
  for (const alias of data.aliases ?? []) CANONICAL_GROUP.set(alias.toLowerCase(), group);
}

const GROUPED_NAME_RE = /^(.*?)\s*\(([^()]*)\)$/;

function sameText(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Split a name into group and specialisation.
 * Tolerant of spacing ("Channelling(Aqshy)"), empty parentheses ("Stealth ()"
 * has no specialisation) and known spellings of a group ("Channeling").
 */
export function parseGroupedName(name: string): GroupedName {
  const cleaned = name.trim().replace(/\s+/g, ' ');
  const match = GROUPED_NAME_RE.exec(cleaned);
  const rawBase = match ? match[1] : cleaned;
  const spec = match ? match[2].trim() : '';
  return {
    base: CANONICAL_GROUP.get(rawBase.toLowerCase()) ?? rawBase,
    spec: spec === '' ? null : spec,
  };
}

/**
 * The SKILL_GROUPS row for a group name, if it has one. Accepts any spelling the
 * registry knows ("Channeling") and never returns an inherited object property.
 */
export function getSkillGroup(base: string): SkillGroupData | undefined {
  const group = CANONICAL_GROUP.get(base.toLowerCase());
  return group === undefined ? undefined : SKILL_GROUPS[group];
}

/** Build the canonical "Group (Specialisation)" form of a name. */
export function buildGroupedName(base: string, spec: string | null): string {
  return spec ? `${base} (${spec})` : base;
}

/**
 * Name for a placeholder once its specialisation is chosen: "Language (Any)"
 * with "Battle" gives "Language (Battle)". Also accepts a full name typed by
 * hand ("Language (Battle)") and an empty choice, which gives the bare group.
 */
export function specialiseName(placeholderName: string, specialisation: string): string {
  const { base } = parseGroupedName(placeholderName);
  const typed = parseGroupedName(specialisation);
  if (sameText(typed.base, base)) return buildGroupedName(base, typed.spec);
  // Parentheses inside a specialisation would stop the name reading as a group.
  const spec = specialisation.replace(/[()]/g, ' ').trim().replace(/\s+/g, ' ');
  return buildGroupedName(base, spec === '' ? null : spec);
}

/** True when the name belongs to the given group, whatever its specialisation. */
export function inGroup(name: string, group: string): boolean {
  return sameText(parseGroupedName(name).base, parseGroupedName(group).base);
}

/**
 * Read a career entry as a requirement:
 * - "Channelling"                                 -> bare
 * - "Language (Any)", "Channelling (Any Colour)"  -> any
 * - "Art (Calligraphy or Engraving)",
 *   "Trade (Blacksmith, Goldsmith, or Engineer)"  -> oneOf
 * - "Language (Magick)"                           -> exact
 */
export function parseRequirement(entry: string): Requirement {
  const { base, spec } = parseGroupedName(entry);
  if (spec === null) return { entry, base, kind: 'bare', options: [] };
  if (/^any\b/i.test(spec)) return { entry, base, kind: 'any', options: [] };
  if (/\sor\s/i.test(spec)) {
    const options = spec.split(/\s*,\s*(?:or\s+)?|\s+or\s+/i).map(o => o.trim()).filter(o => o !== '');
    return { entry, base, kind: 'oneOf', options };
  }
  return { entry, base, kind: 'exact', options: [spec] };
}

/** True for a name that still needs a specialisation chosen ("Language (Any)"). */
export function isPlaceholderName(name: string): boolean {
  const kind = parseRequirement(name).kind;
  return kind === 'any' || kind === 'oneOf';
}

function satisfies(req: Requirement, owned: Requirement, options: SatisfyOptions): boolean {
  if (!sameText(req.base, owned.base)) return false;
  // Bare and wildcard entries take anything in the group: any specialisation,
  // none at all, or a placeholder not yet filled in.
  if (req.kind === 'bare' || req.kind === 'any') return true;
  if (owned.kind === 'bare') return options.bareOwnedSatisfiesSpecific === true;
  if (req.kind === 'oneOf') {
    // An unfilled placeholder only stands in for the very same choice.
    if (owned.kind === 'oneOf') {
      return owned.options.length === req.options.length
        && owned.options.every(o => req.options.some(r => sameText(r, o)));
    }
    return owned.kind === 'exact' && req.options.some(r => sameText(r, owned.options[0]));
  }
  return owned.kind === 'exact' && sameText(req.options[0], owned.options[0]);
}

/**
 * Does a character's skill/talent name satisfy a career entry?
 *
 * | Entry                         | Satisfied by (same group)                  |
 * |-------------------------------|--------------------------------------------|
 * | bare  "Channelling"           | any or no specialisation                   |
 * | any   "Language (Any)"        | any or no specialisation                   |
 * | oneOf "Play (Drum or Fife)"   | one of the listed specialisations          |
 * | exact "Language (Magick)"     | that specialisation only                   |
 *
 * Comparison ignores case and spacing. No list of known specialisations is
 * consulted, so homebrew specialisations count.
 */
export function satisfiesRequirement(entry: string, ownedName: string, options: SatisfyOptions = {}): boolean {
  if (entry === ownedName) return true;
  return satisfies(parseRequirement(entry), parseRequirement(ownedName), options);
}

const KIND_ORDER: Record<RequirementKind, number> = { exact: 0, oneOf: 1, bare: 2, any: 3 };

/**
 * Assign owned names to career entries so that each owned name fills at most one
 * entry and as many entries as possible are filled (maximum bipartite matching).
 *
 * One "Language (Magick)" therefore cannot fill both "Language (Magick)" and
 * "Language (Any)", and two languages that are not Magick fill only the wildcard.
 * Specific entries are placed first so they keep their own specialisation and the
 * wildcard takes what is left.
 *
 * Returns, for each entry, the index into `ownedNames` filling it, or -1.
 */
export function assignSlots(entries: string[], ownedNames: string[], options: SatisfyOptions = {}): number[] {
  const reqs = entries.map(parseRequirement);
  const owned = ownedNames.map(parseRequirement);
  const fills = reqs.map((req, e) => owned.map((o, i) => entries[e] === ownedNames[i] || satisfies(req, o, options)));

  // entryOf[i] is the entry currently holding owned name i, or -1.
  const entryOf = new Array<number>(owned.length).fill(-1);
  const tryFill = (entry: number, seen: boolean[]): boolean => {
    for (let i = 0; i < owned.length; i++) {
      if (!fills[entry][i] || seen[i]) continue;
      seen[i] = true;
      if (entryOf[i] === -1 || tryFill(entryOf[i], seen)) {
        entryOf[i] = entry;
        return true;
      }
    }
    return false;
  };

  const order = reqs.map((_, e) => e).sort((a, b) => KIND_ORDER[reqs[a].kind] - KIND_ORDER[reqs[b].kind] || a - b);
  for (const entry of order) tryFill(entry, new Array<boolean>(owned.length).fill(false));

  const filledBy = new Array<number>(entries.length).fill(-1);
  entryOf.forEach((entry, i) => { if (entry !== -1) filledBy[entry] = i; });
  return filledBy;
}
