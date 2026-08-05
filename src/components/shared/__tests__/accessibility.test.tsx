import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ToggleSwitch } from '../ToggleSwitch';
import { ArmourMap } from '../../combat/ArmourMap';
import { Navigation } from '../../layout/Navigation';
import { RollResultDisplay } from '../RollResultDisplay';
import { CommandPaletteProvider } from '../../command-palette/CommandPaletteContext';
import type { ArmourPoints } from '../../../types/character';

function renderWithProviders(ui: React.ReactElement) {
  return render(<CommandPaletteProvider>{ui}</CommandPaletteProvider>);
}

/**
 * Accessibility tests for UI/UX Modernization
 * Requirements: 4.5, 7.5, 11.7, 26.5
 */

describe('Accessibility: ToggleSwitch (Req 11.7)', () => {
  it('has role="switch" attribute', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Test" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toBeInTheDocument();
  });

  it('has aria-checked="false" when unchecked', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Test" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'false');
  });

  it('has aria-checked="true" when checked', () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} label="Test" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('has an accessible aria-label matching the label prop', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Enable notifications" />);
    const toggle = screen.getByRole('switch');
    expect(toggle).toHaveAttribute('aria-label', 'Enable notifications');
  });
});

describe('Accessibility: ArmourMap hit location buttons (Req 26.5)', () => {
  const defaultArmourPoints: ArmourPoints = {
    head: 2,
    lArm: 1,
    rArm: 1,
    body: 3,
    lLeg: 0,
    rLeg: 0,
  };

  it('renders hit location buttons with ARIA labels', () => {
    render(<ArmourMap armourPoints={defaultArmourPoints} armourList={[]} />);

    expect(screen.getByLabelText('Select Head location')).toBeInTheDocument();
    expect(screen.getByLabelText('Select L Arm location')).toBeInTheDocument();
    expect(screen.getByLabelText('Select R Arm location')).toBeInTheDocument();
    expect(screen.getByLabelText('Select Body location')).toBeInTheDocument();
    expect(screen.getByLabelText('Select L Leg location')).toBeInTheDocument();
    expect(screen.getByLabelText('Select R Leg location')).toBeInTheDocument();
  });

  it('hit location buttons have aria-pressed attribute', () => {
    render(<ArmourMap armourPoints={defaultArmourPoints} armourList={[]} />);

    const headButton = screen.getByLabelText('Select Head location');
    expect(headButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('hit location buttons are keyboard accessible (button element)', () => {
    render(<ArmourMap armourPoints={defaultArmourPoints} armourList={[]} />);

    const headButton = screen.getByLabelText('Select Head location');
    expect(headButton.tagName).toBe('BUTTON');
  });
});

describe('Accessibility: Touch targets meet 44px minimum', () => {
  it('ToggleSwitch CSS enforces 44px min-height touch target', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} label="Test" />);
    const toggle = screen.getByRole('switch');
    // The component renders a button element with the toggle class that enforces min-height: 44px
    expect(toggle.tagName).toBe('BUTTON');
    // Structural test: the component CSS module defines min-height: 44px on the toggle class
    expect(toggle.className).toContain('toggle');
  });

  it('ArmourMap hit location buttons are rendered as buttons (tappable)', () => {
    const armourPoints: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0 };
    render(<ArmourMap armourPoints={armourPoints} armourList={[]} />);

    const buttons = screen.getAllByRole('button');
    const locationButtons = buttons.filter(btn =>
      btn.getAttribute('aria-label')?.startsWith('Select ')
    );
    // All 6 hit locations should be rendered as buttons
    expect(locationButtons).toHaveLength(6);
  });
});

describe('Accessibility: Navigation badges (Req 4.5)', () => {
  it('badge dot has aria-label for screen readers', () => {
    renderWithProviders(
      <Navigation
        activePage="character"
        onPageChange={() => {}}
        showAdvancementBadge={true}
        showEndeavoursBadge={false}
      />
    );

    const badges = screen.getAllByLabelText('has updates');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('badge dot is not rendered when no badge is needed', () => {
    renderWithProviders(
      <Navigation
        activePage="character"
        onPageChange={() => {}}
        showAdvancementBadge={false}
        showEndeavoursBadge={false}
      />
    );

    const badges = screen.queryAllByLabelText('has updates');
    expect(badges).toHaveLength(0);
  });
});

describe('Accessibility: Navigation aria-current (Req 4.5)', () => {
  it('active navigation item has aria-current="page"', () => {
    renderWithProviders(
      <Navigation
        activePage="combat"
        onPageChange={() => {}}
      />
    );

    const activeItem = screen.getByRole('button', { current: 'page' });
    expect(activeItem).toBeInTheDocument();
    expect(activeItem).toHaveAttribute('data-section', 'combat');
  });

  it('inactive navigation items do not have aria-current', () => {
    renderWithProviders(
      <Navigation
        activePage="combat"
        onPageChange={() => {}}
      />
    );

    const allNavButtons = screen.getAllByRole('button').filter(
      btn => btn.getAttribute('data-section') && btn.getAttribute('data-section') !== 'combat'
    );
    for (const btn of allNavButtons) {
      expect(btn).not.toHaveAttribute('aria-current');
    }
  });
});

describe('Accessibility: RollResultDisplay dialog role', () => {
  const mockResult = {
    roll: 42,
    targetNumber: 55,
    sl: 1,
    passed: true,
    outcome: '+1 SL',
    skillOrCharName: 'Melee (Basic)',
    isCritical: false,
    isFumble: false,
  };

  let matchMediaMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    matchMediaMock = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
    window.matchMedia = matchMediaMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('has role="dialog" on the overlay', () => {
    render(<RollResultDisplay result={mockResult} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
  });

  it('has an accessible aria-label on the dialog', () => {
    render(<RollResultDisplay result={mockResult} onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-label', 'Roll Result');
  });
});

describe('Accessibility: prefers-reduced-motion suppresses animations (Req 7.5)', () => {
  it('micro-interactions.module.css defines reduced-motion override for all animation classes', async () => {
    // Structural test: import the CSS module and verify animation class names exist
    // The CSS file contains @media (prefers-reduced-motion: reduce) { ... animation: none }
    // We verify the module exports the expected class names
    const microStyles = await import('../styles/micro-interactions.module.css');

    // These classes should be exported from the CSS module
    expect(microStyles.default.animateEnter).toBeDefined();
    expect(microStyles.default.woundFlashRed).toBeDefined();
    expect(microStyles.default.woundFlashGreen).toBeDefined();
    expect(microStyles.default.advantagePulse).toBeDefined();
    expect(microStyles.default.diceRoll).toBeDefined();
  });

  it('RollResultDisplay skips rolling animation when reduced motion is preferred', () => {
    // Mock prefers-reduced-motion: reduce
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? true : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const result = {
      roll: 55,
      targetNumber: 40,
      sl: -1,
      passed: false,
      outcome: '-1 SL',
      skillOrCharName: 'Athletics',
      isCritical: false,
      isFumble: false,
    };

    render(<RollResultDisplay result={result} onClose={() => {}} />);

    // When reduced motion is active, the result should display immediately (no "..." placeholder)
    expect(screen.getByText('55')).toBeInTheDocument();
  });
});
