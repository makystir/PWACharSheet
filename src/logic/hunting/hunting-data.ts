/**
 * Pure, React-free Hunting reference data (Deft Steps, Light Fingers —
 * "Hunter and Hunted" chapter, docs/deftsteps.md ~L4805–5145).
 *
 * Every table value and string below is transcribed VERBATIM from
 * docs/deftsteps.md at the cited page/line; nothing is invented. This module is
 * a read-only reference: it defines no mechanic that mutates character state and
 * surfaces no computed value. The Hunting Lodge is descriptive GM scenery — no
 * ownership / upkeep / cost / benefit mechanic exists in the book, so none is
 * modelled here (rules-compliance).
 *
 * Page-number caveat: the page numbers in the citation comments follow the
 * task brief's printed pagination. In docs/deftsteps.md, "A Fast Buck" (~L4851)
 * physically precedes "Hunting Considerations" (~L4875) yet is cited p.131 vs
 * p.124, which cannot both be true for a single chapter's reading order. The
 * docs/deftsteps.md line anchors (correct) are the reliable locator; verify the
 * page numbers against the printed book.
 */

// ─── A. Hunting Considerations (game × terrain × Outdoor Survival difficulty) ─

/**
 * Verbatim printed terrain strings from the Hunting Considerations table. These
 * differ in spelling from the canonical TerrainType enum in
 * ../wilderness-travel/journey-modifiers.ts ("Deep Forest" vs 'Deep forest',
 * "Wetlands" vs 'Wetland'); "Any" is not an enum member. The verbatim strings
 * are preserved here (rules fidelity); terrain-map.ts bridges them to the enum.
 */
export type HuntingTerrain =
  | 'Deep Forest'
  | 'Hills'
  | 'Light Woodland'
  | 'Temperate Plains'
  | 'Wetlands'
  | 'Mountains'
  | 'Any';

export interface HuntingConsideration {
  /** Verbatim game list as printed (comma-joined cell). */
  readonly game: string;
  /** Verbatim printed terrain strings for this row. */
  readonly terrain: readonly HuntingTerrain[];
  /** Difficulty band name as printed (e.g. "Hard"). */
  readonly difficultyLabel: string;
  /** Numeric modifier as printed (e.g. -20). */
  readonly difficultyModifier: number;
}

/**
 * Deft Steps p.124: Hunting Considerations (docs/deftsteps.md ~L4875).
 * Terrain + Outdoor Survival Test difficulty for hunting particular game.
 * Printed spellings preserved: "Deep Forest" (cap F), "Wetlands" (plural), "Any".
 */
export const HUNTING_CONSIDERATIONS: readonly HuntingConsideration[] = [
  {
    game: 'Badger, Chicken, Grouse, Rabbit, Rat',
    terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
    difficultyLabel: 'Challenging',
    difficultyModifier: 0,
  },
  {
    game: 'Beaver',
    terrain: ['Deep Forest', 'Light Woodland', 'Wetlands'],
    difficultyLabel: 'Challenging',
    difficultyModifier: 0,
  },
  {
    game: 'Mountain Goat',
    terrain: ['Hills', 'Mountains'],
    difficultyLabel: 'Difficult',
    difficultyModifier: -10,
  },
  {
    game: 'Wild Boar',
    terrain: ['Deep Forest', 'Light Woodland'],
    difficultyLabel: 'Difficult',
    difficultyModifier: -10,
  },
  {
    game: 'Wolf',
    terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
    difficultyLabel: 'Difficult',
    difficultyModifier: -10,
  },
  {
    game: 'Bear',
    terrain: ['Any'],
    difficultyLabel: 'Hard',
    difficultyModifier: -20,
  },
  {
    game: 'Small Deer',
    terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
    difficultyLabel: 'Hard',
    difficultyModifier: -20,
  },
  {
    game: 'Large Deer',
    terrain: ['Deep Forest', 'Hills', 'Light Woodland', 'Temperate Plains'],
    difficultyLabel: 'Very Hard',
    difficultyModifier: -30,
  },
] as const;

// ─── B. A Fast Buck — "THE VALUE OF" ─────────────────────────────────────────

export interface FastBuckRow {
  /** Animal / item name as printed. */
  readonly item: string;
  /** Days of Food cell as printed (string so "¼ *", "1*", "6*" survive). */
  readonly daysOfFood: string;
  /** Other uses cell as printed. */
  readonly otherUses: string;
  /** Price cell preserved EXACTLY as printed (mixed d / "/-" / GC). */
  readonly price: string;
}

/**
 * Deft Steps p.131: A Fast Buck — "THE VALUE OF" (docs/deftsteps.md ~L4860).
 * Price column preserved exactly as printed — mixed pence `d`, shilling `/-`,
 * and Gold Crown `GC` notation — stored as strings with NO currency conversion.
 *
 * FLAGGED ARTIFACT (Fish row, Other uses): docs/deftsteps.md renders this cell
 * as "GAME Oil". "GAME" is a leaked table-header/section marker from the
 * Markdown→text conversion (the table header is "THE VALUE OF - Other uses");
 * the genuine printed value is "Oil". Per rules-compliance the intended value
 * is stored here and the artifact is surfaced via A_FAST_BUCK_ARTIFACT_NOTE
 * rather than silently "correcting" without a flag. Verify against the book.
 */
export const A_FAST_BUCK: readonly FastBuckRow[] = [
  { item: 'Fish', daysOfFood: '1', otherUses: 'Oil', price: '3d' },
  { item: 'Rat', daysOfFood: '¼ *', otherUses: '—', price: '1d' },
  { item: 'Grouse', daysOfFood: '½', otherUses: 'Down', price: '3d' },
  { item: 'Chicken', daysOfFood: '1', otherUses: 'Down', price: '5d' },
  { item: 'Rabbit', daysOfFood: '1', otherUses: 'Hide, Charms', price: '6d' },
  { item: 'Beaver', daysOfFood: '1*', otherUses: 'Hide', price: '1/6' },
  { item: 'Badger', daysOfFood: '1*', otherUses: 'Hide', price: '1/2' },
  { item: 'Mountain Goat', daysOfFood: '15', otherUses: 'Horns, Hide', price: '5/-' },
  { item: 'Wild Boar', daysOfFood: '15', otherUses: 'Tusks', price: '4/-' },
  { item: 'Wolf', daysOfFood: '6*', otherUses: 'Hide', price: '15/-' },
  { item: 'Bear', daysOfFood: '20*', otherUses: 'Hide', price: '2GC' },
  { item: 'Small Deer', daysOfFood: '15', otherUses: 'Hide, Musk', price: '15/-' },
  { item: 'Large Deer', daysOfFood: '25', otherUses: 'Hide, Musk, Antlers', price: '1GC 10/-' },
] as const;

/** Deft Steps p.131: A Fast Buck `*` footnote, verbatim. */
export const A_FAST_BUCK_FOOTNOTE =
  '* These animals are not commonly eaten, and barely considered edible by folk ' +
  'in the Empire. Most folk would consider them famine food at best, and their ' +
  'meat alone has no commercial value.';

/** Flag caption surfaced beside the table for the Fish "GAME Oil" artifact. */
export const A_FAST_BUCK_ARTIFACT_NOTE =
  "Source note: the Fish 'Other uses' cell prints 'GAME Oil' in " +
  "docs/deftsteps.md; 'GAME' appears to be a leaked table-header artifact and " +
  "the intended value is 'Oil'. Verify against the printed book.";

// ─── C. Animals and Equipment ────────────────────────────────────────────────

export interface EquipmentRow {
  readonly item: string;
  /** Cost cell as printed (mixed "/-" / GC). */
  readonly cost: string;
  /** Encumbrance cell as printed ("-" when none). */
  readonly enc: string;
  readonly availability: string;
}

/** Deft Steps p.132: Animals and Equipment (docs/deftsteps.md ~L4895). */
export const ANIMALS_AND_EQUIPMENT: readonly EquipmentRow[] = [
  { item: "Hunter's Garb", cost: '15/-', enc: '2', availability: 'Rare' },
  { item: 'Hochland Lockhund', cost: '2GC', enc: '-', availability: 'Common' },
  { item: 'Nordlander Bamse', cost: '4GC', enc: '-', availability: 'Scarce' },
  { item: 'Grootscher Marsh Hound', cost: '5GC', enc: '-', availability: 'Scarce' },
  { item: 'Dove Hawk', cost: '10GC', enc: '1', availability: 'Rare' },
  { item: 'Arabyan Redhawk', cost: '25GC', enc: '1', availability: 'Exotic' },
] as const;

/** Deft Steps p.132: Hunter's Garb — full source sentence, verbatim. */
export const HUNTERS_GARB_EFFECT =
  'This clothing made to resemble the local flora, with fronds, leaves, and even ' +
  'flowers, hanging from it. It may look bizarre and unwieldy out of context, but ' +
  'it gives a bonus of +2 SL to any Stealth Tests that are made in the ' +
  'appropriate terrain.';

/** Deft Steps p.132: Hunter's Garb — effect clause only, for a compact badge. */
export const HUNTERS_GARB_EFFECT_SHORT =
  '+2 SL to Stealth Tests made in the appropriate terrain.';

// ─── D. Hound & Hawk Hunting Traits + training ───────────────────────────────

/**
 * A training-test difficulty as printed, split into label + numeric modifier,
 * for display and pinning. `null` means the book lists NO test for that trait
 * (not invented).
 */
export interface TrainingDifficulty {
  readonly label: string;
  readonly modifier: number;
}

export interface HuntingAnimalTraining {
  /** The prerequisite trait every hunting animal must acquire first. */
  readonly firstTrait: string;
  /** Hours of training to grant a Hunting Trait. */
  readonly hours: number;
  /** The Animal Training Test difficulty to grant a Hunting Trait. */
  readonly test: TrainingDifficulty;
}

export interface HuntingTrait {
  readonly name: string;
  /** The Animal Training Test to teach the trait, or null when none is listed. */
  readonly trainingTest: TrainingDifficulty | null;
  /** Verbatim description of the trait as printed. */
  readonly description: string;
}

/**
 * Deft Steps p.133: Hounds — the first trait must be Trained (Broken); granting
 * a Hunting Trait takes 1 hour + a Difficult (-10) Animal Training Test (on a
 * fail, rest the dog a day then retry).
 */
export const HOUND_TRAINING: HuntingAnimalTraining = {
  firstTrait: 'Trained (Broken)',
  hours: 1,
  test: { label: 'Difficult', modifier: -10 },
} as const;

/** Deft Steps p.133: Hunting Traits for hounds. */
export const HOUND_TRAITS: readonly HuntingTrait[] = [
  {
    name: 'Dig',
    trainingTest: { label: 'Average', modifier: 20 },
    description:
      'If the trainer passes an Average (+20) Animal Training Test the animal ' +
      'will dig in a certain spot, on command. This might help make pit traps, ' +
      'or uncover buried items.',
  },
  {
    name: 'Heel',
    trainingTest: { label: 'Average', modifier: 20 },
    description:
      'If the trainer passes an Average (+20) Animal Training Test the animal ' +
      'comes to heel immediately when commanded, whatever the distraction.',
  },
  {
    name: 'Hunt',
    trainingTest: { label: 'Average', modifier: 20 },
    description:
      'If the trainer passes an Average (+20) Animal Training Test the animal ' +
      'will pursue a quarry, then attempt to kill it and retrieve it. You can ' +
      'use a Challenging (+0) Melee Test to determine whether it is successful.',
  },
  {
    // Deft Steps p.133: no training-test value is listed for Point.
    name: 'Point',
    trainingTest: null,
    description:
      'The animal points reliably to the item sought by the trainer provided ' +
      'that that item has a distinctive scent. This is used for indicating a ' +
      'quarry and is also useful for pointing out contraband. Some dogs are very ' +
      'ostentatious in their pointing, but others can do this more subtly.',
  },
  {
    name: 'Round',
    trainingTest: { label: 'Challenging', modifier: 0 },
    description:
      'If the trainer passes an Challenging (+0) Animal Training Test the animal ' +
      'is able to position itself to manipulate the quarry to move in a certain ' +
      'way, without spooking it. This can also be used for activities like herding.',
  },
  {
    // Deft Steps p.133: grants the Tracker Trait on command; no test value given.
    name: 'Track',
    trainingTest: null,
    description:
      'The animal has the Tracker Trait, and will perform it on command with ' +
      'instructions: for example, searching for and following a scent it has ' +
      'been given a sample of.',
  },
] as const;

/**
 * Deft Steps p.133: a suitably trained hound (any of the above traits) may grant
 * assistance to the Outdoor Survival Test in a Hunting Endeavour.
 */
export const HOUND_ASSISTANCE =
  'When undertaking a Hunting Endeavour a suitably trained hound (a hound with ' +
  'any of these traits counts as suitably trained) may grant assistance to any ' +
  'Character called on to make an Outdoor Survival Test to determine the success ' +
  'or failure of a hunt.';

/**
 * Deft Steps p.134: Hawks — the first trait must be Trained (Broken); granting a
 * Hunting Trait takes 3 hours + a Hard (-20) Animal Training Test (on a fail,
 * rest the hawk a day then retry).
 */
export const HAWK_TRAINING: HuntingAnimalTraining = {
  firstTrait: 'Trained (Broken)',
  hours: 3,
  test: { label: 'Hard', modifier: -20 },
} as const;

/** Deft Steps p.134: Hunting Traits for hawks. */
export const HAWK_TRAITS: readonly HuntingTrait[] = [
  {
    name: 'Hunt',
    trainingTest: null,
    description:
      'The animal will pursue a quarry, then attempt to kill it and retrieve it ' +
      'to order. You can use a Challenging (+0) Melee Test to determine success.',
  },
  {
    name: 'Circle',
    trainingTest: null,
    description:
      'The animal is trained to spot potential quarry, and even other things, ' +
      'from its vantage point in the sky and then slowly circle it, to indicate ' +
      'its position.',
  },
  {
    name: 'Return',
    trainingTest: null,
    description:
      'Hawks usually return to their handler, but can be recalcitrant. With this ' +
      'trait the handler is allowed to make a Charm Animal Test opposed by the ' +
      "hawk's WP, to have it return immediately and without complications.",
  },
] as const;

/**
 * FLAG (hawk assistance truncation): the hawk-assistance sentence in
 * docs/deftsteps.md ends mid-phrase ("When undertaking a Hunting Endeavour a
 * suitably", ~L5035) before an image break, so the completed hawk-assistance
 * clause is truncated in the source. By parallel with the hound text it plainly
 * concerns a hawk granting assistance to the hunt, but because the sentence is
 * cut off no completed rule is transcribed; this note is surfaced in the UI.
 */
export const HAWK_ASSISTANCE_TRUNCATION_NOTE =
  'Source truncated here in docs/deftsteps.md ("When undertaking a Hunting ' +
  'Endeavour a suitably…"); see the printed book for the hawk assistance clause.';

// ─── E. Hunting as Endeavour — cross-reference guidance only ──────────────────

/**
 * Deft Steps p.124–125: Hunting as Endeavour (docs/deftsteps.md ~L4817).
 * Guidance text only; NOT merged into endeavours.ts or the journey catalog.
 */
export const HUNTING_AS_ENDEAVOUR = {
  /** Deft Steps p.125: Travel Endeavour (the existing Hunt/Fish journey endeavour). */
  travel:
    'Hunting may be carried out as a Travel Endeavour (Deft Steps p.125 — the ' +
    'existing Hunt/Fish journey endeavour). By default it finds easy game such ' +
    'as rabbits, squirrels, and birds. For more impressive game, use the Hunting ' +
    'Considerations table (p.124) for the terrain and the Outdoor Survival Test ' +
    'difficulty. Hounds and hawks may provide assistance.',
  /** Deft Steps p.124; WFRP Core p.196: General (downtime) Endeavour cross-reference. */
  downtime:
    'Hunting may also be taken as a General (downtime) Endeavour (WFRP Core ' +
    'p.196). Because a downtime endeavour covers a longer period, the Character ' +
    'may make three Tests, and the results are cumulative.',
} as const;

// ─── F. Hunting Lodges + A Typical Hunting Lodge — descriptive reference only ──

/**
 * Deft Steps p.136–137: Hunting Lodges + A Typical Hunting Lodge
 * (docs/deftsteps.md ~L5040–5130). DESCRIPTIVE REFERENCE ONLY — condensed,
 * faithful prose with no invented numbers and NO ownership/upkeep/cost/benefit
 * mechanic (the book defines none). GM scenery.
 */
export const HUNTING_LODGES_OVERVIEW =
  'Many wealthy hunting enthusiasts own hunting lodges: fortified wilderness ' +
  'retreats sited deep in the wilds where more dangerous and exotic game can be ' +
  'found. Referred to euphemistically as "the cottage" or "the summer house", ' +
  'they are typically fortresses in their own right, often in areas beset by ' +
  'Orcs, Goblins, or Beastmen, and need defending whether the lord is at home or ' +
  'not. They are GM scenery, not a mechanic.';

export interface LodgeFloor {
  readonly name: string;
  readonly description: string;
}

/** Deft Steps p.137: A Typical Hunting Lodge, condensed by the book's headings. */
export const TYPICAL_HUNTING_LODGE: readonly LodgeFloor[] = [
  {
    name: 'Defences',
    description:
      'A wooden palisade around the courtyard and a fortified gatehouse. The main ' +
      'building includes a pre-existing stone tower (the reason the lodge was ' +
      'sited here). The cleared ground around the palisade is reverting to ' +
      'undergrowth, and a narrow track to the nearest road barely fits a coach.',
  },
  {
    name: 'Ground Floor',
    description:
      'Storage for hunting equipment and outdoor clothing; a reception area for ' +
      'relaxing and dining; and a study with a desk and a few books on hunting, ' +
      'bird spotting, fly fishing, and fiction.',
  },
  {
    name: 'First Floor',
    description:
      'Four large, lavishly decorated bedrooms reserved for the visiting noble ' +
      'and his most honoured guests.',
  },
  {
    name: 'Second Floor',
    description:
      'Smaller rooms for servants, guards, and storage, plus a small shrine to ' +
      'Taal bedecked with trophies such as tusks, antlers, and skulls.',
  },
  {
    name: 'Third Floor',
    description:
      'The observatory, reached by climbing the tower — though there is nothing ' +
      'to see except the treetops stretching for miles.',
  },
] as const;
