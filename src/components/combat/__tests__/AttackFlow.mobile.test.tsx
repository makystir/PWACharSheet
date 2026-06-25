import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AttackFlow } from '../AttackFlow';
import type { AttackFlowProps } from '../AttackFlow';
import type { Character, WeaponItem, ArmourPoints } from '../../../types/character';
import { BLANK_CHARACTER } from '../../../types/character';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    chars: {
      ...BLANK_CHARACTER.chars,
      WS: { i: 40, a: 10, b: 0 }, // total 50
      BS: { i: 35, a: 5, b: 0 },  // total 40
      S: { i: 40, a: 5, b: 0 },   // total 45 → SB 4
    },
    ...overrides,
  };
}

function meleeWeapon(overrides: Partial<WeaponItem> = {}): WeaponItem {
  return {
    name: 'Hand Weapon',
    group: 'Basic',
    enc: '1',
    rangeReach: 'Average',
    damage: '+SB+4',
    qualities: '—',
    ...overrides,
  };
}

const defaultArmourPoints: ArmourPoints = {
  head: 2, lArm: 1, rArm: 1, body: 3, lLeg: 0, rLeg: 0, shield: 0,
};

function makeProps(overrides: Partial<AttackFlowProps> = {}): AttackFlowProps {
  return {
    weapons: [meleeWeapon()],
    character: makeCharacter(),
    armourPoints: defaultArmourPoints,
    onRoll: vi.fn(),
    ...overrides,
  };
}

/** Mock Math.random to return a specific d100 value (1-100). */
function mockRoll(d100Value: number) {
  vi.spyOn(Math, 'random').mockReturnValue((d100Value - 1) / 100);
}

// ─── Mobile viewport setup ───────────────────────────────────────────────────

let originalInnerWidth: number;

function setupMobileViewport() {
  originalInnerWidth = window.innerWidth;
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 375,
  });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('max-width: 767px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function teardownMobileViewport() {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: originalInnerWidth,
  });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AttackFlow — mobile weapon layout (Requirement 8.1)', () => {
  beforeEach(() => {
    setupMobileViewport();
  });

  afterEach(() => {
    teardownMobileViewport();
    vi.restoreAllMocks();
  });

  it('renders weapon buttons in a group container with >2 weapons', () => {
    const weapons = [
      meleeWeapon({ name: 'Sword' }),
      meleeWeapon({ name: 'Axe' }),
      meleeWeapon({ name: 'Mace' }),
    ];
    render(<AttackFlow {...makeProps({ weapons })} />);

    // All three weapon buttons should be present
    expect(screen.getByLabelText('Select Sword')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Axe')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Mace')).toBeInTheDocument();
  });

  it('weapon button group has the correct CSS class for vertical stacking via :has()', () => {
    const weapons = [
      meleeWeapon({ name: 'Sword' }),
      meleeWeapon({ name: 'Axe' }),
      meleeWeapon({ name: 'Mace' }),
    ];
    render(<AttackFlow {...makeProps({ weapons })} />);

    // The weaponBtnGroup class is applied to the container
    const swordBtn = screen.getByLabelText('Select Sword');
    const btnGroup = swordBtn.parentElement;
    expect(btnGroup).toBeTruthy();
    // The group should have the weaponBtnGroup CSS module class
    expect(btnGroup!.className).toMatch(/weaponBtnGroup/);
  });

  it('each weapon button has weaponBtn class for full-width styling', () => {
    const weapons = [
      meleeWeapon({ name: 'Sword' }),
      meleeWeapon({ name: 'Axe' }),
      meleeWeapon({ name: 'Mace' }),
    ];
    render(<AttackFlow {...makeProps({ weapons })} />);

    const btn = screen.getByLabelText('Select Sword');
    expect(btn.className).toMatch(/weaponBtn/);
  });

  it('detects mobile viewport via innerWidth < 768', () => {
    // On mobile, after selecting weapon and advancing past step 1,
    // step 1 should be rendered as collapsible
    const weapons = [meleeWeapon({ name: 'Sword' }), meleeWeapon({ name: 'Axe' })];
    render(<AttackFlow {...makeProps({ weapons })} />);

    fireEvent.click(screen.getByLabelText('Select Sword'));
    // Step 2 should appear
    expect(screen.getByText(/Step 2/)).toBeInTheDocument();
  });
});

describe('AttackFlow — mobile collapse behavior (Requirement 8.4)', () => {
  beforeEach(() => {
    setupMobileViewport();
  });

  afterEach(() => {
    teardownMobileViewport();
    vi.restoreAllMocks();
  });

  it('renders completed steps as collapsible on mobile', () => {
    render(<AttackFlow {...makeProps()} />);

    // Select weapon to move past step 1
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));

    // On mobile, step 1 should be rendered with a collapsible header
    const collapseToggle = screen.getByRole('button', { name: /Toggle Step 1/ });
    expect(collapseToggle).toBeInTheDocument();
    expect(collapseToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses a step when its header is clicked', () => {
    render(<AttackFlow {...makeProps()} />);

    // Advance to step 2
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));

    // Find and click the collapse toggle for step 1
    const collapseToggle = screen.getByRole('button', { name: /Toggle Step 1/ });
    fireEvent.click(collapseToggle);

    // After collapse, aria-expanded should be false
    expect(collapseToggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands a collapsed step when its header is clicked again', () => {
    render(<AttackFlow {...makeProps()} />);

    // Advance to step 2
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));

    const collapseToggle = screen.getByRole('button', { name: /Toggle Step 1/ });

    // Collapse
    fireEvent.click(collapseToggle);
    expect(collapseToggle).toHaveAttribute('aria-expanded', 'false');

    // Re-expand
    fireEvent.click(collapseToggle);
    expect(collapseToggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('shows chevron indicator on collapsible step headers', () => {
    render(<AttackFlow {...makeProps()} />);

    // Advance to step 2
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));

    // The toggle should contain a chevron character
    const collapseToggle = screen.getByRole('button', { name: /Toggle Step 1/ });
    // Expanded shows ▾, collapsed shows ▸
    expect(collapseToggle.textContent).toContain('▾');

    fireEvent.click(collapseToggle);
    expect(collapseToggle.textContent).toContain('▸');
  });

  it('renders step 2 as collapsible after advancing to step 3', () => {
    mockRoll(25); // roll 25 vs target 50 → hit
    render(<AttackFlow {...makeProps()} />);

    // Advance through steps 1 → 2 → 3
    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));
    fireEvent.click(screen.getByLabelText('Roll to hit'));

    // Step 2 should now be collapsible
    const step2Toggle = screen.getByRole('button', { name: /Toggle Step 2/ });
    expect(step2Toggle).toBeInTheDocument();
    expect(step2Toggle).toHaveAttribute('aria-expanded', 'true');
  });

  it('does not render collapse headers on desktop viewport', () => {
    // Override matchMedia to report desktop viewport
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: !query.includes('max-width: 767px'),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    render(<AttackFlow {...makeProps()} />);

    fireEvent.click(screen.getByLabelText('Select Hand Weapon'));

    // On desktop, no collapsible toggle should exist for step 1
    const collapseToggle = screen.queryByRole('button', { name: /Toggle Step 1/ });
    expect(collapseToggle).not.toBeInTheDocument();
  });
});
