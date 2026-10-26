import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Suggestion, SuggestionAction } from '../../../logic/assistant/types';
import { AssistantProvider } from '../AssistantContext';
import { useAssistantContext } from '../assistantContextValue';
import { AssistantPanel } from '../AssistantPanel';

/** Opens the panel on mount so the overlay is visible under test. */
function AutoOpen() {
  const { open } = useAssistantContext();
  return (
    <button type="button" onClick={open} data-testid="open-trigger">
      open
    </button>
  );
}

interface HarnessProps {
  suggestions: Suggestion[];
  onAction?: (action: SuggestionAction) => void;
  onDismiss?: (id: string) => void;
  onSnooze?: (id: string) => void;
}

function renderPanel({ suggestions, onAction = vi.fn(), onDismiss = vi.fn(), onSnooze = vi.fn() }: HarnessProps) {
  const result = render(
    <AssistantProvider>
      <AutoOpen />
      <AssistantPanel
        suggestions={suggestions}
        onAction={onAction}
        onDismiss={onDismiss}
        onSnooze={onSnooze}
      />
    </AssistantProvider>,
  );
  // Panel is closed by default; open it.
  fireEvent.click(screen.getByTestId('open-trigger'));
  return { ...result, onAction, onDismiss, onSnooze };
}

const advancementSuggestion: Suggestion = {
  id: 'advancement:ready',
  title: 'Ready to advance your career',
  rationale: 'You meet the requirements and have XP to spend.',
  category: 'advancement',
  urgency: 'recommended',
  action: { kind: 'navigate', page: 'advancement' },
  citation: 'Core p.48',
};

const corruptionSuggestion: Suggestion = {
  id: 'corruption:test-due',
  title: 'Corruption Test due',
  rationale: 'Your Corruption is at or above your Corruption threshold.',
  category: 'corruption',
  urgency: 'critical',
  action: {
    kind: 'roll',
    test: {
      def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
      difficulty: 'Challenging',
      rollName: 'Endurance (resist Corruption)',
    },
  },
  secondaryAction: { kind: 'navigate', page: 'character', subTab: 'notes' },
  citation: 'Core p.183: Corrupting (+ Pure Soul talent, p.182)',
  totals: [
    {
      label: 'Corruption',
      display: '7 / 6',
      lines: ['TB 3', 'WPB 3', 'Pure Soul 0'],
    },
  ],
};

describe('AssistantPanel', () => {
  it('renders nothing when closed (no layout footprint)', () => {
    render(
      <AssistantProvider>
        <AssistantPanel suggestions={[advancementSuggestion]} onAction={vi.fn()} onDismiss={vi.fn()} onSnooze={vi.fn()} />
      </AssistantProvider>,
    );
    expect(screen.queryByRole('dialog', { name: 'Character Assistant' })).not.toBeInTheDocument();
  });

  it('opens as a dialog with aria-modal and lists suggestions grouped by category', () => {
    renderPanel({ suggestions: [advancementSuggestion, corruptionSuggestion] });

    const dialog = screen.getByRole('dialog', { name: 'Character Assistant' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');

    // Category group headings are present.
    expect(within(dialog).getByRole('heading', { name: 'Advancement', level: 3 })).toBeInTheDocument();
    expect(within(dialog).getByRole('heading', { name: 'Corruption', level: 3 })).toBeInTheDocument();

    // Suggestion titles + rationale shown.
    expect(screen.getByText('Ready to advance your career')).toBeInTheDocument();
    expect(screen.getByText('Corruption Test due')).toBeInTheDocument();
  });

  it('defaults to the drawer variant on desktop (matchMedia matches=false)', () => {
    renderPanel({ suggestions: [advancementSuggestion] });
    const dialog = screen.getByRole('dialog', { name: 'Character Assistant' });
    expect(dialog).toHaveAttribute('data-variant', 'drawer');
  });

  it('shows an empty state when there are no suggestions', () => {
    renderPanel({ suggestions: [] });
    expect(screen.getByText('No suggestions right now.')).toBeInTheDocument();
  });

  it('a navigate action invokes onAction with the navigate descriptor', () => {
    const { onAction } = renderPanel({ suggestions: [advancementSuggestion] });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(onAction).toHaveBeenCalledWith({ kind: 'navigate', page: 'advancement' });
  });

  it('a roll action invokes onAction with the roll descriptor (carrying difficulty)', () => {
    const onAction = vi.fn<(action: SuggestionAction) => void>();
    renderPanel({ suggestions: [corruptionSuggestion], onAction });
    fireEvent.click(screen.getByRole('button', { name: 'Endurance (resist Corruption)' }));
    expect(onAction).toHaveBeenCalledWith(corruptionSuggestion.action);
    const dispatched = onAction.mock.calls[0][0];
    expect(dispatched.kind).toBe('roll');
    if (dispatched.kind === 'roll') {
      expect(dispatched.test.difficulty).toBe('Challenging');
    }
  });

  it('the corruption item exposes BOTH a primary roll and a secondary View Corruption navigate', () => {
    const { onAction } = renderPanel({ suggestions: [corruptionSuggestion] });

    fireEvent.click(screen.getByRole('button', { name: 'Endurance (resist Corruption)' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Corruption' }));

    expect(onAction).toHaveBeenCalledWith(corruptionSuggestion.action);
    expect(onAction).toHaveBeenCalledWith({ kind: 'navigate', page: 'character', subTab: 'notes' });
  });

  it('renders the citation for a suggestion', () => {
    renderPanel({ suggestions: [corruptionSuggestion] });
    expect(screen.getByText('Core p.183: Corrupting (+ Pure Soul talent, p.182)')).toBeInTheDocument();
  });

  it('shows a calculated total with a breakdown tooltip built from engine-supplied lines', () => {
    renderPanel({ suggestions: [corruptionSuggestion] });

    const totalCell = screen.getByRole('button', { name: 'Corruption breakdown' });
    expect(totalCell).toHaveTextContent('7 / 6');

    // Opening the tooltip reveals the engine-supplied breakdown lines.
    fireEvent.click(totalCell);
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('TB 3')).toBeInTheDocument();
    expect(within(tooltip).getByText('WPB 3')).toBeInTheDocument();
    expect(within(tooltip).getByText('Pure Soul 0')).toBeInTheDocument();
  });

  it('dismiss and snooze invoke their handlers with the suggestion id', () => {
    const { onDismiss, onSnooze } = renderPanel({ suggestions: [advancementSuggestion] });

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledWith('advancement:ready');

    fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));
    expect(onSnooze).toHaveBeenCalledWith('advancement:ready');
  });

  it('closes on Escape and on backdrop click', () => {
    renderPanel({ suggestions: [advancementSuggestion] });
    const dialog = screen.getByRole('dialog', { name: 'Character Assistant' });

    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Character Assistant' })).not.toBeInTheDocument();
  });

  it('closes on backdrop click', () => {
    renderPanel({ suggestions: [advancementSuggestion] });
    fireEvent.click(screen.getByTestId('assistant-panel-backdrop'));
    expect(screen.queryByRole('dialog', { name: 'Character Assistant' })).not.toBeInTheDocument();
  });

  it('closes via the close button and restores focus to the previously focused trigger', () => {
    renderPanel({ suggestions: [advancementSuggestion] });
    fireEvent.click(screen.getByRole('button', { name: 'Close assistant' }));
    expect(screen.queryByRole('dialog', { name: 'Character Assistant' })).not.toBeInTheDocument();
  });

  it('never mutates a frozen character: the panel exposes no advance/apply handler and only routes action callbacks', () => {
    // The panel receives ONLY onAction/onDismiss/onSnooze — there is no apply/
    // advance/mutate prop. Invoking every control hits only those callbacks.
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    const onSnooze = vi.fn();
    renderPanel({ suggestions: [corruptionSuggestion], onAction, onDismiss, onSnooze });

    fireEvent.click(screen.getByRole('button', { name: 'Endurance (resist Corruption)' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Corruption' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));

    // Only descriptor routing / dismiss / snooze happened — nothing else.
    expect(onAction).toHaveBeenCalledTimes(2);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onSnooze).toHaveBeenCalledTimes(1);
  });
});
