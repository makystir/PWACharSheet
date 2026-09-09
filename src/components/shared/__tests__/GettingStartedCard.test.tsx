import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GettingStartedCard, isBrandNewCharacter } from '../GettingStartedCard';

// Feature: ux-audit-improvements, Req 5 — new-character onboarding card.

const STORAGE_PREFIX = 'wfrp-getting-started-dismissed-';

function renderCard(overrides: Partial<Parameters<typeof GettingStartedCard>[0]> = {}) {
  const props = {
    characterId: 'char-1',
    xpSpent: 0,
    career: '',
    onSetup: vi.fn(),
    onRollTest: vi.fn(),
    onOpenCombat: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<GettingStartedCard {...props} />) };
}

describe('isBrandNewCharacter', () => {
  it('is true only when no XP is spent and no career is chosen', () => {
    expect(isBrandNewCharacter(0, '')).toBe(true);
  });

  it('is false once XP has been spent (advanced character)', () => {
    expect(isBrandNewCharacter(100, '')).toBe(false);
  });

  it('is false once a career is chosen (imported/set-up character)', () => {
    expect(isBrandNewCharacter(0, 'Soldier')).toBe(false);
  });
});

describe('GettingStartedCard', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Req 5.1 — shown for a brand-new character.
  it('renders for a brand-new character (xpSpent === 0 && career === "")', () => {
    renderCard();
    expect(screen.getByRole('note', { name: 'Getting started' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Getting started' })).toBeInTheDocument();
  });

  // Req 5.5 — hidden for advanced characters (XP spent).
  it('does not render for an advanced character (xpSpent > 0)', () => {
    renderCard({ xpSpent: 250 });
    expect(screen.queryByRole('note', { name: 'Getting started' })).not.toBeInTheDocument();
  });

  // Req 5.5 — hidden for imported/set-up characters (career chosen).
  it('does not render for an imported/set-up character (career !== "")', () => {
    renderCard({ career: 'Wizard' });
    expect(screen.queryByRole('note', { name: 'Getting started' })).not.toBeInTheDocument();
  });

  // Req 5.3 — dismissal persists per character.
  it('unmounts on dismiss and persists the dismissal in localStorage', () => {
    renderCard({ characterId: 'char-42' });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss getting started' }));

    expect(screen.queryByRole('note', { name: 'Getting started' })).not.toBeInTheDocument();
    expect(localStorage.getItem(`${STORAGE_PREFIX}char-42`)).toBe('true');
  });

  it('stays hidden on a fresh render with the same characterId after dismissal', () => {
    // First instance dismissed.
    const first = renderCard({ characterId: 'char-42' });
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss getting started' }));
    first.unmount();

    // A brand-new re-render for the same character honours the persisted flag.
    renderCard({ characterId: 'char-42' });
    expect(screen.queryByRole('note', { name: 'Getting started' })).not.toBeInTheDocument();
  });

  it('scopes dismissal per character (a different id still shows the card)', () => {
    localStorage.setItem(`${STORAGE_PREFIX}char-42`, 'true');

    renderCard({ characterId: 'char-99' });
    expect(screen.getByRole('note', { name: 'Getting started' })).toBeInTheDocument();
  });

  // Req 5.4 — does not modally block the page (non-modal).
  it('is non-modal: exposes role="note" and renders no dialog/modal overlay', () => {
    renderCard();

    expect(screen.getByRole('note', { name: 'Getting started' })).toBeInTheDocument();
    // No modal semantics: no dialog role and nothing marked aria-modal.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(document.querySelector('[aria-modal="true"]')).toBeNull();
  });

  it('does not trap focus (focus is free to leave the card)', () => {
    renderCard();
    const card = screen.getByRole('note', { name: 'Getting started' });

    // A control outside the card can receive focus — a focus trap would prevent this.
    const outside = document.createElement('button');
    outside.textContent = 'outside';
    document.body.appendChild(outside);
    outside.focus();

    expect(document.activeElement).toBe(outside);
    expect(card.contains(document.activeElement)).toBe(false);

    outside.remove();
  });

  // Req 5.2 — quick-action links invoke their callbacks (guards the card stays useful).
  it('invokes the action callbacks for the quick links', () => {
    const { props } = renderCard();

    fireEvent.click(screen.getByRole('button', { name: /Set characteristics & career/i }));
    fireEvent.click(screen.getByRole('button', { name: /Roll a test/i }));
    fireEvent.click(screen.getByRole('button', { name: /Open Combat/i }));

    expect(props.onSetup).toHaveBeenCalledTimes(1);
    expect(props.onRollTest).toHaveBeenCalledTimes(1);
    expect(props.onOpenCombat).toHaveBeenCalledTimes(1);
  });
});
