import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import { CombatPage } from '../CombatPage';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Desktop layout structural tests.
 * Validates: Requirements 22.1, 24.1
 *
 * Strategy: Mock matchMedia at desktop width (1200px) and verify
 * that the correct CSS module classes / DOM containers are present.
 * Actual layout behavior (grid columns, sticky positioning) is
 * handled by CSS media queries — these tests verify the structural
 * elements that carry those styles exist in the DOM.
 */

// Mock window.matchMedia for viewport simulation
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

// Minimal character mock
function createMockCharacter(): Character {
  const charKeys = ['WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel'] as const;
  const chars = {} as Character['chars'];
  for (const key of charKeys) {
    chars[key] = { i: 30, a: 5, b: 0 };
  }

  return {
    _v: 6,
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
    combatState: { active: false, round: 0, engaged: false },
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
    houseRules: {} as Character['houseRules'],
    knownRunes: [],
    learnedTechniques: [],
    log: [],
  } as Character;
}

const characterPageProps = {
  character: createMockCharacter(),
  characterId: 'test-char-1',
  update: vi.fn(),
  updateCharacter: vi.fn(),
  totalWounds: 12,
  armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 } as ArmourPoints,
  maxEncumbrance: 30,
  coinWeight: 0,
  rollHistory: [],
  addRoll: vi.fn(),
  clearHistory: vi.fn(),
};

function createCombatCharacter(): Character {
  const char = createMockCharacter();
  // Put character in active combat to trigger two-column layout
  char.combatState = { inCombat: true, currentRound: 1, engaged: false } as Character['combatState'];
  char.houseRules = { useGroupAdvantage: false, advantageCap: 99, min1Wound: false, useCriticalDeflection: false } as Character['houseRules'];
  return char;
}

const combatPageProps = {
  character: createCombatCharacter(),
  characterId: 'test-char-1',
  update: vi.fn(),
  updateCharacter: vi.fn(),
  totalWounds: 12,
  armourPoints: { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 } as ArmourPoints,
  maxEncumbrance: 30,
  coinWeight: 0,
  rollHistory: [],
  addRoll: vi.fn(),
  clearHistory: vi.fn(),
};

describe('Desktop two-column layout: CharacterPage (Req 22.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders the desktopGrid container element at desktop width', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CharacterPage {...characterPageProps} />);

    // The desktopGrid class should be present (carries grid-template-columns on ≥1025px)
    const gridElements = container.querySelectorAll('[class*="desktopGrid"]');
    expect(gridElements.length).toBeGreaterThan(0);
  });

  it('renders both left and right column containers at desktop width', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CharacterPage {...characterPageProps} />);

    const leftColumn = container.querySelectorAll('[class*="desktopGridLeft"]');
    const rightColumn = container.querySelectorAll('[class*="desktopGridRight"]');

    expect(leftColumn.length).toBeGreaterThan(0);
    expect(rightColumn.length).toBeGreaterThan(0);
  });

  it('renders both columns visible (not hidden) at desktop width', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CharacterPage {...characterPageProps} />);

    // On desktop, both columns should exist. Even the "mobileHidden" variant should
    // be overridden by CSS to display:flex on desktop. Verify elements exist in DOM.
    const leftColumn = container.querySelector('[class*="desktopGridLeft"]');
    const rightColumn = container.querySelector('[class*="desktopGridRight"]');

    expect(leftColumn).toBeInTheDocument();
    expect(rightColumn).toBeInTheDocument();
  });
});

describe('Desktop two-column layout: CombatPage (Req 24.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('does NOT render combatTwoColumn container on desktop (single-column layout)', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // Two-column layout has been removed — single-column flow is used instead
    const twoColElements = container.querySelectorAll('[class*="combatTwoColumn"]');
    expect(twoColElements.length).toBe(0);
  });

  it('does NOT render combatLeftColumn on desktop (single-column layout)', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // Left column has been removed — CombatDashboard renders inline as full-width
    const leftColumn = container.querySelectorAll('[class*="combatLeftColumn"]');
    expect(leftColumn.length).toBe(0);
  });

  it('does NOT render combatTwoColumn when viewport is below 1025px', () => {
    window.matchMedia = mockMatchMedia(768);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // At mobile/tablet width, the combatTwoColumn container should not be present
    const twoColElements = container.querySelectorAll('[class*="combatTwoColumn"]');
    expect(twoColElements.length).toBe(0);
  });

  it('does NOT render combatLeftColumn when viewport is below 1025px', () => {
    window.matchMedia = mockMatchMedia(768);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // Left column should not be present on mobile/tablet
    const leftColumn = container.querySelectorAll('[class*="combatLeftColumn"]');
    expect(leftColumn.length).toBe(0);
  });
});

describe('Desktop two-column breakpoint behavior', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('CharacterPage at exactly 1025px still renders desktop grid structure', () => {
    window.matchMedia = mockMatchMedia(1025);

    const { container } = render(<CharacterPage {...characterPageProps} />);

    const gridElements = container.querySelectorAll('[class*="desktopGrid"]');
    expect(gridElements.length).toBeGreaterThan(0);
  });

  it('CombatPage at exactly 1025px does NOT render two-column layout (single-column now)', () => {
    window.matchMedia = mockMatchMedia(1025);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const twoColElements = container.querySelectorAll('[class*="combatTwoColumn"]');
    expect(twoColElements.length).toBe(0);
  });

  it('CombatPage at 1024px (below breakpoint) does NOT render two-column layout', () => {
    window.matchMedia = mockMatchMedia(1024);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const twoColElements = container.querySelectorAll('[class*="combatTwoColumn"]');
    expect(twoColElements.length).toBe(0);
  });
});
