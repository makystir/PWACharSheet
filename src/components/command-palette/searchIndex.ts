import { SPELL_LIST } from '../../data/spells';
import { TALENT_DB } from '../../data/talents';
import { ADV_SKILL_DB } from '../../data/advanced-skills';
import { SKILL_DESCRIPTIONS, getSkillDescription } from '../../data/skill-descriptions';
import { CAREER_SCHEMES } from '../../data/careers';
import { RUNE_CATALOGUE } from '../../data/runes';
import { RITUAL_LIST } from '../../data/rituals';
import { CONDITIONS } from '../../data/conditions';
import { BLANK_CHARACTER } from '../../types/character';
import type { SpellData, TalentData, ConditionData, CareerScheme, CareerLevel } from '../../types/character';
import type { RitualData } from '../../data/rituals';
import type { RuneDefinition } from '../../data/runes';
import { fuzzyMatch } from './fuzzyMatch';

// ─── Entity Types ────────────────────────────────────────────────────────────

export type EntityType = 'spell' | 'talent' | 'skill' | 'career' | 'rune' | 'ritual' | 'condition';

// ─── Display Data Interfaces ─────────────────────────────────────────────────

export interface SpellDisplayData {
  type: 'spell';
  cn: string;
  lore: string;
  range: string;
  target: string;
  duration: string;
  effect: string;
}

export interface TalentDisplayData {
  type: 'talent';
  max: string;
  desc: string;
}

export interface SkillDisplayData {
  type: 'skill';
  characteristic: string;
  description: string;
}

export interface CareerDisplayData {
  type: 'career';
  class: string;
  levels: CareerLevelSummary[];
}

export interface CareerLevelSummary {
  title: string;
  status: string;
  characteristics: string[];
  skills: string[];
  talents: string[];
}

export interface RuneDisplayData {
  type: 'rune';
  category: string;
  isMaster: boolean;
  maxPerItem: number;
  xpCost: number;
  effects: string;
  description: string;
}

export interface RitualDisplayData {
  type: 'ritual';
  cn: number;
  ritualType: string;
  learningXP: number;
  ingredients: string;
  conditions: string;
  description: string;
}

export interface ConditionDisplayData {
  type: 'condition';
  stackable: boolean;
  description: string;
  effects: string;
  duration: string;
  removedBy: string;
}

export type EntityDisplayData =
  | SpellDisplayData
  | TalentDisplayData
  | SkillDisplayData
  | CareerDisplayData
  | RuneDisplayData
  | RitualDisplayData
  | ConditionDisplayData;

// ─── Searchable Entity ───────────────────────────────────────────────────────

export interface SearchableEntity {
  id: string;
  name: string;
  type: EntityType;
  searchText: string; // pre-computed: name + description concatenated, lowercased
  displayData: EntityDisplayData;
}

// ─── Mapper Functions ────────────────────────────────────────────────────────

function safe(value: string | undefined | null): string {
  return value ?? '';
}

function spellToSearchable(spell: SpellData): SearchableEntity {
  const name = safe(spell.name);
  const effect = safe(spell.effect);
  return {
    id: `spell-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    type: 'spell',
    searchText: `${name} ${effect}`.toLowerCase(),
    displayData: {
      type: 'spell',
      cn: safe(spell.cn),
      lore: safe(spell.lore),
      range: safe(spell.range),
      target: safe(spell.target),
      duration: safe(spell.duration),
      effect,
    },
  };
}

function talentToSearchable(talent: TalentData): SearchableEntity {
  const name = safe(talent.name);
  const desc = safe(talent.desc);
  return {
    id: `talent-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    type: 'talent',
    searchText: `${name} ${desc}`.toLowerCase(),
    displayData: {
      type: 'talent',
      max: safe(talent.max),
      desc,
    },
  };
}

function skillToSearchable(skillName: string, characteristic: string, description: string): SearchableEntity {
  return {
    id: `skill-${skillName.toLowerCase().replace(/\s+/g, '-')}`,
    name: skillName,
    type: 'skill',
    searchText: `${skillName} ${description}`.toLowerCase(),
    displayData: {
      type: 'skill',
      characteristic,
      description,
    },
  };
}

function buildSkillEntries(): SearchableEntity[] {
  const seen = new Set<string>();
  const entries: SearchableEntity[] = [];

  // Basic skills from BLANK_CHARACTER
  for (const skill of BLANK_CHARACTER.bSkills) {
    const name = safe(skill.n);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const desc = getSkillDescription(name);
    entries.push(skillToSearchable(name, safe(skill.c), desc));
  }

  // Advanced skills from ADV_SKILL_DB
  for (const skill of ADV_SKILL_DB) {
    const name = safe(skill.n);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    const desc = getSkillDescription(name);
    entries.push(skillToSearchable(name, safe(skill.c), desc));
  }

  // Any skills from SKILL_DESCRIPTIONS not yet covered
  for (const [name, desc] of Object.entries(SKILL_DESCRIPTIONS)) {
    if (seen.has(name)) continue;
    seen.add(name);
    // Extract characteristic from description if available (format: "... (Char, ...)")
    const charMatch = desc.match(/\((\w+),/);
    const characteristic = charMatch ? charMatch[1] : '';
    entries.push(skillToSearchable(name, characteristic, desc));
  }

  return entries;
}

function careerLevelToSummary(level: CareerLevel | undefined): CareerLevelSummary | null {
  if (!level) return null;
  return {
    title: safe(level.title),
    status: safe(level.status),
    characteristics: level.characteristics?.map(c => safe(c)) ?? [],
    skills: level.skills?.map(s => safe(s)) ?? [],
    talents: level.talents?.map(t => safe(t)) ?? [],
  };
}

function careerToSearchable([name, scheme]: [string, CareerScheme]): SearchableEntity {
  const careerName = safe(name);
  const levels: CareerLevelSummary[] = [];

  const l1 = careerLevelToSummary(scheme.level1);
  const l2 = careerLevelToSummary(scheme.level2);
  const l3 = careerLevelToSummary(scheme.level3);
  const l4 = careerLevelToSummary(scheme.level4);

  if (l1) levels.push(l1);
  if (l2) levels.push(l2);
  if (l3) levels.push(l3);
  if (l4) levels.push(l4);

  // Build search text from career name + all level titles
  const levelTitles = levels.map(l => l.title).join(' ');

  return {
    id: `career-${careerName.toLowerCase().replace(/\s+/g, '-')}`,
    name: careerName,
    type: 'career',
    searchText: `${careerName} ${safe(scheme.class)} ${levelTitles}`.toLowerCase(),
    displayData: {
      type: 'career',
      class: safe(scheme.class),
      levels,
    },
  };
}

function runeToSearchable(rune: RuneDefinition): SearchableEntity {
  const name = safe(rune.name);
  const description = safe(rune.description);
  const effectsText = rune.effects?.map(e => safe(e.description)).filter(Boolean).join('; ') ?? '';

  return {
    id: safe(rune.id) || `rune-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    type: 'rune',
    searchText: `${name} ${description} ${effectsText}`.toLowerCase(),
    displayData: {
      type: 'rune',
      category: safe(rune.category),
      isMaster: rune.isMaster ?? false,
      maxPerItem: rune.maxPerItem ?? 1,
      xpCost: rune.xpCost ?? 0,
      effects: effectsText || description,
      description,
    },
  };
}

function ritualToSearchable(ritual: RitualData): SearchableEntity {
  const name = safe(ritual.name);
  const description = safe(ritual.description);

  return {
    id: `ritual-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    type: 'ritual',
    searchText: `${name} ${description}`.toLowerCase(),
    displayData: {
      type: 'ritual',
      cn: ritual.cn ?? 0,
      ritualType: safe(ritual.type),
      learningXP: ritual.learningXP ?? 0,
      ingredients: safe(ritual.ingredients),
      conditions: safe(ritual.conditions),
      description,
    },
  };
}

function conditionToSearchable(condition: ConditionData): SearchableEntity {
  const name = safe(condition.name);
  const description = safe(condition.description);
  const effects = safe(condition.effects);

  return {
    id: `condition-${name.toLowerCase().replace(/\s+/g, '-')}`,
    name,
    type: 'condition',
    searchText: `${name} ${description} ${effects}`.toLowerCase(),
    displayData: {
      type: 'condition',
      stackable: condition.stackable ?? false,
      description,
      effects,
      duration: safe(condition.defaultDuration),
      removedBy: safe(condition.removedBy),
    },
  };
}

// ─── Search Result Types ─────────────────────────────────────────────────────

export interface SearchResultEntry {
  entity: SearchableEntity;
  score: number;
  nameMatchRanges: [number, number][];
}

export interface GroupedResults {
  groups: ResultGroup[];
  totalCount: number;
}

export interface ResultGroup {
  type: EntityType;
  label: string;
  entries: SearchResultEntry[];
}

// ─── Build Search Index ──────────────────────────────────────────────────────

export function buildSearchIndex(): SearchableEntity[] {
  return [
    ...SPELL_LIST.map(spellToSearchable),
    ...TALENT_DB.map(talentToSearchable),
    ...buildSkillEntries(),
    ...Object.entries(CAREER_SCHEMES).map(careerToSearchable),
    ...RUNE_CATALOGUE.map(runeToSearchable),
    ...RITUAL_LIST.map(ritualToSearchable),
    ...CONDITIONS.map(conditionToSearchable),
  ];
}

// ─── Search Execution ────────────────────────────────────────────────────────

const GROUP_ORDER: { type: EntityType; label: string }[] = [
  { type: 'spell', label: 'Spells' },
  { type: 'talent', label: 'Talents' },
  { type: 'skill', label: 'Skills' },
  { type: 'career', label: 'Careers' },
  { type: 'rune', label: 'Runes' },
  { type: 'ritual', label: 'Rituals' },
  { type: 'condition', label: 'Conditions' },
];

export function searchEntities(index: SearchableEntity[], query: string, maxResults = 50): GroupedResults {
  const normalizedQuery = query.toLowerCase().trim();

  if (normalizedQuery.length === 0) {
    return { groups: [], totalCount: 0 };
  }

  // Score all entries against the query
  const scored: SearchResultEntry[] = [];

  for (const entity of index) {
    // Match against name with 2x score multiplier
    const nameMatch = fuzzyMatch(normalizedQuery, entity.name.toLowerCase());
    // Match against searchText (which already includes name + description, lowercased)
    const textMatch = fuzzyMatch(normalizedQuery, entity.searchText);

    // Take the higher score
    let bestScore: number | null = null;
    let nameMatchRanges: [number, number][] = [];

    if (nameMatch && textMatch) {
      const nameScore = nameMatch.score * 2;
      if (nameScore >= textMatch.score) {
        bestScore = nameScore;
        nameMatchRanges = nameMatch.ranges;
      } else {
        bestScore = textMatch.score;
        // If text match is better, still try to get name ranges for highlighting
        nameMatchRanges = nameMatch.ranges;
      }
    } else if (nameMatch) {
      bestScore = nameMatch.score * 2;
      nameMatchRanges = nameMatch.ranges;
    } else if (textMatch) {
      bestScore = textMatch.score;
      nameMatchRanges = [];
    }

    if (bestScore !== null) {
      scored.push({ entity, score: bestScore, nameMatchRanges });
    }
  }

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Cap at maxResults
  const capped = scored.slice(0, maxResults);

  // Group by entity type in fixed order
  const groups: ResultGroup[] = [];

  for (const { type, label } of GROUP_ORDER) {
    const entries = capped.filter(entry => entry.entity.type === type);
    if (entries.length > 0) {
      groups.push({ type, label, entries });
    }
  }

  return { groups, totalCount: capped.length };
}
