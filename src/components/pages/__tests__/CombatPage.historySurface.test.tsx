import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../CombatPage';
import type { Character, ArmourPoints, LogEvent } from '../../../types/character';

/**
 * History Review Surface Tests (ux-audit-improvements, Task 18.2)
 * **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
 *
 * Verifies that CombatPage surfaces the unified-event-log `TimelineView` sourced
 * purely from `character.eventLog`:
 *   - Req 13.1: the Timeline_View is reachable from the combat surface (Status mode).
 *   - Req 13.2: the roll/combat history shown comes from `character.eventLog`.
 *   - Req 13.3: filtering to `roll` and `combat` categories works.
 *   - Req 13.4: no separate roll-history store is introduced — the events all
 *     originate from `character.eventLog` (removing the log removes the history).
 */

// ─── matchMedia mock (min-width / max-width aware) ───────────────────────────

function mockMatchMedia(width: number) {
  return vi.fn().mockImplementation((query: string) => {
    const maxWidthMatch = query.match(/\(max-width:\s*(\d+)px\)/);
    const maxWidth = maxWidthMatch ? parseInt(maxWidthMatch[1], 10) : Infinity;

    const minWidthMatch = query.match(/\(min-width:\s*(\d+)px\)/);
    const minWidth = minWidthMatch ? parseInt(minWidthMatch[1], 10) : 0;

    const matches = width >= minWidth && width <= maxWidth;

    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

// ─── A mixed event log (oldest-first, as the store keeps it) ─────────────────

const ROLL_SUMMARY = 'Rolled Melee (Basic): 34 vs 55 (+2 SL)';
const COMBAT_SUMMARY = 'Attacked with hand weapon for 6 net wounds';
const WEALTH_SUMMARY = 'Spent 5 GC on supplies';

const EVENT_LOG: LogEvent[] = [
  {
    id: 'e1',
    timestamp: 1_000,
    category: 'roll',
    type: 'roll.skill',
    summary: ROLL_SUMMARY,
    payload: {},
  },
  {
    id: 'e2',
    timestamp: 2_000,
    category: 'wealth',
    type: 'wealth.ledger',
    summary: WEALTH_SUMMARY,
    payload: {},
  },
  {
    id: 'e3',
    timestamp: 3_000,
    category: 'combat',
    type: 'combat.attack',
    summary: COMBAT_SUMMARY,
    payload: {},
  },
];

// ─── A full character in active combat with an event log ─────────────────────

function createCombatCharacter(overrides: Partial<Character> = {}): Character {
  const charKeys = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'] as const;
  const chars = {} as Character['chars'];
  for (const key of charKeys) {
    chars[key] = { i: 30, a: 5, b: 0 };
  }

  return {
    _v: 8,
    name: 'Test Character',
    species: 'Human',
    class: 'Warrior',
    career: 'Soldier',
    careerLevel: 'Silver 1',
    careerPath: 'Soldier > Sergeant',
    status: 'Silver 1',
    age: '25',
    height: '5\'10"',
    hair: 'Brown',
    eyes: 'Blue',
    chars,
    charBonusOverrides: {} as Character['charBonusOverrides'],
    move: { m: 4, w: 8, r: 16 },
    fate: 2,
    fortune: 2,
    resilience: 2,
    resolve: 2,
    motivation: 'Glory',
    speciesExtraPoints: 3,
    speciesSkills: [],
    speciesTalents: [],
    woundsUseSB: false,
    xpCur: 100,
    xpSpent: 50,
    xpTotal: 150,
    conditions: [],
    advantage: 0,
    sessionState: { active: false, startTime: 0, elapsed: 0, xpAwarded: 0 },
    combatState: { inCombat: true, currentRound: 1, engaged: false } as Character['combatState'],
    advancementLog: [],
    advancementLogArchive: [],
    sessionHistory: [],
    quickActions: [],
    criticalWounds: [],
    bSkills: [
      { n: 'Athletics', c: 'Ag', a: 5 },
      { n: 'Cool', c: 'WP', a: 10 },
    ],
    aSkills: [],
    talents: [],
    ambS: 'Short ambition',
    ambL: 'Long ambition',
    partyN: 'Party Name',
    partyS: 'Party short',
    partyL: 'Party long',
    partyM: 'Party members',
    psych: '',
    armour: [],
    ap: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 },
    trappings: [],
    wD: 0,
    wSS: 0,
    wGC: 0,
    eMax: 0,
    eMaxOverride: null,
    wSB: 0,
    wTB2: 0,
    wWPB: 0,
    wHardy: 0,
    wCur: 12,
    weapons: [],
    spells: [],
    channellingProgress: [],
    ammo: [],
    corr: 0,
    sin: 0,
    muts: '',
    mutations: [],
    companions: [],
    estate: { holdings: [], ledger: [], retainers: [], notes: '' },
    endeavours: [],
    portrait: '',
    houseRules: { useGroupAdvantage: false, advantageCap: 99, min1Wound: false, useCriticalDeflection: false, initiativeFormula: 'initiativePlusD10' } as Character['houseRules'],
    knownRunes: [],
    learnedTechniques: [],
    eventLog: EVENT_LOG,
    log: [],
    ...overrides,
  } as Character;
}

function getCombatPageProps(overrides: Partial<Character> = {}) {
  const character = createCombatCharacter(overrides);
  let captured = character;
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    captured = mutator(structuredClone(captured));
  });
  return {
    props: {
      character,
      characterId: 'test-char-1',
      update: vi.fn(),
      updateCharacter,
      totalWounds: 12,
      armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 } as ArmourPoints,
      maxEncumbrance: 30,
      coinWeight: 0,
      rollHistory: [],
      addRoll: vi.fn(),
      clearHistory: vi.fn(),
    },
    updateCharacter,
    getCaptured: () => captured,
  };
}

/**
 * Locate the History section's TimelineView container. The History section is a
 * CollapsibleSection titled "History"; the TimelineView inside carries the
 * "Filter by category" group. We scope queries to that group's nearest
 * container so the assertions don't collide with the separate legacy Roll
 * History panel.
 */
function getTimelineContainer(): HTMLElement {
  const filterGroup = screen.getByRole('group', { name: 'Filter by category' });
  // The TimelineView root is the filter group's parent.
  const container = filterGroup.parentElement;
  if (!container) throw new Error('TimelineView container not found');
  return container as HTMLElement;
}

// Enter Status mode (where the History surface lives).
function openStatusMode() {
  fireEvent.click(screen.getByRole('tab', { name: 'Status' }));
}

describe('CombatPage history surface — Timeline_View sourced from eventLog', () => {
  let originalMatchMedia: typeof window.matchMedia;
  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });
  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  // ── Req 13.1 / 13.2: renders events from character.eventLog ──────────────

  it('renders the History surface showing event summaries from character.eventLog', () => {
    window.matchMedia = mockMatchMedia(1200);
    render(<CombatPage {...getCombatPageProps().props} />);
    openStatusMode();

    // The History section renders the TimelineView (its category filter group).
    expect(screen.getByRole('group', { name: 'Filter by category' })).toBeInTheDocument();

    // Every eventLog summary is shown (sourced from character.eventLog).
    const timeline = getTimelineContainer();
    expect(within(timeline).getByText(ROLL_SUMMARY)).toBeInTheDocument();
    expect(within(timeline).getByText(COMBAT_SUMMARY)).toBeInTheDocument();
    expect(within(timeline).getByText(WEALTH_SUMMARY)).toBeInTheDocument();
  });

  // ── Req 13.3: filter to `roll` and `combat` works ───────────────────────

  it('exposes both Roll and Combat filter chips', () => {
    window.matchMedia = mockMatchMedia(1200);
    render(<CombatPage {...getCombatPageProps().props} />);
    openStatusMode();

    const timeline = getTimelineContainer();
    expect(within(timeline).getByRole('button', { name: 'Roll' })).toBeInTheDocument();
    expect(within(timeline).getByRole('button', { name: 'Combat' })).toBeInTheDocument();
  });

  it('filtering to Combat shows only combat events and hides roll events', () => {
    window.matchMedia = mockMatchMedia(1200);
    render(<CombatPage {...getCombatPageProps().props} />);
    openStatusMode();

    const timeline = getTimelineContainer();
    const combatChip = within(timeline).getByRole('button', { name: 'Combat' });
    fireEvent.click(combatChip);

    expect(combatChip).toHaveAttribute('aria-pressed', 'true');
    expect(within(timeline).getByText(COMBAT_SUMMARY)).toBeInTheDocument();
    expect(within(timeline).queryByText(ROLL_SUMMARY)).not.toBeInTheDocument();
    expect(within(timeline).queryByText(WEALTH_SUMMARY)).not.toBeInTheDocument();
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(1);
  });

  it('filtering to Roll shows only roll events and hides combat events', () => {
    window.matchMedia = mockMatchMedia(1200);
    render(<CombatPage {...getCombatPageProps().props} />);
    openStatusMode();

    const timeline = getTimelineContainer();
    const rollChip = within(timeline).getByRole('button', { name: 'Roll' });
    fireEvent.click(rollChip);

    expect(rollChip).toHaveAttribute('aria-pressed', 'true');
    expect(within(timeline).getByText(ROLL_SUMMARY)).toBeInTheDocument();
    expect(within(timeline).queryByText(COMBAT_SUMMARY)).not.toBeInTheDocument();
    expect(within(timeline).queryByText(WEALTH_SUMMARY)).not.toBeInTheDocument();
    expect(within(timeline).getAllByRole('listitem')).toHaveLength(1);
  });

  // ── Req 13.4: no separate store — history comes from character.eventLog ──

  it('sources history from character.eventLog — an empty eventLog yields the empty state', () => {
    window.matchMedia = mockMatchMedia(1200);
    render(<CombatPage {...getCombatPageProps({ eventLog: [] }).props} />);
    openStatusMode();

    // TimelineView is still surfaced (its filter group), but with no events it
    // shows the empty state rather than any roll/combat summaries — proving the
    // list is driven solely by character.eventLog and not a separate store.
    const timeline = getTimelineContainer();
    expect(within(timeline).getByText('No events yet')).toBeInTheDocument();
    expect(within(timeline).queryByText(ROLL_SUMMARY)).not.toBeInTheDocument();
    expect(within(timeline).queryByText(COMBAT_SUMMARY)).not.toBeInTheDocument();
    expect(within(timeline).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('clearing the History surface clears character.eventLog (no separate store)', () => {
    window.matchMedia = mockMatchMedia(1200);
    const harness = getCombatPageProps();
    render(<CombatPage {...harness.props} />);
    openStatusMode();

    const timeline = getTimelineContainer();
    fireEvent.click(within(timeline).getByRole('button', { name: 'Clear' }));

    const dialog = screen.getByRole('dialog', { name: 'Confirmation' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear' }));

    // The clear went through updateCharacter → clearEventLog, emptying eventLog.
    expect(harness.updateCharacter).toHaveBeenCalled();
    expect(harness.getCaptured().eventLog).toEqual([]);
  });
});
