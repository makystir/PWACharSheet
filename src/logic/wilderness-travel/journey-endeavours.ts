/**
 * Journey Endeavour catalog for the Wilderness Travel tracker (Deft Steps,
 * "Pathfinding" chapter, docs/deftsteps.md). Pure, React-free, JSON-plain.
 *
 * This module is DELIBERATELY SEPARATE from GENERAL_ENDEAVOURS/CLASS_ENDEAVOURS
 * in src/logic/endeavours.ts: the book forbids interchanging Journey and
 * downtime Endeavours — "Such Endeavours cannot normally be attempted instead
 * of Journey Endeavours, and vice versa." (Deft Steps, "JOURNEY ENDEAVOURS").
 *
 * Every test, difficulty, and effect below is transcribed VERBATIM from
 * docs/deftsteps.md at the cited page; nothing is invented. Where a value is
 * discretionary, conditional, or image-only it is flagged, not guessed.
 *
 * Catalog modelling decision (Double Endeavour): the book's JOURNEY ENDEAVOURS
 * table lists Map and Navigate in BOTH the Travel and Camp columns. That is the
 * Double Endeavour mechanic (one test spanning both slots for +1 SL), not two
 * distinct endeavours. The catalog therefore ships 14 SINGLE-PHASE entries —
 * Map and Navigate are phase:'travel' only; their Camp-slot use is surfaced as
 * guidance text in their `effect`/`seedNote`, never as a second catalog entry.
 */

import type { DifficultyLevel } from '../dice-roller';
import type { ReminderTest } from '../reminders';
import type { TerrainColumn, WeatherApplicability } from './journey-modifiers';

export type EndeavourPhase = 'travel' | 'camp';

/**
 * A seed descriptor reusing the reminder-roll seed path shape (`ReminderTest`,
 * src/logic/reminders.ts). Present ONLY on bare-skill / plain-characteristic
 * tests. Specialisation tests (Trade (Cook), Art (Drawing/Writing), Lore
 * (Herbs), Trade (Cartography), Language (Any)) and no-roll endeavours carry
 * `seed: undefined` and are guidance-only — RollDialog has no specialisation
 * picker, matching the Downtime/Endeavour Assistant scope rule.
 */
export interface JourneyEndeavourSeed {
  /** { kind:'skill', skillName, fallbackChar } | { kind:'characteristic', char } */
  def: ReminderTest;
  /** Verbatim difficulty for the seeded roll default. */
  difficulty: DifficultyLevel;
  /** Display name passed to RollDialog, e.g. "Navigation (Navigate)". */
  rollName: string;
}

export interface JourneyEndeavour {
  /** Stable key, e.g. 'forage', 'make-camp'. */
  id: string;
  /** Display name — matches the TRAVEL/CAMP option arrays' plain stored string. */
  name: string;
  /** Single phase per entry. Map/Navigate are 'travel'; their Camp-slot use is the Double Endeavour (guidance). */
  phase: EndeavourPhase;
  /** Verbatim test description incl. difficulty, e.g. "Challenging (+0) Navigation Test". */
  test: string;
  /** Primary difficulty for the seeded roll default (verbatim-mapped). */
  difficulty: DifficultyLevel;
  /** Short effect summary (verbatim-derived). */
  effect: string;
  /** Which Terrain Table column (if any) applies to this endeavour's net SL. */
  terrainKey?: TerrainColumn;
  /** Which weather flat-SL rules can affect this endeavour's net SL. */
  weather: WeatherApplicability;
  /** Present ⇒ one-tap seeded RollDialog; absent ⇒ guidance-only. */
  seed?: JourneyEndeavourSeed;
  /** Why it is / isn't seedable (cited). */
  seedNote: string;
  /** Source citation, e.g. "Deft Steps p.125: Navigate Endeavour". */
  citation: string;
}

// Core p.117 (skill→characteristic mapping): a Skill tests off its governing
// characteristic. These fallbackChar values come from the Core skill list, NOT
// deftsteps.md (which supplies only the tests). Outdoor Survival → Int,
// Endurance → T, Navigation → Int, Perception → I, Tracking → I,
// Set Trap → Dex (verified in src/data/advanced-skills.ts: { n:'Set Trap', c:'Dex' }).

/** Weather applicability presets (Deft Steps p.114). */
const NO_WEATHER: WeatherApplicability = { precipitationAthletics: false, visibility: false, dexterity: false };
// Navigation tests are hit by Visibility (Deft Steps p.114: "-SL to Navigation …").
const NAV_WEATHER: WeatherApplicability = { precipitationAthletics: false, visibility: true, dexterity: false };
// Perception (sight-based) is hit by Visibility (Deft Steps p.114).
const PERCEPTION_WEATHER: WeatherApplicability = { precipitationAthletics: false, visibility: true, dexterity: false };
// Set Trap is a Dexterity skill → Bitter-gloves advisory relevant (Deft Steps p.114).
const DEX_WEATHER: WeatherApplicability = { precipitationAthletics: false, visibility: false, dexterity: true };

/**
 * The catalog. 8 Travel entries + 6 distinct Camp entries = 14. Map and
 * Navigate are travel-only (Double Endeavour surfaced as guidance).
 */
export const JOURNEY_ENDEAVOURS: readonly JourneyEndeavour[] = [
  // ── Travel Endeavours ──────────────────────────────────────────────────────
  {
    // Deft Steps p.125: Forage Endeavour.
    id: 'forage',
    name: 'Forage',
    phase: 'travel',
    test: 'Challenging (+0) Outdoor Survival, Lore (Herbs), or similar Test',
    difficulty: 'Challenging',
    effect:
      'Every SL results in enough food for one person for one day. A Fumble may mean the food is tainted or misidentified (Poisoned Condition). Foraged food must be Cooked to avoid the Galloping Trots.',
    terrainKey: 'Foraging',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Outdoor Survival', fallbackChar: 'Int' },
      difficulty: 'Challenging',
      rollName: 'Outdoor Survival (Forage)',
    },
    seedNote:
      'Seeds the Outdoor Survival option (a bare skill). The Lore (Herbs) alternative is a specialisation → guidance only (RollDialog has no specialisation picker). Deft Steps p.125.',
    citation: 'Deft Steps p.125: Forage Endeavour',
  },
  {
    // Deft Steps p.125: Haste Endeavour.
    id: 'haste',
    name: 'Haste',
    phase: 'travel',
    test: 'Challenging (+0) Endurance Test',
    difficulty: 'Challenging',
    effect:
      'Doubles the distance covered in that Stage. The whole party must take it (no other Travel Endeavours). Everyone makes a Challenging (+0) Endurance Test or begins the Camp Endeavour with a Fatigued Condition.',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
      difficulty: 'Challenging',
      rollName: 'Endurance (Haste)',
    },
    seedNote: 'Endurance is a bare skill → seedable. Deft Steps p.125.',
    citation: 'Deft Steps p.125: Haste Endeavour',
  },
  {
    // Deft Steps p.125: Hunt (or Fish) Endeavour.
    id: 'hunt-fish',
    name: 'Hunt/Fish',
    phase: 'travel',
    test: 'Challenging (+0) Outdoor Survival Test',
    difficulty: 'Challenging',
    // Note: Hunt/Fish yields food for TWO people per SL — distinct from Forage
    // (1 person/SL) and Trap (1 person/SL). Kept verbatim; do not homogenise.
    effect:
      'Provides enough food to keep two people fed for a day for every SL. Hunter\u2019s Eye / Fisherman bonus applies in Light Woodland, Hills, Deep Forest, Temperate Plains, or Wetland. Food must be Cooked to avoid the Galloping Trots.',
    // Terrain Hunt column by default; the UI also surfaces the Fish sub-value.
    terrainKey: 'Hunt',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Outdoor Survival', fallbackChar: 'Int' },
      difficulty: 'Challenging',
      rollName: 'Outdoor Survival (Hunt/Fish)',
    },
    seedNote: 'Outdoor Survival is a bare skill → seedable. Deft Steps p.125.',
    citation: 'Deft Steps p.125: Hunt (or Fish) Endeavour',
  },
  {
    // Deft Steps p.125: Navigate Endeavour. Double Endeavour surfaced as guidance.
    id: 'navigate',
    name: 'Navigate',
    phase: 'travel',
    test: 'Challenging (+0) Navigation Test',
    difficulty: 'Challenging',
    effect:
      'At each Stage at least one member must Navigate to avoid becoming lost. A local guide removes the need to test. May also be run as a Double Endeavour across the Travel + Camp slots for +1 SL, but the navigator can do nothing else that Stage. Outcomes: +3 SL → shortcut (−1 Stage); −2 SL or worse → add a Stage + Travel Event.',
    terrainKey: 'Navigation',
    weather: NAV_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Navigation', fallbackChar: 'Int' },
      difficulty: 'Challenging',
      rollName: 'Navigation (Navigate)',
    },
    seedNote: 'Navigation is a bare skill → seedable. Deft Steps p.125.',
    citation: 'Deft Steps p.125: Navigate Endeavour',
  },
  {
    // Deft Steps p.125: Map Endeavour. Both test options are specialisations.
    id: 'map',
    name: 'Map',
    phase: 'travel',
    test: 'Average (+20) Trade (Cartography) or Challenging (+0) Art (Drawing) Test',
    difficulty: 'Average',
    effect:
      'A success brings a +1 SL bonus to the next Stage\u2019s Navigate Endeavour. May be run as a Double Endeavour for +1 SL (no other Endeavour that Stage). A simple chart fetches ~3 shillings per Stage covered.',
    weather: NO_WEATHER,
    seedNote:
      'Both options are specialisations — Trade (Cartography) and Art (Drawing) — and RollDialog has no specialisation picker, so Map is guidance only. Deft Steps p.125.',
    citation: 'Deft Steps p.125: Map Endeavour',
  },
  {
    // Deft Steps p.125: Scout Endeavour.
    id: 'scout',
    name: 'Scout',
    phase: 'travel',
    test: 'Challenging (+0) Perception Test',
    difficulty: 'Challenging',
    effect:
      'A success gives advance warning of adverse Travel Events; an avoidable Event can be avoided by adding two further Stages to the journey.',
    weather: PERCEPTION_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Perception', fallbackChar: 'I' },
      difficulty: 'Challenging',
      rollName: 'Perception (Scout)',
    },
    seedNote: 'Perception is a bare skill → seedable. (Visibility modifiers apply to sight-based Perception.) Deft Steps p.125.',
    citation: 'Deft Steps p.125: Scout Endeavour',
  },
  {
    // Deft Steps p.125: Track Endeavour.
    id: 'track',
    name: 'Track',
    phase: 'travel',
    test: 'Average (+20) Tracking Test (Opposed Stealth (Rural) if the quarry is aware)',
    difficulty: 'Average',
    effect:
      'Follow a quarry instead of navigating. An oblivious quarry needs only an Average (+20) Tracking Test; an aware quarry gets an Opposed Stealth (Rural) Test. On a fail the party may test again after backtracking.',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Tracking', fallbackChar: 'I' },
      difficulty: 'Average',
      rollName: 'Tracking (Track)',
    },
    seedNote:
      'Tracking is a bare skill → seedable at Average (+20). The Opposed Stealth (Rural) element is NOT auto-wired (no opponent sheet): enter the quarry\u2019s target by hand via RollDialog\u2019s Opposed Test input. Deft Steps p.125.',
    citation: 'Deft Steps p.125: Track Endeavour',
  },
  {
    // Deft Steps p.125: Water Endeavour.
    id: 'water',
    name: 'Water',
    phase: 'travel',
    test: 'Challenging (+0) Outdoor Survival Test',
    difficulty: 'Challenging',
    effect:
      'A success provides enough water to replenish the entire expedition (mitigates the Water shortfall, else Thirst). A Critical Failure may mean contaminated water (Challenging (+0) Perception to spot); drinking it requires a test for the Bloody Flux.',
    terrainKey: 'Water',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Outdoor Survival', fallbackChar: 'Int' },
      difficulty: 'Challenging',
      rollName: 'Outdoor Survival (Water)',
    },
    seedNote: 'Outdoor Survival is a bare skill → seedable. Deft Steps p.125.',
    citation: 'Deft Steps p.125: Water Endeavour',
  },

  // ── Camp Endeavours ─────────────────────────────────────────────────────────
  {
    // Deft Steps p.126: Cook Endeavour.
    id: 'cook',
    name: 'Cook',
    phase: 'camp',
    test: 'Average (+20) Trade (Cook), or Challenging (+0) Outdoor Survival Test',
    difficulty: 'Average',
    effect:
      'Avoids the risk of contracting the Galloping Trots. One person-day of food is lost or spoiled per level of failure. A Critical Failure triggers the Cooking Critical Failure Table.',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Outdoor Survival', fallbackChar: 'Int' },
      difficulty: 'Challenging',
      rollName: 'Outdoor Survival (Cook)',
    },
    seedNote:
      'Seeds the Outdoor Survival option at Challenging (+0) (a bare skill). The Trade (Cook) alternative (Average +20) is a specialisation → guidance only. Deft Steps p.126.',
    citation: 'Deft Steps p.126: Cook Endeavour',
  },
  {
    // Deft Steps p.126: Journal Endeavour. Requires the Read/Write Talent.
    id: 'journal',
    name: 'Journal',
    phase: 'camp',
    test: 'Average (+20) Art (Writing) Test, or a Language (Any) Test',
    difficulty: 'Average',
    effect:
      'A Character must possess the Read/Write Talent. The journal has little bearing on the current expedition but may be valuable to later travellers or a publisher.',
    weather: NO_WEATHER,
    seedNote:
      'Both options are specialisations — Art (Writing) and Language (Any) — and it requires the Read/Write Talent, so Journal is guidance only. Deft Steps p.126.',
    citation: 'Deft Steps p.126: Journal Endeavour',
  },
  {
    // Deft Steps p.126: Make Camp Endeavour. Tents make it Average (Deft Steps p.114).
    id: 'make-camp',
    name: 'Make Camp',
    phase: 'camp',
    test: 'Challenging (+0) Outdoor Survival Test (Average (+20) if the party has tents)',
    difficulty: 'Challenging',
    effect:
      'Any success prepares the ground for a restful night\u2019s sleep; overnight Healing stays Challenging (a Critical Success restores it to Average). Protects from Heat/Cold Exposure in sweltering/chilly conditions. Having tents makes this Average instead of Challenging.',
    terrainKey: 'MakeCamp',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'skill', skillName: 'Outdoor Survival', fallbackChar: 'Int' },
      difficulty: 'Challenging',
      rollName: 'Outdoor Survival (Make Camp)',
    },
    seedNote:
      'Outdoor Survival is a bare skill → seedable. Difficulty defaults to Challenging (+0), or Average (+20) when the party has tents (Deft Steps p.114). Deft Steps p.126.',
    citation: 'Deft Steps p.126: Make Camp Endeavour; tents rule Deft Steps p.114',
  },
  {
    // Deft Steps p.126: Recuperate Endeavour — no test.
    id: 'recuperate',
    name: 'Recuperate',
    phase: 'camp',
    test: 'No test — take advantage of an established camp',
    difficulty: 'Challenging',
    effect:
      'An opportunity to get rid of any Fatigued Conditions. Spoiled if any Fatigued Condition is earned that day or if the party exerts itself significantly.',
    weather: NO_WEATHER,
    seedNote: 'Recuperate has no test in the rules → guidance only. Deft Steps p.126.',
    citation: 'Deft Steps p.126: Recuperate Endeavour',
  },
  {
    // Deft Steps p.126: Trap Endeavour. Camp-only.
    id: 'trap',
    name: 'Trap',
    phase: 'camp',
    test: 'Challenging (+0) Set Trap Test',
    difficulty: 'Challenging',
    effect:
      'Each SL results in enough food for a single person for a day (a Critical Success could double it). A Fumble may attract a large predator. Trapped food must be Cooked to avoid the Galloping Trots.',
    weather: DEX_WEATHER,
    seed: {
      // Core p.117 / src/data/advanced-skills.ts: Set Trap → Dex.
      def: { kind: 'skill', skillName: 'Set Trap', fallbackChar: 'Dex' },
      difficulty: 'Challenging',
      rollName: 'Set Trap (Trap)',
    },
    seedNote: 'Set Trap is a bare skill → seedable. (Bitter-cold gloves give an advisory −2 SL to Dexterity tasks.) Deft Steps p.126.',
    citation: 'Deft Steps p.126: Trap Endeavour',
  },
  {
    // Deft Steps p.126: Watch Endeavour. The Willpower Test is CONDITIONAL.
    id: 'watch',
    name: 'Watch',
    phase: 'camp',
    test: 'Average (+20) Willpower Test — only if on watch while already Fatigued',
    difficulty: 'Average',
    effect:
      'Keeping watch is an extra Endeavour beyond Travel + Camp; the watcher gains an extra Fatigued Condition. Three hours or less of watch removes fatigue, longer does not. Only when already suffering a Fatigued Condition and on watch is the Average (+20) Willpower Test made — a failure means falling asleep on duty.',
    weather: NO_WEATHER,
    seed: {
      def: { kind: 'characteristic', char: 'WP' },
      difficulty: 'Average',
      rollName: 'Willpower (Watch)',
    },
    seedNote:
      'Willpower is a plain characteristic → seedable. SITUATIONAL: the test is made ONLY when the watcher goes on watch while already Fatigued (Deft Steps p.126), not as a mandatory per-Stage roll.',
    citation: 'Deft Steps p.126: Watch Endeavour',
  },
];

/** Case-insensitive lookup by id or display name; returns undefined if unknown. */
export function getJourneyEndeavour(nameOrId: string): JourneyEndeavour | undefined {
  const key = String(nameOrId ?? '').trim().toLowerCase();
  if (!key) return undefined;
  return JOURNEY_ENDEAVOURS.find((e) => e.id === key || e.name.toLowerCase() === key);
}
