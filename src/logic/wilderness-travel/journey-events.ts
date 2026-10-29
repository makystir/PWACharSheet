/**
 * Wilderness Travel Events — the four 1d10 event tables + a pure event-roll
 * resolver (Deft Steps, Light Fingers — "Pathfinding" chapter, docs/deftsteps.md,
 * pp.116–117). Pure, React-free, JSON-plain. NO UI imports, NO dice RNG in the
 * resolver (rolls are passed in so it is deterministically testable).
 *
 * Every table row below is transcribed VERBATIM from docs/deftsteps.md at the
 * cited page; nothing is invented. Page-reference sidebars the events point to
 * (Ancient Tomb p.121, Monolith p.120, Ruin p.119, Victim Quirk p.29, Outlaw
 * profile p.103, disease pages) are OUT OF SCOPE: the page-reference text is
 * transcribed verbatim inside each event's result, but those sidebar tables are
 * NOT modelled here.
 *
 * Trigger rule (Deft Steps p.116): "Every time the Characters undertake a stage
 * the GM should roll 1D10. If the result is an 8 or more something unexpected
 * has occured." It is GM-discretion whether the event actually occurs
 * (surfaced as reference/guidance only — NOTHING is auto-applied).
 *
 * The Table-1 redirect (Tables 2/3/4, rolls 1–5) is modelled explicitly: those
 * rows redirect to Table 1 rather than carrying their own result text. The
 * resolver resolves the redirect against Table 1 using a second 1d10.
 */

import type { TerrainType } from './journey-modifiers';

// ─── Trigger rule (verbatim, Deft Steps p.116) ───────────────────────────────

/**
 * The threshold at or above which the trigger 1d10 produces an event.
 * // Deft Steps p.116: "the GM should roll 1D10. If the result is an 8 or more
 * // something unexpected has occured."
 */
export const EVENT_TRIGGER_THRESHOLD = 8;

/**
 * The trigger rule, transcribed verbatim (Deft Steps p.116). Surfaced in the UI
 * as the reference text for the event-roll helper.
 */
export const EVENT_TRIGGER_RULE =
  'Every time the Characters undertake a stage the GM should roll 1D10. If the result is an 8 or more something unexpected has occured.';

// ─── Event-table model ────────────────────────────────────────────────────────

/**
 * One row of an event table. A row is either:
 *  - a concrete result (`result` text, `redirectToTable1` false/absent), or
 *  - a redirect to Table 1 for the 1–5 range (`redirectToTable1: true`,
 *    `result` holds the verbatim redirect sentence only — NOT the table title).
 * `min`/`max` describe the inclusive 1d10 range the row covers (single values
 * use min===max).
 */
export interface EventRow {
  min: number;
  max: number;
  /** The verbatim result text (or the verbatim redirect sentence for the 1–5 row). */
  result: string;
  /** True only for the Tables 2/3/4 "1–5" row that redirects to Table 1. */
  redirectToTable1?: boolean;
}

export interface EventTable {
  /** Table id: 1–4, matching the book's "TABLE n" numbering. */
  id: 1 | 2 | 3 | 4;
  /** The book's table name (without the "Result" header artefact). */
  name: string;
  /** Terrain(s) this table applies to (must match the Slice-B TerrainType values). */
  terrains: readonly TerrainType[];
  /** Page citation. */
  page: number;
  /** The 1d10 rows, ordered by `min`. */
  rows: readonly EventRow[];
}

// ─── Table 1 — Light Woodland, Hills, and Temperate Plains (Deft Steps p.116) ─
// Verbatim rows 1–10, single Result column.
const TABLE_1: EventTable = {
  id: 1,
  name: 'Wilderness Travel Events Table 1 — Light Woodland, Hills, and Temperate Plains',
  terrains: ['Light Woodland', 'Hills', 'Temperate Plains'],
  page: 116,
  rows: [
    {
      min: 1,
      max: 1,
      result:
        "Pathway Blocked. A lake, river, or gorge blocks the Characters' path. It is impossible to navigate around using mundane means, so unless the Characters possess some means to fly over and engineer their way across, they must find another route, adding a further two stages to their journey.",
    },
    {
      min: 2,
      max: 2,
      result:
        'Barrow. The Characters pass by a series of eerie standing stones surrounding a small hill. Any Character passing an Easy (+40) Lore (History) or Lore (Local) Test will recognise this as a barrow. See the Ancient Tomb Table (page 121) for more information.',
    },
    {
      min: 3,
      max: 3,
      result:
        'Monolith. The Characters notice a large single standing stone or ancient circle of menhirs. See the sidebar on Monoliths (page 120) for more information.',
    },
    {
      min: 4,
      max: 4,
      result:
        'Ruin. The Characters notice the remains of old buildings as they pass by. See the sidebar on Ruins (page 119) for more information.',
    },
    {
      min: 5,
      max: 5,
      result:
        'Ailing Animal. Randomly select one of the animals accompanying the party. This animal is ailing. If a member of the party passes a Hard (-20) Animal Care Test there is no effect. If not impose the penalties for a Festering Wound (WFRP page 187) to the animal. If this result is generated a second time for the same animal, it passes away.',
    },
    {
      min: 6,
      max: 6,
      result:
        'Worn Out Item. A piece of equipment suffers wear and tear. Randomly determine a Character and one of their trappings. If a member of the party passes a Hard (-20) Trade (Carpenter, Leather Worker, Tailor, or Smith) Test there is no effect. If not, a metal item gains the Shoddy Flaw or an item of leather, canvas, or wood falls apart.',
    },
    {
      min: 7,
      max: 7,
      result:
        'Fellow Travellers. The Characters spot a band of fellow travellers ahead of them. These travellers may be avoided or approached. The travellers are a group of 4-6 Pedlars or Villagers. Use the Victim Quirk Table on page 29 to help determine how they might behave. For the profiles of the travellers, use the Outlaw profile on page 103.',
    },
    {
      min: 8,
      max: 8,
      result:
        'Spring. Clear, fresh water bubbles from the ground. The party may replenish their stocks of water as if they succeeded a Water Endeavour with no need to test.',
    },
    {
      min: 9,
      max: 9,
      result:
        'Animals Encountered. A pack of 6 wolves or pair of bears forage not far from the Characters. They are unlikely to make an aggressive moves against a group, but may trail the party and attack a straggler or stray pack animal.',
    },
    {
      min: 10,
      max: 10,
      result:
        "Enemies Encountered. A small group of 4-6 enemies crosses the Characters' path. In the hillsides, light woodlands, and temperate plains of the Reikland suitable enemies may be tribes of Goblins, herds of Ungors, or a band of Outlaws (see page 103).",
    },
  ],
};

// ─── Table 2 — Mountains (Deft Steps p.117) ───────────────────────────────────
// NOTE: the "1-5" row is the Table-1 REDIRECT (its verbatim redirect sentence
// only — the "TABLE 2 - MOUNTAINS Result" title artefact baked into the source
// cell is NOT part of the result). Rows 6–10 are Mountains-specific.
const TABLE_2: EventTable = {
  id: 2,
  name: 'Wilderness Travel Events Table 2 — Mountains',
  terrains: ['Mountains'],
  page: 117,
  rows: [
    {
      min: 1,
      max: 5,
      redirectToTable1: true,
      result:
        'Wilderness Event. Roll on the Wilderness Travel Events Table 1 - Light Woodland, Hills and Temperate Plains.',
    },
    {
      min: 6,
      max: 6,
      result:
        'Mountain Sickness. This sometimes afflicts those travelling at high altitudes before they can get used to the lack of oxygen in the air. Characters should make a Challenging (+0) Endurance Test or be subject to Mountain Sickness. 0 Contraction: Upon failing Endurance Test 0 Incubation: Immediate 0 Duration: Ends as soon as exposure ends, or until a successful test 0 Symptoms: Malaise, Nausea Ogres, Dwarfs, and animals that are used to life at high altitude do not need to test for Mountain Sickness.',
    },
    {
      min: 7,
      max: 7,
      result:
        'Scree Slope. The Characters path is blocked by a steep slope of small loose stones. They can either cross or add two stages to the journey. If they cross each member must pass a Challenging (+0) Athletics Test. Those who fail suffer a fall of 1d10 yards. Quadrupeds, such as mounts and pack animals, benefit from +2 SL when taking this test.',
    },
    {
      min: 8,
      max: 8,
      result:
        'Blizzard. The weather changes dramatically for the worse. Refer to the Weather Rules on page 114 and apply the following factors: Temperature: Bitter, Precipitation: Very Heavy, Visibility: Thick Fog, Wind: Very Strong. Once the stage is complete reroll the weather conditions as the blizzard abates.',
    },
    {
      min: 9,
      max: 9,
      result:
        'Beast Lair. The Characters come across the lair of a monstrous beast. In the mountains of the Reikland this is likely to be a Griffon, but it may be a Manticore, Pegasus, or Wyvern. Roll 1d10. 1-3: The beast is home and possesses the Territorial Trait, it will attack the Characters as long as they are within 50 yards of the lair. 4-5: The beast is starving, reduce Strength and Toughness by 20, all other Characteristics by 10, and Wounds by 3d10. 6-7: The beast is home and will fight Characters to the death. 8-9: The beast is absent, but in each round, there is a 3% chance that it will return. 10: The beast is absent. To determine whether there is anything of value in the lair roll twice on the loot column of the Ancient Tomb Table (page 121).',
    },
    {
      min: 10,
      max: 10,
      result:
        "Enemies Encountered. A small group of enemies crosses the Characters' path. In the mountains of the Reikland suitable enemies may be tribes of Orcs and Goblins, a band of Outlaws, or a pair of Stone Trolls.",
    },
  ],
};

// ─── Table 3 — Deep Forest (Deft Steps p.117) ─────────────────────────────────
const TABLE_3: EventTable = {
  id: 3,
  name: 'Wilderness Travel Events Table 3 — Deep Forest',
  terrains: ['Deep forest'],
  page: 117,
  rows: [
    {
      min: 1,
      max: 5,
      redirectToTable1: true,
      result:
        'Wilderness Event. Roll on the Wilderness Travel Events Table 1 - Light Woodland, Hills and Temperate Plains.',
    },
    {
      min: 6,
      max: 6,
      result:
        'Bloodsedge Grove. The Characters wander into an area within which Bloodsedge bushes grow. These predatory plants grasp and strangle prey with their thorny branches. A Character can identify (and avoid) Bloodsedge by passing an Easy (+40) Lore (Herbs) or Challenging (+0) Outdoor Survival Test. If the GM has access to a copy of Lustria the rules for Grasping Creeper Vine could be used in place of Bloodsedge. Otherwise, the Characters must cross an area of 3d10 Yards, making a Hard (-20) Dodge Test every Round they spend in the area. Any time a Character fails the Test they take a Damage 5 Hit to a randomly determined location.',
    },
    {
      min: 7,
      max: 7,
      result:
        'Herbs. The Characters cross a glade within which valuable herbs grow. These plants can be identified by passing an Easy (+40) Lore (Herbs) Test. The herbs may be Weirdroot or Moonflower from the WFRP Core Rulebook, or any of the herbs described in the Death on the Reik Companion.',
    },
    {
      min: 8,
      max: 8,
      result:
        'Spites. This area of the forest is plagued by Spites. If the GM has access to Salzenmund: City of Salt and Silver they could use the rules presented there to represent the Spites. If not, each Character is unable to sleep soundly whilst in the area and must take a Fatigued Condition that lasts until they make a successful Recuperate Endeavour.',
    },
    {
      min: 9,
      max: 9,
      result:
        'Spiders. The Characters come across the lair of 4-6 Giant Spiders. Most of these creatures will be Size (Small), but one will be Size: Large. The spiders will seek to attack and entangle the Characters and will fight to the death.',
    },
    {
      min: 10,
      max: 10,
      result:
        "Enemies Encountered. A small group of enemies crosses the Characters' path. In the forests of the Reikland suitable enemies may be tribes of Forest Goblins, a herd of Beastmen consisting of Ungors and Gors, or a band of Outlaws.",
    },
  ],
};

// ─── Table 4 — Wetlands (Deft Steps p.117) ────────────────────────────────────
const TABLE_4: EventTable = {
  id: 4,
  name: 'Wilderness Travel Events Table 4 — Wetlands',
  terrains: ['Wetland'],
  page: 117,
  rows: [
    {
      min: 1,
      max: 5,
      redirectToTable1: true,
      result:
        'Wilderness Event. Roll on the Wilderness Travel Events Table 1 - Light Woodland, Hills and Temperate Plains.',
    },
    {
      min: 6,
      max: 6,
      result:
        'Swamp Fever. This is transmitted by bites from creatures like bog leeches and sea slugs. The bites often go unnoticed, especially when the victim is wading through murky swamp water. The disease is characterised by a painful, raw, red patch around the bite and sudden bouts of fever. 0 Contraction: A Challenging (+0) Endurance Test 0 Incubation: 1d5 days 0 Duration: 1d10 days 0 Symptoms: Malaise, Fever, Flux (Moderate)',
    },
    {
      min: 7,
      max: 7,
      result:
        'Quick Mud. The area of the swamp is particularly treacherous, with soft mud flats that threaten to engulf any travellers who stray into it. The Characters can either skirt the mudflats by adding two stages to their journey, or risk crossing them. To cross the mudflats each Character and accompanying animal must make an Extended Challenging (+0) Strength Test to a total of 15 SL. If any fumbles are generated in the test the Character in question must test for Suffocation (WFRP page 181) and start the process from the start to escape the mud flats. Characters may only assist their companions in these tests if they have already escaped the hazard.',
    },
    {
      min: 8,
      max: 8,
      result:
        'Foul Air. The Characters wander into an area of suffocating gas. The gas pocket is 2d10 yards long and anyone crossing must make an Average (+20) Endurance Test each turn or suffer the effects. This is like becoming drunk, so refer to the rules for Consume Alcohol, WFRP page 121 (though it is the Endurance Test, rather than a Consume Alcohol Test, that must be passed to avoid impairment). If a Character passes out within the gas pocket they must be rescued or succumb to the gas and die in TB rounds. A point of Resilience may be spent in order to escape the gas pocket. Once free of the area an Average (+20) Endurance Test may be made every 5 minutes: the effects wear off once this test is passed. There is no hangover.',
    },
    {
      // Deft Steps p.117: Table 4 row 9 is terser than Table 2's Beast Lair — transcribed exactly as printed.
      min: 9,
      max: 9,
      result: 'Beast Lair. The Characters come across the lair of a monstrous beast.',
    },
    {
      min: 10,
      max: 10,
      result:
        "Enemies Encountered. A small group of enemies crosses the Characters' path. In the wetlands of the Reikland, suitable enemies may be a band of six Goblins, a pair of River Trolls, or a band of three Fimir.",
    },
  ],
};

/** All four event tables, in book order (Deft Steps pp.116–117). */
export const EVENT_TABLES: readonly EventTable[] = [TABLE_1, TABLE_2, TABLE_3, TABLE_4];

// ─── Terrain → table mapping ──────────────────────────────────────────────────

/**
 * Maps each Slice-B TerrainType to the event table it uses. Keys match the
 * exact TerrainType values from journey-modifiers.ts (including the lowercase
 * 'f' in 'Deep forest' and singular 'Wetland'); no new terrain identifiers are
 * invented.
 * // Deft Steps p.116–117: Table 1 covers Light Woodland, Hills, and Temperate
 * // Plains; Table 2 = Mountains; Table 3 = Deep Forest; Table 4 = Wetlands.
 */
export const TERRAIN_EVENT_TABLE_ID: Record<TerrainType, 1 | 2 | 3 | 4> = {
  'Light Woodland': 1,
  Hills: 1,
  'Temperate Plains': 1,
  Mountains: 2,
  'Deep forest': 3,
  Wetland: 4,
};

/** Look up an event table by its 1–4 id. Total; never throws. */
export function getEventTable(id: 1 | 2 | 3 | 4): EventTable {
  return EVENT_TABLES[id - 1];
}

/** The event table for a terrain (Deft Steps p.116–117 mapping). */
export function getEventTableForTerrain(terrain: TerrainType): EventTable {
  return getEventTable(TERRAIN_EVENT_TABLE_ID[terrain]);
}

/** Find the row covering a given 1d10 value in a table. Total; null if out of 1–10. */
export function findRow(table: EventTable, roll: number): EventRow | null {
  return table.rows.find((r) => roll >= r.min && roll <= r.max) ?? null;
}

// ─── Pure event-roll resolver ─────────────────────────────────────────────────

/** The outcome of resolving a single event-roll for one Stage. */
export interface WildernessEventResult {
  /** triggerRoll >= EVENT_TRIGGER_THRESHOLD. */
  triggered: boolean;
  /** The 1d10 trigger roll passed in. */
  triggerRoll: number;
  /** The terrain used to pick the table. */
  terrain: TerrainType;
  /** The table the terrain maps to (always present — the terrain's own table). */
  terrainTable: EventTable;
  /** The 1d10 event roll (undefined when no event triggered). */
  eventRoll?: number;
  /** Whether the event roll landed on the terrain table's 1–5 Table-1 redirect. */
  redirected?: boolean;
  /** The second 1d10 used to resolve a redirect on Table 1 (only when redirected). */
  redirectRoll?: number;
  /** The table the final resolved row came from (terrain table, or Table 1 on a redirect). */
  resolvedTable?: EventTable;
  /** The resolved event row (undefined when no event triggered). */
  resolvedRow?: EventRow;
}

/**
 * Pure. Total. Never throws. Never mutates its arguments. No dice RNG — all
 * rolls are passed in so the function is deterministically testable.
 *
 * Given the Stage terrain and the dice inputs, returns whether an event
 * triggered (triggerRoll >= 8, Deft Steps p.116) and, if so, the resolved event
 * row. For Mountains/Deep forest/Wetland an eventRoll of 1–5 redirects to Table
 * 1 (Deft Steps p.117): `redirectRoll` is used to look up the Table-1 row.
 * Table-1 terrains (Light Woodland / Hills / Temperate Plains) never redirect.
 *
 * @param terrain      the Stage's selected terrain.
 * @param triggerRoll  the 1d10 trigger roll (1–10).
 * @param eventRoll    the 1d10 event roll (1–10); only consulted when triggered.
 * @param redirectRoll the second 1d10 used on a Table-1 redirect; defaults to
 *                     `eventRoll` if omitted (callers that roll a dedicated die
 *                     pass it explicitly).
 */
export function resolveWildernessEvent(
  terrain: TerrainType,
  triggerRoll: number,
  eventRoll: number,
  redirectRoll?: number,
): WildernessEventResult {
  const terrainTable = getEventTableForTerrain(terrain);
  const triggered = triggerRoll >= EVENT_TRIGGER_THRESHOLD;

  if (!triggered) {
    return { triggered: false, triggerRoll, terrain, terrainTable };
  }

  const terrainRow = findRow(terrainTable, eventRoll);

  // Table-1 redirect (Tables 2/3/4, roll 1–5): resolve against Table 1.
  if (terrainRow?.redirectToTable1) {
    const effectiveRedirectRoll = redirectRoll ?? eventRoll;
    const resolvedRow = findRow(TABLE_1, effectiveRedirectRoll) ?? undefined;
    return {
      triggered: true,
      triggerRoll,
      terrain,
      terrainTable,
      eventRoll,
      redirected: true,
      redirectRoll: effectiveRedirectRoll,
      resolvedTable: TABLE_1,
      resolvedRow,
    };
  }

  return {
    triggered: true,
    triggerRoll,
    terrain,
    terrainTable,
    eventRoll,
    redirected: false,
    resolvedTable: terrainTable,
    resolvedRow: terrainRow ?? undefined,
  };
}

// ─── Thin dice wrapper (reuses the project's RNG seam) ────────────────────────

/** Random-number source: a function returning a float in [0, 1), like Math.random. */
export type RNG = () => number;

/** Roll a single d10 (1..10) via the injected RNG seam. */
function rollD10(rng: RNG): number {
  return Math.floor(rng() * 10) + 1;
}

/**
 * Thin, impure wrapper that generates the three 1d10 rolls via the injected RNG
 * seam (production passes Math.random; tests pass a deterministic RNG) and
 * delegates to the pure `resolveWildernessEvent`. The redirect roll is always
 * generated but only used when the event roll lands on a 1–5 redirect row.
 */
export function rollWildernessEvent(terrain: TerrainType, rng: RNG = Math.random): WildernessEventResult {
  const triggerRoll = rollD10(rng);
  const eventRoll = rollD10(rng);
  const redirectRoll = rollD10(rng);
  return resolveWildernessEvent(terrain, triggerRoll, eventRoll, redirectRoll);
}
