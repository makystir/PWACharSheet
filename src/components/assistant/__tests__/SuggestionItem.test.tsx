import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Suggestion } from '../../../logic/assistant/types';
import { SuggestionItem } from '../SuggestionItem';

function renderItem(suggestion: Suggestion) {
  return render(
    <ul>
      <SuggestionItem suggestion={suggestion} onAction={vi.fn()} onDismiss={vi.fn()} onSnooze={vi.fn()} />
    </ul>,
  );
}

describe('SuggestionItem actionLabel disambiguation', () => {
  it('labels a health character/notes navigate "View Diseases" (primary, non-roll disease)', () => {
    const nonRollDisease: Suggestion = {
      id: 'health:disease:the-yellow-skull',
      title: 'The Yellow Skull: review disease progress',
      rationale: '',
      category: 'health',
      urgency: 'info',
      action: { kind: 'navigate', page: 'character', subTab: 'notes' },
    };
    renderItem(nonRollDisease);
    expect(screen.getByRole('button', { name: 'View Diseases' })).toBeInTheDocument();
  });

  it('labels a health character/notes navigate "View Diseases" (secondary, roll-backed disease)', () => {
    const rollDisease: Suggestion = {
      id: 'health:disease:blood-rot',
      title: 'Blood Rot: Endurance Test (Daily (or die))',
      rationale: '',
      category: 'health',
      urgency: 'critical',
      action: {
        kind: 'roll',
        test: {
          def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
          difficulty: 'Very Easy',
          rollName: 'Endurance (Blood Rot)',
        },
      },
      secondaryAction: { kind: 'navigate', page: 'character', subTab: 'notes' },
    };
    renderItem(rollDisease);
    // Primary reads the roll name, secondary reads "View Diseases".
    expect(screen.getByRole('button', { name: 'Endurance (Blood Rot)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Diseases' })).toBeInTheDocument();
  });

  it('still labels a corruption character/notes navigate "View Corruption"', () => {
    const corruption: Suggestion = {
      id: 'corruption:test-due',
      title: 'Corruption Test due',
      rationale: '',
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
    };
    renderItem(corruption);
    expect(screen.getByRole('button', { name: 'View Corruption' })).toBeInTheDocument();
  });
});
