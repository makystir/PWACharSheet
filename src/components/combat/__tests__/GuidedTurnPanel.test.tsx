import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GuidedTurnPanel } from '../GuidedTurnPanel';
import { initialTurnState } from '../../../logic/combat-turn/reducer';
import type { TurnState } from '../../../logic/combat-turn/types';

function renderPanel(turn: TurnState = initialTurnState, overrides: Partial<Parameters<typeof GuidedTurnPanel>[0]> = {}) {
  const dispatchTurn = vi.fn();
  const props = {
    turn,
    dispatchTurn,
    reminders: [],
    onGuideRollReminder: vi.fn(),
    onGuideChooseAttack: vi.fn(),
    onGuideChooseCast: vi.fn(),
    onGuideChooseDefend: vi.fn(),
    onGuideChooseSkill: vi.fn(),
    hasSpellcasting: false,
    onGuideRevealEndTurn: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<GuidedTurnPanel {...props} />);
  return { ...props, dispatchTurn };
}

describe('GuidedTurnPanel', () => {
  it('renders a modal dialog with the step heading marked aria-current (AC-17)', () => {
    renderPanel();
    const dialog = screen.getByRole('dialog', { name: 'Guide my turn' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const heading = within(dialog).getByRole('heading', { level: 2 });
    expect(heading).toHaveAttribute('aria-current', 'step');
    expect(heading).toHaveTextContent(/Step 1 of 4/);
  });

  it('Next / Back dispatch explicit player events (no auto-advance, AC-12)', () => {
    const { dispatchTurn } = renderPanel();
    // Back is disabled on the first step; Next is enabled.
    expect(screen.getByTestId('guide-back')).toBeDisabled();
    fireEvent.click(screen.getByTestId('guide-next'));
    expect(dispatchTurn).toHaveBeenCalledWith({ kind: 'next' });
  });

  it('uses a synchronous advisor and performs no network fetch (AC-18)', () => {
    const fetchSpy = vi.fn();
    const original = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    try {
      renderPanel();
      // Step copy is present synchronously on first render (no async resolution).
      expect(screen.getByText(/Core p\.157/)).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = original;
    }
  });

  it('close button invokes onClose (AC-1 dismissible)', () => {
    const { onClose } = renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Close guide' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('renders the End step "Go to End Turn" control with NO guide-owned End Turn button (AC-10)', () => {
    renderPanel({ ...initialTurnState, step: 'end' });
    expect(screen.getByTestId('guide-goto-end-turn')).toBeInTheDocument();
    // There is no guide-owned "End Turn" button — only the hand-off control.
    expect(screen.queryByRole('button', { name: /^End Turn$/ })).not.toBeInTheDocument();
  });
});
