import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CharacterPage } from '../CharacterPage';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Mobile integration tests for CharacterPage.
 * Validates: Requirements 3.1, 3.3, 21.1
 *
 * Strategy: Render CharacterPage with mock data and assert that the correct
 * CSS module classes are applied. The actual responsive behavior (sticky positioning,
 * grid collapse) is handled by CSS media queries — these tests verify the classes
 * that carry those styles are present in the DOM.
 */

// Mock window.matchMedia for mobile viewport simulation
function mockMatchMedia(width: number) {
  return vi.fn().mockImplementation((query: string) => {
    // Parse max-width from the query
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

// Minimal character mock to satisfy CharacterPage props
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

const defaultProps = {
  character: createMockCharacter(),
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

describe('CharacterPage mobile: sub-tab bar and grid collapse', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeAll(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
  });

  describe('Requirement 3.1: Sub-tab bar renders tabs with min-height 44px class', () => {
    it('renders sub-tab buttons with a CSS module class containing min-height styling', () => {
      window.matchMedia = mockMatchMedia(375);

      render(<CharacterPage {...defaultProps} />);

      // The sub-tab buttons should be rendered
      const identityTab = screen.getByRole('tab', { name: /identity/i });
      const abilitiesTab = screen.getByRole('tab', { name: /abilities/i });
      const gearTab = screen.getByRole('tab', { name: /gear/i });
      const notesTab = screen.getByRole('tab', { name: /notes/i });

      // All tabs should be present
      expect(identityTab).toBeInTheDocument();
      expect(abilitiesTab).toBeInTheDocument();
      expect(gearTab).toBeInTheDocument();
      expect(notesTab).toBeInTheDocument();

      // The active tab should have the tabActive class (which carries the min-height 44px in mobile CSS)
      // CSS modules mangle class names, but we can verify they have a class attribute set
      expect(identityTab).toHaveAttribute('class');
      expect(identityTab.className).toMatch(/tabActive/);
    });

    it('all sub-tab buttons have the tab or tabActive class', () => {
      window.matchMedia = mockMatchMedia(375);

      render(<CharacterPage {...defaultProps} />);

      const buttons = screen.getAllByRole('tab').filter(
        (btn) => btn.className.match(/tab/)
      );

      // Expect exactly 4 sub-tab buttons
      expect(buttons).toHaveLength(4);

      // Each should have the tab class (which carries min-height: 44px on mobile)
      buttons.forEach((btn) => {
        expect(btn.className).toMatch(/tab/);
      });
    });
  });

  describe('Requirement 3.3: Sub-tab bar has sticky positioning class', () => {
    it('renders the sub-tab bar container with the subTabBar class (sticky on mobile)', () => {
      window.matchMedia = mockMatchMedia(375);

      render(<CharacterPage {...defaultProps} />);

      // The sub-tab bar container wraps the tab buttons
      const identityTab = screen.getByRole('tab', { name: /identity/i });
      const subTabBar = identityTab.parentElement;

      expect(subTabBar).not.toBeNull();
      // The container should have the subTabBar class which has position: sticky on mobile
      expect(subTabBar!.className).toMatch(/subTabBar/);
    });
  });

  describe('Requirement 21.1: Grid auto-fill collapse class is present', () => {
    it('renders the Identity fields grid with gridAutoFill class (collapses to 1fr below 400px)', () => {
      window.matchMedia = mockMatchMedia(375);

      render(<CharacterPage {...defaultProps} />);

      // The Identity tab should be active by default, containing gridAutoFill elements
      // Find an element with the gridAutoFill class
      const { container } = render(<CharacterPage {...defaultProps} />);
      const gridElements = container.querySelectorAll('[class*="gridAutoFill"]');

      // At least one gridAutoFill element should be present on the Identity tab
      expect(gridElements.length).toBeGreaterThan(0);
    });

    it('renders the movementFortuneGrid class on identity tab (collapses below 400px)', () => {
      window.matchMedia = mockMatchMedia(375);

      const { container } = render(<CharacterPage {...defaultProps} />);

      const movementGridElements = container.querySelectorAll('[class*="movementFortuneGrid"]');
      expect(movementGridElements.length).toBeGreaterThan(0);
    });
  });
});
