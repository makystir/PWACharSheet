import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation, NAV_ITEMS } from '../Navigation';
import type { PageSection } from '../Navigation';
import { CommandPaletteProvider } from '../../command-palette/CommandPaletteContext';

/**
 * Navigation label clarity tests (Task 21.2)
 * **Validates: Requirements 16.1, 16.2, 16.3**
 *
 * Req 16.1 — the section containing estate/holdings/wealth/enterprises is labelled
 *            in a way that conveys its combined scope ('Holdings & Wealth').
 * Req 16.2 — the presence of the section's sub-tabs is discoverable (sub-hint/caret).
 * Req 16.3 — the label changes do not alter the underlying routing sections
 *            (the PageSection id stays 'estate') or break existing hash routes.
 */

// --- Desktop viewport (non-mobile) so the sidebar sub-hint renders ---
function mockDesktopViewport() {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    // useMediaQuery('(max-width: 767px)') → false on desktop
    matches: query.includes('min-width: 768px'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

const renderWithProvider = (ui: React.ReactElement) =>
  render(<CommandPaletteProvider>{ui}</CommandPaletteProvider>);

function renderNavigation(overrides: Partial<Parameters<typeof Navigation>[0]> = {}) {
  const props = {
    activePage: 'character' as const,
    onPageChange: vi.fn(),
    characterName: 'Brunhilde',
    ...overrides,
  };
  const utils = renderWithProvider(<Navigation {...props} />);
  return { props, ...utils };
}

describe('Navigation label clarity (Task 21.2)', () => {
  beforeEach(() => {
    mockDesktopViewport();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // --- Req 16.1: section label conveys the combined scope ---
  describe('Req 16.1: label conveys combined scope', () => {
    it('the estate NAV_ITEMS entry is labelled "Estate"', () => {
      const estate = NAV_ITEMS.find((item) => item.id === 'estate');
      expect(estate).toBeDefined();
      expect(estate?.label).toBe('Estate');
    });

    it('renders the "Estate" label in the desktop sidebar', () => {
      renderNavigation();
      expect(screen.getByText('Estate')).toBeInTheDocument();
    });
  });

  // --- Req 16.2: sub-tab presence is discoverable ---
  describe('Req 16.2: sub-tab presence is discoverable', () => {
    it('the estate NAV_ITEMS entry carries a subTabHint describing its sub-tabs', () => {
      const estate = NAV_ITEMS.find((item) => item.id === 'estate');
      expect(estate?.subTabHint).toBe('Estate · Holdings · Treasury · Finances');
    });

    it('renders the sub-tab hint text in the desktop sidebar', () => {
      renderNavigation();
      expect(screen.getByText('Estate · Holdings · Treasury · Finances')).toBeInTheDocument();
    });
  });

  // --- Req 16.3: routing keys / hash routes unchanged ---
  describe('Req 16.3: routing keys unchanged', () => {
    it('the estate NAV_ITEMS id remains the "estate" routing key', () => {
      const estate = NAV_ITEMS.find((item) => item.id === 'estate');
      expect(estate?.id).toBe('estate');
    });

    it('clicking the estate nav item calls onPageChange with the "estate" routing key', () => {
      const { props } = renderNavigation();

      // The button carries the routing key via data-section (unchanged by relabel)
      const estateBtn = document.querySelector('[data-section="estate"]') as HTMLElement;
      expect(estateBtn).toBeTruthy();
      fireEvent.click(estateBtn);

      expect(props.onPageChange).toHaveBeenCalledWith('estate');
    });

    it('all section routing keys are unchanged', () => {
      const expectedIds: PageSection[] = [
        'character',
        'combat',
        'retinue',
        'estate',
        'endeavours',
        'advancement',
        'settings',
      ];
      expect(NAV_ITEMS.map((item) => item.id)).toEqual(expectedIds);
    });

    // money-locations-clarity Req 2.4: the estate keyboard shortcut is stable.
    it('the estate NAV_ITEMS entry keeps shortcut "4"', () => {
      const estate = NAV_ITEMS.find((item) => item.id === 'estate');
      expect(estate?.shortcut).toBe('4');
    });
  });

  // ─── money-locations-clarity Req 2.1/2.2/2.3/2.4 ───
  // The estate nav relabel ("Estate" + new sub-tab hint) must not reintroduce
  // the old "Holdings & Wealth" / "Estate · Holdings · Wealth" strings, and must
  // keep the estate routing key + shortcut stable.
  describe('money-locations-clarity estate relabel', () => {
    it('does not render the old "Holdings & Wealth" label in the sidebar', () => {
      renderNavigation();
      expect(screen.queryByText('Holdings & Wealth')).not.toBeInTheDocument();
    });

    it('does not render the old "Estate · Holdings · Wealth" sub-tab hint', () => {
      renderNavigation();
      expect(screen.queryByText('Estate · Holdings · Wealth')).not.toBeInTheDocument();
    });

    it('the estate entry keeps its id, shortcut, and shows the new label + hint together', () => {
      const estate = NAV_ITEMS.find((item) => item.id === 'estate');
      expect(estate).toMatchObject({
        id: 'estate',
        label: 'Estate',
        shortcut: '4',
        subTabHint: 'Estate · Holdings · Treasury · Finances',
      });
    });
  });
});
