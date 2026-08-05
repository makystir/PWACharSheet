import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '../Navigation';
import { CommandPaletteProvider } from '../../command-palette/CommandPaletteContext';

/**
 * Navigation Enhancements Tests
 * **Validates: Requirements 3.1, 4.1, 5.1**
 *
 * Tests cover:
 * - Mobile scrollable bar rendering and auto-scroll behavior (Req 3.1)
 * - Badge dot conditional rendering (Req 4.1)
 * - Collapse toggle with localStorage persistence and tooltip display (Req 5.1)
 */

// --- Viewport mocking helpers ---

function mockMobileViewport() {
  Object.defineProperty(window, 'innerWidth', { value: 375, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 667, writable: true });

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

function mockDesktopViewport() {
  Object.defineProperty(window, 'innerWidth', { value: 1024, writable: true });
  Object.defineProperty(window, 'innerHeight', { value: 768, writable: true });

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
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

// --- Mobile scrollable bar tests (Requirement 3.1) ---

describe('Navigation mobile scrollable bar', () => {
  beforeEach(() => {
    mockMobileViewport();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders all 7 nav items in the mobile scroll row', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const navButtons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('data-section') !== null
    );
    // 7 nav items + 1 Search = 8 buttons with data-section
    expect(navButtons).toHaveLength(8);
  });

  it('renders nav items inside a scrollable container with mobileScrollRow class', () => {
    const { container } = renderWithProvider(
      <Navigation activePage="character" onPageChange={vi.fn()} />
    );

    const scrollRow = container.querySelector('[class*="mobileScrollRow"]');
    expect(scrollRow).toBeInTheDocument();
  });

  it('calls scrollIntoView on the active nav item on mount', () => {
    const scrollIntoViewMock = vi.fn();
    // Mock scrollIntoView on HTMLElement prototype before render
    HTMLElement.prototype.scrollIntoView = scrollIntoViewMock;

    renderWithProvider(<Navigation activePage="advancement" onPageChange={vi.fn()} />);

    expect(scrollIntoViewMock).toHaveBeenCalledWith(
      expect.objectContaining({ inline: 'center', block: 'nearest', behavior: 'instant' })
    );
  });

  it('marks the active item with aria-current="page"', () => {
    renderWithProvider(<Navigation activePage="combat" onPageChange={vi.fn()} />);

    const activeBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'combat'
    );
    expect(activeBtn).toHaveAttribute('aria-current', 'page');
  });

  it('each nav item has a minimum 44px height via navItem/navItemActive class', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const navButtons = screen.getAllByRole('button').filter(
      (btn) => btn.getAttribute('data-section') !== null
    );

    navButtons.forEach((btn) => {
      expect(
        btn.className.includes('navItem') || btn.className.includes('navItemActive')
      ).toBe(true);
    });
  });
});

// --- Badge dot conditional rendering tests (Requirement 4.1) ---

describe('Navigation badge indicators', () => {
  beforeEach(() => {
    mockMobileViewport();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders badge dot on Advancement item when showAdvancementBadge is true', () => {
    const { container } = renderWithProvider(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        showAdvancementBadge={true}
      />
    );

    const advancementBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'advancement'
    );
    expect(advancementBtn).toBeDefined();

    const badgeDot = advancementBtn!.querySelector('[class*="badgeDot"]');
    expect(badgeDot).toBeInTheDocument();
  });

  it('does not render badge dot on Advancement item when showAdvancementBadge is false', () => {
    renderWithProvider(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        showAdvancementBadge={false}
      />
    );

    const advancementBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'advancement'
    );
    const badgeDot = advancementBtn!.querySelector('[class*="badgeDot"]');
    expect(badgeDot).not.toBeInTheDocument();
  });

  it('renders badge dot on Endeavours item when showEndeavoursBadge is true', () => {
    renderWithProvider(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        showEndeavoursBadge={true}
      />
    );

    const endeavoursBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'endeavours'
    );
    const badgeDot = endeavoursBtn!.querySelector('[class*="badgeDot"]');
    expect(badgeDot).toBeInTheDocument();
  });

  it('does not render badge dot on Endeavours item when showEndeavoursBadge is false', () => {
    renderWithProvider(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        showEndeavoursBadge={false}
      />
    );

    const endeavoursBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'endeavours'
    );
    const badgeDot = endeavoursBtn!.querySelector('[class*="badgeDot"]');
    expect(badgeDot).not.toBeInTheDocument();
  });

  it('does not render badge dot when props are not provided (undefined)', () => {
    renderWithProvider(
      <Navigation activePage="character" onPageChange={vi.fn()} />
    );

    const advancementBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'advancement'
    );
    const endeavoursBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'endeavours'
    );

    expect(advancementBtn!.querySelector('[class*="badgeDot"]')).not.toBeInTheDocument();
    expect(endeavoursBtn!.querySelector('[class*="badgeDot"]')).not.toBeInTheDocument();
  });

  it('badge dot has aria-label "has updates" for accessibility', () => {
    renderWithProvider(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        showAdvancementBadge={true}
      />
    );

    const advancementBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'advancement'
    );
    const badgeDot = advancementBtn!.querySelector('[class*="badgeDot"]');
    expect(badgeDot).toHaveAttribute('aria-label', 'has updates');
  });
});

// --- Desktop collapse toggle and localStorage persistence tests (Requirement 5.1) ---

describe('Navigation desktop collapse toggle', () => {
  beforeEach(() => {
    mockDesktopViewport();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders collapse toggle button on desktop', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(collapseBtn).toBeInTheDocument();
  });

  it('defaults to expanded state when localStorage has no value', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    // Expanded state: nav should NOT have sidebarCollapsed class
    expect(nav.className).not.toContain('sidebarCollapsed');
  });

  it('toggles to collapsed state when collapse button is clicked', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseBtn);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav.className).toContain('sidebarCollapsed');
  });

  it('persists collapsed state to localStorage', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseBtn);

    expect(localStorage.getItem('nav-collapsed')).toBe('true');
  });

  it('persists expanded state to localStorage when toggled back', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    fireEvent.click(collapseBtn); // collapse
    fireEvent.click(screen.getByRole('button', { name: /expand sidebar/i })); // expand

    expect(localStorage.getItem('nav-collapsed')).toBe('false');
  });

  it('reads initial collapsed state from localStorage', () => {
    localStorage.setItem('nav-collapsed', 'true');

    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const nav = screen.getByRole('navigation', { name: /main navigation/i });
    expect(nav.className).toContain('sidebarCollapsed');
  });

  it('shows title attribute (tooltip) on nav items when collapsed', () => {
    localStorage.setItem('nav-collapsed', 'true');

    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const characterBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'character'
    );
    expect(characterBtn).toHaveAttribute('title', 'Character');
  });

  it('does not show title attribute on nav items when expanded', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const combatBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'combat'
    );
    expect(combatBtn).not.toHaveAttribute('title');
  });

  it('collapse toggle has 44px minimum touch target via CSS class', () => {
    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const collapseBtn = screen.getByRole('button', { name: /collapse sidebar/i });
    expect(collapseBtn.className).toContain('collapseToggle');
  });

  it('sets aria-label on nav items to page name when collapsed', () => {
    localStorage.setItem('nav-collapsed', 'true');

    renderWithProvider(<Navigation activePage="character" onPageChange={vi.fn()} />);

    const combatBtn = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('data-section') === 'combat'
    );
    expect(combatBtn).toHaveAttribute('aria-label', 'Combat');
  });
});
