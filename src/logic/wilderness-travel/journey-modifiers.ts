/**
 * Pure, React-free Terrain + Weather modifier model for the Wilderness Travel
 * journey tracker (Deft Steps, "Pathfinding" chapter, docs/deftsteps.md).
 *
 * Every table value and SL modifier below is transcribed VERBATIM from
 * docs/deftsteps.md at the cited page/line; nothing is invented. Only the
 * UNAMBIGUOUS flat-SL rows (Terrain cells, Precipitation, Visibility) are folded
 * into the computed net SL. GM-discretion / narrative items (Temperature
 * exposure tests, Wind, Bitter-gloves, terrain mitigations) are returned as
 * `advisory` text and are NEVER summed — the book states "Modifiers caused by
 * the weather are used at the discretion of the GM" (Deft Steps p.114).
 *
 * This module derives no mechanic that is auto-applied to a roll: the UI shows
 * the net SL as GUIDANCE next to the relevant endeavour, with a breakdown
 * tooltip. SL is a post-roll result the player reads off and records.
 */

// ─── Terrain ───────────────────────────────────────────────────────────────

/** The six terrain rows of the Terrain Table (Deft Steps p.124). */
export type TerrainType =
  | 'Light Woodland'
  | 'Hills'
  | 'Deep forest'
  | 'Temperate Plains'
  | 'Wetland'
  | 'Mountains';

export const TERRAIN_TYPES: readonly TerrainType[] = [
  'Light Woodland',
  'Hills',
  'Deep forest',
  'Temperate Plains',
  'Wetland',
  'Mountains',
] as const;

/**
 * Which Terrain Table column an endeavour keys off. The book's "Hunt/Fish"
 * column is a SPLIT value (Hunt vs Fish differ), so the two activities are
 * modelled as distinct keys 'Hunt' and 'Fish'.
 */
export type TerrainColumn =
  | 'Navigation'
  | 'Water'
  | 'Foraging'
  | 'Hunt'
  | 'Fish'
  | 'MakeCamp'
  | 'Watch';

interface TerrainRow {
  Navigation: number;
  Water: number;
  Foraging: number;
  Hunt: number;
  Fish: number;
  MakeCamp: number;
  Watch: number;
}

/**
 * Terrain Table — Deft Steps p.124 (grid ~L4595), transcribed cell-for-cell.
 * "-" (no modifier) is mapped to 0. The Hunt/Fish column is split into Hunt and
 * Fish because the book prints two sub-values per cell (e.g. "+1 SL/-").
 *
 *   TERRAIN         | Navigation | Water | Foraging | Hunt/Fish   | Make Camp | Watch
 *   Light Woodland  |     -      |   -   |  +1 SL   | +1 SL / -   |  +2 SL    |  -
 *   Hills           |     -      | -1 SL |  -1 SL   |   - / -     |   -       | +1 SL
 *   Deep forest     |   -2 SL    | -1 SL |  +1 SL   | -1 SL / -   | +1 SL     | -1 SL
 *   Temperate Plains|   +1 SL    |   -   |   -      | +1 SL / -   | -1 SL     | +1 SL
 *   Wetland         |     -      | +2 SL |  -1 SL   |  - / +1 SL  | -1 SL     | +1 SL
 *   Mountains       |     -      |   -   |  -2 SL   | -1 SL / -2 SL | -1 SL   |  -
 */
export const TERRAIN_TABLE: Record<TerrainType, TerrainRow> = {
  // Deft Steps p.124: Terrain Table — Light Woodland
  'Light Woodland': { Navigation: 0, Water: 0, Foraging: 1, Hunt: 1, Fish: 0, MakeCamp: 2, Watch: 0 },
  // Deft Steps p.124: Terrain Table — Hills
  Hills: { Navigation: 0, Water: -1, Foraging: -1, Hunt: 0, Fish: 0, MakeCamp: 0, Watch: 1 },
  // Deft Steps p.124: Terrain Table — Deep forest
  'Deep forest': { Navigation: -2, Water: -1, Foraging: 1, Hunt: -1, Fish: 0, MakeCamp: 1, Watch: -1 },
  // Deft Steps p.124: Terrain Table — Temperate Plains
  'Temperate Plains': { Navigation: 1, Water: 0, Foraging: 0, Hunt: 1, Fish: 0, MakeCamp: -1, Watch: 1 },
  // Deft Steps p.124: Terrain Table — Wetland
  Wetland: { Navigation: 0, Water: 2, Foraging: -1, Hunt: 0, Fish: 1, MakeCamp: -1, Watch: 1 },
  // Deft Steps p.124: Terrain Table — Mountains
  Mountains: { Navigation: 0, Water: 0, Foraging: -2, Hunt: -1, Fish: -2, MakeCamp: -1, Watch: 0 },
};

/**
 * Human labels for a terrain column, used in the breakdown tooltip.
 */
const TERRAIN_COLUMN_LABEL: Record<TerrainColumn, string> = {
  Navigation: 'Navigation',
  Water: 'Water',
  Foraging: 'Foraging',
  Hunt: 'Hunt',
  Fish: 'Fish',
  MakeCamp: 'Make Camp',
  Watch: 'Watch',
};

// ─── Weather ─────────────────────────────────────────────────────────────────

/**
 * Temperature categories (Weather Table column, Deft Steps p.114).
 * The roll table prints Sweltering / Hot / Comfortable / Chilly / Bitter.
 */
export type Temperature = 'Sweltering' | 'Hot' | 'Comfortable' | 'Chilly' | 'Bitter';

/** Precipitation categories (Deft Steps p.114). */
export type Precipitation = 'None' | 'Light' | 'Heavy' | 'Very Heavy';

/**
 * Visibility categories. The Weather Table's d10 roll column prints only
 * Clear / Mist / Thick Fog, but the modifier prose (Deft Steps p.114) defines a
 * THREE-tier ladder Mist (-1) / Fog (-2) / Thick Fog (-3). "Fog" (the -2 tier)
 * is a real, cited category even though the d10 roll never yields it directly;
 * it is kept selectable for GM-set weather. See the UI caption.
 */
export type Visibility = 'Clear' | 'Mist' | 'Fog' | 'Thick Fog';

export const TEMPERATURE_OPTIONS: readonly Temperature[] = [
  'Sweltering', 'Hot', 'Comfortable', 'Chilly', 'Bitter',
] as const;
export const PRECIPITATION_OPTIONS: readonly Precipitation[] = [
  'None', 'Light', 'Heavy', 'Very Heavy',
] as const;
export const VISIBILITY_OPTIONS: readonly Visibility[] = [
  'Clear', 'Mist', 'Fog', 'Thick Fog',
] as const;

/** The per-Stage weather selection (SL-relevant columns only; Wind omitted — no SL effect). */
export interface StageWeather {
  temperature?: Temperature;
  precipitation?: Precipitation;
  visibility?: Visibility;
}

/**
 * Which weather flat-SL rule(s) an endeavour's test is subject to. An endeavour
 * can be hit by Precipitation (if it is an Athletics/Climb/Ranged (Blackpowder)
 * test), by the Very-Heavy "other Tests" blanket -1, and/or by Visibility
 * (Navigation / Ranged / sight-based Perception).
 */
export interface WeatherApplicability {
  /** Deft Steps p.114: Precipitation -1/-2/-3 to Athletics, Climb, Ranged (Blackpowder). */
  precipitationAthletics: boolean;
  /** Deft Steps p.114: Visibility -1/-2/-3 to Navigation, Ranged, sight-based Perception. */
  visibility: boolean;
  /**
   * Deft Steps p.114: whether this endeavour's test involves Dexterity, so the
   * Bitter "wearing gloves ... -2 SL to Dexterity tasks" rule is advisory-relevant.
   */
  dexterity: boolean;
}

// ─── Weather modifier values (verbatim, Deft Steps p.114) ─────────────────────

/** Precipitation -SL to Athletics/Climb/Ranged (Blackpowder). Deft Steps p.114. */
const PRECIP_ATHLETICS_SL: Record<Precipitation, number> = {
  None: 0,
  Light: -1, // Deft Steps p.114: "Light - -1 SL to Athletics, Climb, and Ranged (Blackpowder) Tests."
  Heavy: -2, // Deft Steps p.114: "Heavy - -2 SL to Athletics, Climb, and Ranged (Blackpowder) Tests."
  'Very Heavy': -3, // Deft Steps p.114: "Very Heavy - -3 SL to Athletics, Climb, and Ranged (Blackpowder) Tests."
};

/** Very Heavy precipitation also gives "-1 SL to other Tests". Deft Steps p.114. */
const PRECIP_OTHER_SL: Record<Precipitation, number> = {
  None: 0,
  Light: 0,
  Heavy: 0,
  'Very Heavy': -1, // Deft Steps p.114: Very Heavy "-1 SL to other Tests."
};

/** Visibility -SL to Navigation/Ranged/sight-based Perception. Deft Steps p.114. */
const VISIBILITY_SL: Record<Visibility, number> = {
  Clear: 0,
  Mist: -1, // Deft Steps p.114: "Mist - -1 SL to Navigation, Ranged, and Perception Tests based on sight ... over 20 yards."
  Fog: -2, // Deft Steps p.114: "Fog - -2 SL to Navigation, Ranged, and Perception Tests based on sight ... over 10 yards."
  'Thick Fog': -3, // Deft Steps p.114: "Thick Fog - -3 SL to Navigation, Ranged, and Perception Tests based on sight ... over 5 yards."
};

// ─── Net-SL computation ───────────────────────────────────────────────────────

/** One labelled component of the net-SL breakdown (for the calculated-total tooltip). */
export interface SLComponent {
  label: string;
  value: number;
}

export interface NetSLResult {
  /** Σ of the unambiguous flat-SL components. */
  net: number;
  /** Labelled breakdown, e.g. [{label:'Terrain (Mountains Navigation)', value:-2}, …]. */
  components: SLComponent[];
  /** GM-discretion / narrative notes NOT folded into `net` (temperature, wind, gloves, mitigations). */
  advisory: string[];
}

/** The subset of a catalog endeavour this module needs (avoids a circular import). */
export interface ModifierTarget {
  name: string;
  terrainKey?: TerrainColumn;
  weather: WeatherApplicability;
}

function isTerrain(value: unknown): value is TerrainType {
  return typeof value === 'string' && (TERRAIN_TYPES as readonly string[]).includes(value);
}

/**
 * Total lookup: returns the mapped flat-SL for a recognised category key, or 0
 * for any out-of-enum value. Keeps `computeEndeavourNetSL` defensive — an
 * out-of-enum weather category yields 0, never NaN or a throw.
 */
function lookup<K extends string>(table: Record<K, number>, key: string): number {
  const v = (table as Record<string, number>)[key];
  return typeof v === 'number' ? v : 0;
}

/**
 * Pure. Total. Never throws. Never mutates its arguments.
 *
 * Given an endeavour's terrain key + weather applicability and the Stage's
 * selected terrain + weather, return the net flat SL modifier and its labelled
 * breakdown. Unselected terrain/weather contribute nothing (net 0). Only the
 * unambiguous flat-SL table rows are summed; everything GM-discretion goes to
 * `advisory` and is never summed. (Deft Steps p.114/p.124.)
 */
export function computeEndeavourNetSL(
  endeavour: ModifierTarget,
  terrain: TerrainType | undefined,
  weather: StageWeather | undefined,
): NetSLResult {
  const components: SLComponent[] = [];
  const advisory: string[] = [];

  // ── Terrain (unambiguous flat-SL lookup) ──────────────────────────────────
  if (endeavour.terrainKey && isTerrain(terrain)) {
    const value = TERRAIN_TABLE[terrain][endeavour.terrainKey];
    if (value !== 0) {
      components.push({
        label: `Terrain (${terrain} ${TERRAIN_COLUMN_LABEL[endeavour.terrainKey]})`,
        value,
      });
    }
  }

  // ── Weather (only the unambiguous flat-SL rows are summed) ────────────────
  const w = weather ?? {};

  // Precipitation → Athletics/Climb/Ranged (Blackpowder) tests.
  if (endeavour.weather.precipitationAthletics && w.precipitation) {
    const value = lookup(PRECIP_ATHLETICS_SL, w.precipitation);
    if (value !== 0) {
      components.push({ label: `Weather (Precipitation ${w.precipitation})`, value });
    }
  }
  // Very Heavy precipitation → "-1 SL to other Tests" for endeavours NOT already
  // hit by the Athletics rule (Deft Steps p.114).
  if (!endeavour.weather.precipitationAthletics && w.precipitation) {
    const value = lookup(PRECIP_OTHER_SL, w.precipitation);
    if (value !== 0) {
      components.push({ label: `Weather (${w.precipitation} precipitation, other Tests)`, value });
    }
  }

  // Visibility → Navigation/Ranged/sight-based Perception.
  if (endeavour.weather.visibility && w.visibility) {
    const value = lookup(VISIBILITY_SL, w.visibility);
    if (value !== 0) {
      components.push({ label: `Weather (Visibility ${w.visibility})`, value });
    }
  }

  // ── Advisory (GM-discretion / conditional / narrative — never summed) ─────
  // Bitter + gloves: -2 SL to Dexterity tasks, but only when gloves are worn
  // (a circumstance the sheet does not track). Deft Steps p.114.
  if (endeavour.weather.dexterity && w.temperature === 'Bitter') {
    advisory.push(
      'Bitter cold: wearing gloves is required, and tasks involving Dexterity suffer −2 SL while worn (GM discretion). (Deft Steps p.114)',
    );
  }
  // Temperature exposure is a test, not a flat endeavour SL modifier. Deft Steps p.114.
  if (w.temperature === 'Hot') {
    advisory.push('Hot: drink 1 gallon/day; test for heat exposure once per Stage (Core p.181). (Deft Steps p.114)');
  }
  if (w.temperature === 'Sweltering') {
    advisory.push('Sweltering: drink 2 gallons/day; Challenging (+0) Endurance Test for heat exposure. (Deft Steps p.114)');
  }
  if (w.temperature === 'Chilly') {
    advisory.push('Chilly: if not well-equipped, Challenging (+0) Endurance Test or suffer Cold Exposure. (Deft Steps p.114)');
  }
  if (w.temperature === 'Bitter') {
    advisory.push('Bitter: test for Cold Exposure at least once (twice if ill-equipped); needs a good shelter/fire. (Deft Steps p.114)');
  }

  const net = components.reduce((sum, c) => sum + c.value, 0);
  return { net, components, advisory };
}
