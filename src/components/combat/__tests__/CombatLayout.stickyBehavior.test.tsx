import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Combat Layout – Sticky Behaviour & Tab Panel Integration Tests
 * Validates: Requirements 3.2, 3.3, 3.4, 7.1, 7.2, 7.3
 *
 * Verifies:
 * 1. Segmented control has `.segmentedControlSticky` class on desktop viewports
 * 2. Dashboard does NOT have sticky positioning on desktop (no sticky-related class)
 * 3. All three tabs (Attack, Defend, Status) render their respective panels at full width
 */

// ─── matchMedia mock ─────────────────────────────────────────────────────────

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

// ─── Mock character in active combat ─────────────────────────────────────────

function createCombatCharacter(): Character {
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
    houseRules: { useGroupAdvantage: false, advantageCap: 99, min1Wound: false, useCriticalDeflection: false } as Character['houseRules'],
    knownRunes: [],
    learnedTechniques: [],
    log: [],
  } as Character;
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

// ─── Test Suites ─────────────────────────────────────────────────────────────

describe('Segmented Control sticky class on desktop (Req 7.1, 7.2)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('segmented control has the segmentedControlSticky class on desktop (1200px)', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const stickyControl = container.querySelector('[class*="segmentedControlSticky"]');
    expect(stickyControl).toBeInTheDocument();
  });

  it('segmented control with sticky class also has tablist role', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const stickyControl = container.querySelector('[class*="segmentedControlSticky"]');
    expect(stickyControl).toHaveAttribute('role', 'tablist');
  });
});

describe('Dashboard NOT sticky on desktop (Req 7.3)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('dashboard element does NOT have a class containing "sticky" on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const dashboard = container.querySelector('[data-testid="combat-dashboard"]');
    expect(dashboard).toBeInTheDocument();

    // The dashboard class should not include any sticky-related class name
    const classNames = dashboard!.className;
    expect(classNames).not.toMatch(/sticky/i);
  });

  it('does NOT render a compactDashboardSticky wrapper on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const compactStickyWrapper = container.querySelectorAll('[class*="compactDashboardSticky"]');
    expect(compactStickyWrapper.length).toBe(0);
  });
});

describe('All three tabs render respective panels at full width (Req 3.2, 3.3, 3.4)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('Attack mode renders Attack Flow and Quick Roll panels', () => {
    window.matchMedia = mockMatchMedia(1200);

    render(<CombatPage {...combatPageProps} />);

    // Default mode is Attack
    expect(screen.getByRole('button', { name: /Attack Flow/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Roll/i })).toBeInTheDocument();
  });

  it('Attack mode panels are NOT inside a combatRightColumn wrapper', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const rightColumn = container.querySelector('[class*="combatRightColumn"]');
    expect(rightColumn).not.toBeInTheDocument();
  });

  it('Defend mode renders Take Damage and Armour panels', () => {
    window.matchMedia = mockMatchMedia(1200);

    render(<CombatPage {...combatPageProps} />);

    // Switch to Defend tab
    const defendTab = screen.getByRole('tab', { name: /Defend/i });
    fireEvent.click(defendTab);

    // Multiple buttons may match (CollapsibleSection header + panel internal header)
    const takeDamageButtons = screen.getAllByRole('button', { name: /Take Damage/i });
    expect(takeDamageButtons.length).toBeGreaterThanOrEqual(1);

    const armourButtons = screen.getAllByRole('button', { name: /Armour/i });
    expect(armourButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('Defend mode panels are NOT inside a combatRightColumn wrapper', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // Switch to Defend tab
    const defendTab = screen.getByRole('tab', { name: /Defend/i });
    fireEvent.click(defendTab);

    const rightColumn = container.querySelector('[class*="combatRightColumn"]');
    expect(rightColumn).not.toBeInTheDocument();
  });

  it('Status mode renders Fortune & Resolve and Critical Wounds panels', () => {
    window.matchMedia = mockMatchMedia(1200);

    render(<CombatPage {...combatPageProps} />);

    // Switch to Status tab
    const statusTab = screen.getByRole('tab', { name: /Status/i });
    fireEvent.click(statusTab);

    expect(screen.getByRole('button', { name: /Fortune & Resolve/i })).toBeInTheDocument();

    // Multiple buttons may match for Critical Wounds (CollapsibleSection header + panel internal header)
    const criticalWoundsButtons = screen.getAllByRole('button', { name: /Critical Wounds/i });
    expect(criticalWoundsButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('Status mode panels are NOT inside a combatRightColumn wrapper', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // Switch to Status tab
    const statusTab = screen.getByRole('tab', { name: /Status/i });
    fireEvent.click(statusTab);

    const rightColumn = container.querySelector('[class*="combatRightColumn"]');
    expect(rightColumn).not.toBeInTheDocument();
  });
});
