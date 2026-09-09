import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CombatPage } from '../CombatPage';
import type { Character, ArmourPoints } from '../../../types/character';

/**
 * Combat Mode Surfacing Tests (ux-audit-improvements, Task 13.2)
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 *
 * Verifies:
 * 1. Desktop: the status dashboard stays visible while Attack/Defend/Status
 *    surfaces remain reachable (Req 9.1).
 * 2. Mobile: the segmented Attack/Defend/Status control is preserved (Req 9.2).
 * 3. Switching modes preserves entered values — mode panels stay MOUNTED and
 *    toggle via CSS/aria-hidden rather than unmounting (Req 9.3).
 * 4. The segmented control's mode buttons meet the UI-layout touch-target rule
 *    (Req 9.4).
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

// ─── Mock character in active combat ─────────────────────────────────────────

function createCombatCharacter(): Character {
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
    log: [],
  } as Character;
}

function getCombatPageProps() {
  return {
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
}

// Helper: locate the mode panel wrapper (div toggled via modePanel/modePanelHidden)
// that contains a section with the given heading text.
function findModePanelContaining(container: HTMLElement, headingText: RegExp): HTMLElement {
  const panels = Array.from(
    container.querySelectorAll<HTMLElement>('[class*="modePanel"]'),
  );
  const match = panels.find((p) => headingText.test(p.textContent ?? ''));
  if (!match) throw new Error(`No mode panel found containing ${headingText}`);
  return match;
}

// ─── Requirement 9.1: Desktop keeps dashboard visible + modes reachable ──────

describe('Req 9.1 — Desktop: dashboard stays visible with modes reachable', () => {
  let originalMatchMedia: typeof window.matchMedia;
  beforeAll(() => { originalMatchMedia = window.matchMedia; });
  afterAll(() => { window.matchMedia = originalMatchMedia; });

  it('renders the full status dashboard while in combat on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    const dashboards = container.querySelectorAll('[data-testid="combat-dashboard"]');
    expect(dashboards.length).toBe(1);
  });

  it('keeps the dashboard visible regardless of the active mode (Attack/Defend/Status all reachable)', () => {
    window.matchMedia = mockMatchMedia(1200);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    // Attack, Defend, Status tabs are all present and reachable.
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Attack', 'Defend', 'Status']);

    // Switch through each mode; the full dashboard must remain mounted/visible.
    for (const label of ['Defend', 'Status', 'Attack']) {
      fireEvent.click(screen.getByRole('tab', { name: label }));
      expect(container.querySelectorAll('[data-testid="combat-dashboard"]').length).toBe(1);
    }
  });

  it('does not render the compact sticky dashboard on desktop', () => {
    window.matchMedia = mockMatchMedia(1200);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    const compact = container.querySelectorAll('[data-testid="combat-dashboard-compact"]');
    expect(compact.length).toBe(0);
  });
});

// ─── Requirement 9.2: Mobile preserves the segmented control ─────────────────

describe('Req 9.2 — Mobile: segmented control preserved', () => {
  let originalMatchMedia: typeof window.matchMedia;
  beforeAll(() => { originalMatchMedia = window.matchMedia; });
  afterAll(() => { window.matchMedia = originalMatchMedia; });

  it('renders the segmented Attack/Defend/Status control on a mobile viewport', () => {
    window.matchMedia = mockMatchMedia(375);
    render(<CombatPage {...getCombatPageProps()} />);

    const tablist = screen.getByRole('tablist', { name: 'Combat mode' });
    expect(tablist).toBeInTheDocument();

    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.map((t) => t.textContent)).toEqual(['Attack', 'Defend', 'Status']);
  });

  it('renders the compact sticky dashboard on mobile for Attack/Defend modes', () => {
    window.matchMedia = mockMatchMedia(375);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    const compact = container.querySelectorAll('[data-testid="combat-dashboard-compact"]');
    expect(compact.length).toBe(1);
  });
});

// ─── Requirement 9.3: Switching modes preserves entered values ───────────────

describe('Req 9.3 — Switching modes preserves entered values (panels stay mounted)', () => {
  let originalMatchMedia: typeof window.matchMedia;
  beforeAll(() => { originalMatchMedia = window.matchMedia; });
  afterAll(() => { window.matchMedia = originalMatchMedia; });

  it('keeps both Attack and Defend panels mounted while only the active one is visible', () => {
    window.matchMedia = mockMatchMedia(1200);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    // Attack Flow (attack panel) and Take Damage (defend panel) are BOTH in the DOM,
    // even though the inactive panel is aria-hidden. `getByRole` respects aria-hidden,
    // so we assert presence in the DOM directly (pass hidden: true for the hidden one).
    expect(screen.getByRole('button', { name: 'Attack Flow' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Take Damage', hidden: true })).toBeInTheDocument();

    const attackPanel = findModePanelContaining(container, /Attack Flow/i);
    const defendPanel = findModePanelContaining(container, /Take Damage/i);

    // Default mode is attack: attack panel visible, defend panel hidden.
    expect(attackPanel).toHaveAttribute('aria-hidden', 'false');
    expect(defendPanel).toHaveAttribute('aria-hidden', 'true');
    expect(defendPanel.className).toContain('modePanelHidden');
  });

  it('preserves a value entered in the Defend TakeDamage input after switching away and back', () => {
    window.matchMedia = mockMatchMedia(1200);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    // Switch to Defend and enter a Damage value in TakeDamagePanel.
    fireEvent.click(screen.getByRole('tab', { name: 'Defend' }));
    const defendPanel = findModePanelContaining(container, /Take Damage/i);
    expect(defendPanel).toHaveAttribute('aria-hidden', 'false');

    const damageInput = within(defendPanel).getByLabelText('Incoming damage') as HTMLInputElement;
    fireEvent.change(damageInput, { target: { value: '7' } });
    expect(damageInput.value).toBe('7');

    // Switch to Attack, then back to Defend.
    fireEvent.click(screen.getByRole('tab', { name: 'Attack' }));
    expect(findModePanelContaining(container, /Take Damage/i)).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(screen.getByRole('tab', { name: 'Defend' }));

    // The panel was never unmounted, so the entered value persists.
    const damageInputAfter = within(findModePanelContaining(container, /Take Damage/i))
      .getByLabelText('Incoming damage') as HTMLInputElement;
    expect(damageInputAfter.value).toBe('7');
  });

  it('does not unmount the Attack panel when Defend mode is active', () => {
    window.matchMedia = mockMatchMedia(1200);
    const { container } = render(<CombatPage {...getCombatPageProps()} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Defend' }));

    // Attack Flow section is still present in the DOM, just hidden (aria-hidden).
    const attackPanel = findModePanelContaining(container, /Attack Flow/i);
    expect(attackPanel).toHaveAttribute('aria-hidden', 'true');
    expect(attackPanel.className).toContain('modePanelHidden');
    // Query with hidden: true because getByRole otherwise excludes aria-hidden subtrees.
    expect(screen.getByRole('button', { name: 'Attack Flow', hidden: true })).toBeInTheDocument();
  });
});

// ─── Requirement 9.4: Touch targets on the mode control ──────────────────────

describe('Req 9.4 — Mode surfacing touch targets meet the UI-layout rule', () => {
  let originalMatchMedia: typeof window.matchMedia;
  beforeAll(() => { originalMatchMedia = window.matchMedia; });
  afterAll(() => { window.matchMedia = originalMatchMedia; });

  it('mode tabs carry the segmented-control classes that enforce the touch-target size', () => {
    window.matchMedia = mockMatchMedia(375);
    render(<CombatPage {...getCombatPageProps()} />);

    const tablist = screen.getByRole('tablist', { name: 'Combat mode' });
    // The segmented control container carries the segmentedControl class.
    expect(tablist.className).toContain('segmentedControl');

    const tabs = within(tablist).getAllByRole('tab');
    expect(tabs.length).toBe(3);
    // Each tab is a real button with a segment/segmentActive class that the CSS
    // module sizes to the ≥44px touch target per the UI-layout steering rule.
    for (const tab of tabs) {
      expect(tab.tagName).toBe('BUTTON');
      expect(tab.className).toMatch(/segment/i);
    }
  });
});
