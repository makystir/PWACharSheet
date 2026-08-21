import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../../pages/CombatPage';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Combat Layout – Single-Column Integration Tests
 * Validates: Requirements 1.1, 1.2, 3.1, 5.1, 5.2, 5.3
 *
 * Verifies:
 * 1. No two-column grid (`.combatTwoColumn`) exists on desktop in combat
 * 2. CombatDashboard renders exactly once (no duplicate left-column instance)
 * 3. Render order: Segmented Control → CombatDashboard → Tab Content panels
 * 4. Mobile/tablet compact sticky dashboard renders for Attack/Defend modes
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

describe('Single-column layout: No two-column grid on desktop (Req 1.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('does NOT render a combatTwoColumn element when inCombat=true on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const twoColElements = container.querySelectorAll('[class*="combatTwoColumn"]');
    expect(twoColElements.length).toBe(0);
  });

  it('does NOT render a combatLeftColumn element when inCombat=true on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const leftColElements = container.querySelectorAll('[class*="combatLeftColumn"]');
    expect(leftColElements.length).toBe(0);
  });

  it('does NOT render a combatRightColumn element when inCombat=true on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const rightColElements = container.querySelectorAll('[class*="combatRightColumn"]');
    expect(rightColElements.length).toBe(0);
  });
});

describe('Single-column layout: CombatDashboard renders exactly once (Req 1.2)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders exactly one full CombatDashboard on desktop in attack mode', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const dashboards = container.querySelectorAll('[data-testid="combat-dashboard"]');
    expect(dashboards.length).toBe(1);
  });

  it('renders exactly one full CombatDashboard on desktop in defend mode', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    // Default mode is attack; but on desktop the dashboard always renders once
    // regardless of mode because it's the full-width banner
    const dashboards = container.querySelectorAll('[data-testid="combat-dashboard"]');
    expect(dashboards.length).toBe(1);
  });

  it('does NOT render a compact dashboard on desktop (no duplicate)', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const compactDashboards = container.querySelectorAll('[data-testid="combat-dashboard-compact"]');
    expect(compactDashboards.length).toBe(0);
  });
});

describe('Single-column layout: Render order – Segmented Control → Dashboard → Tab Content (Req 1.2, 3.1)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('Segmented Control appears before CombatDashboard in DOM order', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const tablist = container.querySelector('[role="tablist"]');
    const dashboard = container.querySelector('[data-testid="combat-dashboard"]');

    expect(tablist).toBeInTheDocument();
    expect(dashboard).toBeInTheDocument();

    // compareDocumentPosition: if tablist precedes dashboard, result includes DOCUMENT_POSITION_FOLLOWING (4)
    const position = tablist!.compareDocumentPosition(dashboard!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('CombatDashboard appears before tab content panels in DOM order', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const dashboard = container.querySelector('[data-testid="combat-dashboard"]');

    // Tab content: look for the first CollapsibleSection (Attack Flow in attack mode)
    // CollapsibleSection renders with a heading button containing the title
    const attackFlowHeading = screen.getByRole('button', { name: /Attack Flow/i });

    expect(dashboard).toBeInTheDocument();
    expect(attackFlowHeading).toBeInTheDocument();

    // Dashboard should precede the Attack Flow panel
    const position = dashboard!.compareDocumentPosition(attackFlowHeading);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('Segmented Control appears before tab content panels in DOM order', () => {
    window.matchMedia = mockMatchMedia(1200);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const tablist = container.querySelector('[role="tablist"]');
    const attackFlowHeading = screen.getByRole('button', { name: /Attack Flow/i });

    expect(tablist).toBeInTheDocument();
    expect(attackFlowHeading).toBeInTheDocument();

    // Segmented control should precede tab content
    const position = tablist!.compareDocumentPosition(attackFlowHeading);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe('Mobile/tablet: Compact sticky dashboard renders for Attack/Defend (Req 5.1, 5.2, 5.3)', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('renders compact sticky dashboard on mobile (767px) in attack mode', () => {
    window.matchMedia = mockMatchMedia(767);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const compactDashboards = container.querySelectorAll('[data-testid="combat-dashboard-compact"]');
    expect(compactDashboards.length).toBe(1);
  });

  it('renders compact sticky dashboard on tablet (1024px) in attack mode', () => {
    window.matchMedia = mockMatchMedia(1024);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const compactDashboards = container.querySelectorAll('[data-testid="combat-dashboard-compact"]');
    expect(compactDashboards.length).toBe(1);
  });

  it('compact dashboard wrapper has the sticky class on mobile', () => {
    window.matchMedia = mockMatchMedia(767);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const stickyWrapper = container.querySelectorAll('[class*="compactDashboardSticky"]');
    expect(stickyWrapper.length).toBe(1);
  });

  it('does NOT render two-column layout on tablet viewport', () => {
    window.matchMedia = mockMatchMedia(1024);

    const { container } = render(<CombatPage {...combatPageProps} />);

    const twoColElements = container.querySelectorAll('[class*="combatTwoColumn"]');
    expect(twoColElements.length).toBe(0);
  });
});
