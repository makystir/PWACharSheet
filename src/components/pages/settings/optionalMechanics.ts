import type { HouseRules } from '../../../types/character';

/**
 * Data-driven definition of the Settings → House Rules → "Optional Mechanics"
 * list. This is a presentation/UX module only: it describes which boolean
 * `HouseRules` toggles appear in that section, their user-visible strings, and
 * the category they are grouped under. It introduces no game logic and no
 * data-model change — the actual booleans live on `HouseRules`
 * (src/types/character.ts) and are read/written through the existing `update`
 * surface.
 */

/**
 * The boolean fields of `HouseRules`, narrowed from the real interface via a
 * mapped-type filter so the union stays in sync automatically. Using this as
 * the `key` type makes a typo'd or non-boolean key a compile error against
 * `HouseRules`.
 */
export type BooleanHouseRuleKey = {
  [K in keyof HouseRules]: HouseRules[K] extends boolean ? K : never;
}[keyof HouseRules];

/**
 * Fixed category taxonomy and render order for the Optional Mechanics list.
 * Render order is this array's order; entry order within a category is the
 * order of entries in `OPTIONAL_MECHANICS`.
 */
export const OPTIONAL_MECHANIC_CATEGORIES = [
  'Species & Culture',
  'Combat',
  'Downtime & Activities',
  'Tracking',
] as const;

export type OptionalMechanicCategory = typeof OPTIONAL_MECHANIC_CATEGORIES[number];

export interface OptionalMechanic {
  /** The boolean HouseRules field this toggle flips. */
  key: BooleanHouseRuleKey;
  /** Visible label (verbatim from the original hand-written JSX). */
  label: string;
  /** Visible description (verbatim, including sourcebook parentheticals). */
  description: string;
  /** "Find it on:" location (verbatim), shown only when the toggle is ON. */
  location: string;
  /** Category used to group the entry in the rendered list. */
  category: OptionalMechanicCategory;
}

/**
 * The eight Optional Mechanics, in render order (category order first, then
 * entry order within each category). Strings are transcribed verbatim from the
 * previous hand-written SettingsPage JSX.
 */
export const OPTIONAL_MECHANICS: readonly OptionalMechanic[] = [
  // ── Species & Culture ──────────────────────────────────────────────────
  {
    key: 'useYenlui',
    label: 'Yenlui Balance (High Elf)',
    description: "Track Elven spiritual balance (High Elf Player's Guide)",
    location: 'Character page → Identity tab',
    category: 'Species & Culture',
  },
  {
    key: 'useGrudgeBook',
    label: 'Grudge Book (Dwarf)',
    description: "Track Dwarf grudges for XP (Dwarf Player's Guide)",
    location: 'Character page → Identity tab',
    category: 'Species & Culture',
  },
  // ── Combat ─────────────────────────────────────────────────────────────
  {
    key: 'useCriticalDeflection',
    label: 'Critical Deflection',
    description: 'Sacrifice 1 AP to ignore a Critical Wound (Archives Vol. III)',
    location: 'Combat page → Take Damage panel',
    category: 'Combat',
  },
  {
    key: 'useCants',
    label: 'Alternative Channelling Cants',
    description: 'Expend gathered channelling SL for minor magical effects (Archives Vol. III)',
    location: 'Combat page → Spells & Prayers panel',
    category: 'Combat',
  },
  // ── Downtime & Activities ──────────────────────────────────────────────
  {
    key: 'useEnterprises',
    label: 'Enterprises',
    description: 'Track business ventures and income sources (Archives Vol. III)',
    location: 'Estate page → Enterprises tab',
    category: 'Downtime & Activities',
  },
  {
    key: 'useWildernessTravel',
    label: 'Wilderness Travel',
    description: 'Stage-by-stage journey tracker for travel through the wilds (Deft Steps)',
    location: 'Endeavours page → Travel tab',
    category: 'Downtime & Activities',
  },
  {
    key: 'useHunting',
    label: 'Hunting',
    description: 'Reference tables for hunting game, animals, and lodges (Deft Steps)',
    location: 'Endeavours page → Hunting tab',
    category: 'Downtime & Activities',
  },
  // ── Tracking ───────────────────────────────────────────────────────────
  {
    key: 'usePsychologyTracker',
    label: 'Psychology Tracker',
    description: 'Track phobias, animosity, hatred, and trauma (Archives Vol. II)',
    location: 'Character page → Identity tab → Psychology Tracker panel',
    category: 'Tracking',
  },
];
