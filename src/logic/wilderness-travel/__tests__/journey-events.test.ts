import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  EVENT_TABLES,
  EVENT_TRIGGER_RULE,
  EVENT_TRIGGER_THRESHOLD,
  TERRAIN_EVENT_TABLE_ID,
  findRow,
  getEventTable,
  getEventTableForTerrain,
  resolveWildernessEvent,
  rollWildernessEvent,
} from '../journey-events';
import { TERRAIN_TYPES, type TerrainType } from '../journey-modifiers';

/**
 * Slice C tests. The literal fixture pins every event-table row (verbatim text)
 * so later edits cannot silently alter the transcribed rules (NFR-1). The
 * resolver tests pin the trigger threshold, the Table-1 redirect, and the
 * terrain→table mapping across every Slice-B terrain identifier.
 */

// ─── Literal fixture: all four tables, verbatim (Deft Steps pp.116–117) ──────

describe('EVENT_TABLES — verbatim fixture (Deft Steps pp.116–117)', () => {
  it('pins the trigger rule and threshold verbatim (Deft Steps p.116)', () => {
    expect(EVENT_TRIGGER_THRESHOLD).toBe(8);
    expect(EVENT_TRIGGER_RULE).toBe(
      'Every time the Characters undertake a stage the GM should roll 1D10. If the result is an 8 or more something unexpected has occured.',
    );
  });

  it('pins Table 1 — Light Woodland, Hills, and Temperate Plains (p.116)', () => {
    const t = getEventTable(1);
    expect(t.name).toBe('Wilderness Travel Events Table 1 — Light Woodland, Hills, and Temperate Plains');
    expect(t.terrains).toEqual(['Light Woodland', 'Hills', 'Temperate Plains']);
    expect(t.page).toBe(116);
    expect(t.rows).toEqual([
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
    ]);
  });

  it('pins Table 2 — Mountains, with the 1–5 Table-1 redirect row (p.117)', () => {
    const t = getEventTable(2);
    expect(t.name).toBe('Wilderness Travel Events Table 2 — Mountains');
    expect(t.terrains).toEqual(['Mountains']);
    expect(t.page).toBe(117);
    expect(t.rows).toEqual([
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
    ]);
  });

  it('pins Table 3 — Deep Forest, with the 1–5 Table-1 redirect row (p.117)', () => {
    const t = getEventTable(3);
    expect(t.name).toBe('Wilderness Travel Events Table 3 — Deep Forest');
    expect(t.terrains).toEqual(['Deep forest']);
    expect(t.page).toBe(117);
    expect(t.rows).toEqual([
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
    ]);
  });

  it('pins Table 4 — Wetlands, with the 1–5 redirect and the terser p.117 Beast Lair row', () => {
    const t = getEventTable(4);
    expect(t.name).toBe('Wilderness Travel Events Table 4 — Wetlands');
    expect(t.terrains).toEqual(['Wetland']);
    expect(t.page).toBe(117);
    expect(t.rows).toEqual([
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
    ]);
  });

  it('every table has exactly rows covering 1..10 with no gaps or overlaps', () => {
    for (const table of EVENT_TABLES) {
      const covered: number[] = [];
      for (const row of table.rows) {
        for (let n = row.min; n <= row.max; n++) covered.push(n);
      }
      expect(covered.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    }
  });
});

// ─── Terrain → table mapping (matches Slice-B terrain identifiers) ───────────

describe('terrain → event-table mapping (Deft Steps p.116–117)', () => {
  it('maps every Slice-B TerrainType to the correct table id', () => {
    expect(TERRAIN_EVENT_TABLE_ID).toEqual({
      'Light Woodland': 1,
      Hills: 1,
      'Temperate Plains': 1,
      Mountains: 2,
      'Deep forest': 3,
      Wetland: 4,
    });
  });

  it('covers exactly the Slice-B TerrainType set (no invented identifiers)', () => {
    expect(Object.keys(TERRAIN_EVENT_TABLE_ID).sort()).toEqual([...TERRAIN_TYPES].sort());
  });

  it('getEventTableForTerrain returns a table whose terrains include the terrain', () => {
    for (const terrain of TERRAIN_TYPES) {
      const table = getEventTableForTerrain(terrain);
      expect(table.terrains).toContain(terrain);
    }
  });
});

// ─── resolveWildernessEvent — trigger threshold & redirect semantics ─────────

const TABLE_1_TERRAINS: TerrainType[] = ['Light Woodland', 'Hills', 'Temperate Plains'];
const REDIRECT_TERRAINS: TerrainType[] = ['Mountains', 'Deep forest', 'Wetland'];

describe('resolveWildernessEvent — trigger threshold (Deft Steps p.116)', () => {
  it('triggerRoll 1–7 never triggers an event, for every terrain', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TERRAIN_TYPES),
        fc.integer({ min: 1, max: 7 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (terrain, triggerRoll, eventRoll, redirectRoll) => {
          const r = resolveWildernessEvent(terrain, triggerRoll, eventRoll, redirectRoll);
          expect(r.triggered).toBe(false);
          expect(r.resolvedRow).toBeUndefined();
        },
      ),
    );
  });

  it('triggerRoll 8–10 always triggers an event with a resolved row, for every terrain', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TERRAIN_TYPES),
        fc.integer({ min: 8, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (terrain, triggerRoll, eventRoll, redirectRoll) => {
          const r = resolveWildernessEvent(terrain, triggerRoll, eventRoll, redirectRoll);
          expect(r.triggered).toBe(true);
          expect(r.resolvedRow).toBeDefined();
          expect(typeof r.resolvedRow!.result).toBe('string');
          expect(r.resolvedRow!.redirectToTable1).toBeFalsy();
        },
      ),
    );
  });
});

describe('resolveWildernessEvent — Table-1 redirect (Deft Steps p.117)', () => {
  it('Mountains/Deep forest/Wetland + eventRoll 1–5 resolves to a Table-1 row via redirectRoll', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...REDIRECT_TERRAINS),
        fc.integer({ min: 8, max: 10 }),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 10 }),
        (terrain, triggerRoll, eventRoll, redirectRoll) => {
          const r = resolveWildernessEvent(terrain, triggerRoll, eventRoll, redirectRoll);
          expect(r.redirected).toBe(true);
          expect(r.redirectRoll).toBe(redirectRoll);
          expect(r.resolvedTable?.id).toBe(1);
          // The resolved row is exactly the Table-1 row for the redirect roll.
          expect(r.resolvedRow).toEqual(findRow(getEventTable(1), redirectRoll));
        },
      ),
    );
  });

  it('Mountains/Deep forest/Wetland + eventRoll 6–10 uses the terrain table own row (no redirect)', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...REDIRECT_TERRAINS),
        fc.integer({ min: 8, max: 10 }),
        fc.integer({ min: 6, max: 10 }),
        (terrain, triggerRoll, eventRoll) => {
          const r = resolveWildernessEvent(terrain, triggerRoll, eventRoll);
          expect(r.redirected).toBe(false);
          const terrainTable = getEventTableForTerrain(terrain);
          expect(r.resolvedTable?.id).toBe(terrainTable.id);
          expect(r.resolvedRow).toEqual(findRow(terrainTable, eventRoll));
        },
      ),
    );
  });

  it('Table-1 terrains never redirect, for any eventRoll', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...TABLE_1_TERRAINS),
        fc.integer({ min: 8, max: 10 }),
        fc.integer({ min: 1, max: 10 }),
        (terrain, triggerRoll, eventRoll) => {
          const r = resolveWildernessEvent(terrain, triggerRoll, eventRoll);
          expect(r.redirected).toBe(false);
          expect(r.resolvedTable?.id).toBe(1);
          expect(r.resolvedRow).toEqual(findRow(getEventTable(1), eventRoll));
        },
      ),
    );
  });

  it('falls back to eventRoll when redirectRoll is omitted on a redirect', () => {
    // Mountains, trigger 8, event 3 (1–5 → redirect), no explicit redirectRoll.
    const r = resolveWildernessEvent('Mountains', 8, 3);
    expect(r.redirected).toBe(true);
    expect(r.redirectRoll).toBe(3);
    expect(r.resolvedRow).toEqual(findRow(getEventTable(1), 3));
  });
});

// ─── rollWildernessEvent — thin RNG wrapper (seam reuse) ─────────────────────

describe('rollWildernessEvent — deterministic via injected RNG seam', () => {
  /** Queue-backed RNG: pops the next float, mapping to a d10 via floor(v*10)+1. */
  function seededRng(values: number[]): () => number {
    let i = 0;
    return () => values[i++ % values.length];
  }

  it('consumes trigger, event, and redirect rolls in order and matches the pure resolver', () => {
    // v=0.0 → d10 1, v=0.75 → d10 8, v=0.35 → d10 4.
    // trigger=8 (triggers), event=4 (1–5 redirect on Mountains), redirect=1.
    const rng = seededRng([0.75, 0.35, 0.0]);
    const r = rollWildernessEvent('Mountains', rng);
    expect(r.triggerRoll).toBe(8);
    expect(r.eventRoll).toBe(4);
    expect(r.redirectRoll).toBe(1);
    expect(r).toEqual(resolveWildernessEvent('Mountains', 8, 4, 1));
  });

  it('no event when the trigger roll is below threshold', () => {
    // v=0.6 → d10 7 (below 8).
    const rng = seededRng([0.6, 0.6, 0.6]);
    const r = rollWildernessEvent('Hills', rng);
    expect(r.triggered).toBe(false);
  });
});
