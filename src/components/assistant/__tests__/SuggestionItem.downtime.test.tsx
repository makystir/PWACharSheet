import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { Suggestion, SuggestionAction } from '../../../logic/assistant/types';
import { SuggestionItem } from '../SuggestionItem';
import { downtimeRecommendationSuggestions } from '../../../logic/assistant/rules/downtime-recommendations';
import { resolveReminderBaseTarget } from '../../../logic/reminders-target';

function renderItem(suggestion: Suggestion, onAction = vi.fn()) {
  render(
    <ul>
      <SuggestionItem suggestion={suggestion} onAction={onAction} onDismiss={vi.fn()} onSnooze={vi.fn()} />
    </ul>,
  );
  return onAction;
}

function makeCharacter(overrides: Partial<Character> = {}): Character {
  const chars = structuredClone(BLANK_CHARACTER.chars);
  for (const k of Object.keys(chars) as (keyof Character['chars'])[]) {
    chars[k] = { i: 30, a: 0, b: 0 };
  }
  return { ...structuredClone(BLANK_CHARACTER), chars, ...overrides };
}

const CTX_PEACE = { inCombat: false };

/** The seeded Study a Mark recommendation (Rogues) produced by the real engine. */
function seededStudyAMark(character: Character): Suggestion {
  const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
  const s = out.find(x => x.id === 'endeavour:rec:class:study-a-mark');
  if (!s) throw new Error('expected Study a Mark recommendation');
  return s;
}

describe('SuggestionItem — downtime seeded-total tooltip (AC-10)', () => {
  it('renders the Base Target breakdown tooltip from engine-provided lines, not recomputed', () => {
    const character = makeCharacter({ class: 'Rogues', wCur: 999, wGC: 5, wSS: 5 });
    const suggestion = seededStudyAMark(character);
    const engineLines = suggestion.totals![0].lines;

    renderItem(suggestion);

    // The Base Target is rendered as a tooltip trigger cell.
    const cell = screen.getByRole('button', { name: 'Base Target breakdown' });
    expect(cell).toHaveTextContent(suggestion.totals![0].display);

    // Open the tooltip; its list items equal the engine's lines verbatim.
    fireEvent.click(cell);
    for (const line of engineLines) {
      expect(screen.getByText(line)).toBeInTheDocument();
    }
  });
});

describe('SuggestionItem — downtime seeded roll does not mutate (AC-6)', () => {
  it('clicking the roll button only invokes onAction with the roll descriptor; no character mutation', () => {
    const character = makeCharacter({ class: 'Rogues', wCur: 999, wGC: 5, wSS: 5 });
    const snapshot = structuredClone(character);
    const suggestion = seededStudyAMark(character);

    const onAction = renderItem(suggestion);
    const rollButton = screen.getByRole('button', { name: 'Study a Mark (Perception)' });
    fireEvent.click(rollButton);

    // Exactly the roll descriptor is dispatched; nothing mutates the character.
    const expectedTarget = resolveReminderBaseTarget(character, (suggestion.action as Extract<SuggestionAction, { kind: 'roll' }>).test.def);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith(suggestion.action);
    expect(character).toEqual(snapshot);
    // Sanity: the seeded target is a real resolved number.
    expect(Number.isFinite(expectedTarget)).toBe(true);
  });
});

describe('SuggestionItem — guidance-only recommendation shows no roll button (AC-7)', () => {
  it('a Healing recommendation renders only the navigate button, no roll button and no totals', () => {
    const character = makeCharacter({ wCur: 0, wGC: 0, wSS: 0 });
    const out = downtimeRecommendationSuggestions(character, CTX_PEACE);
    const healing = out.find(x => x.id === 'endeavour:rec:healing');
    if (!healing) throw new Error('expected Healing recommendation');

    renderItem(healing);
    // Navigate label for the endeavours page is the default "Go".
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument();
    // No seeded roll button (those are named after test.rollName).
    expect(screen.queryByRole('button', { name: /Test|Perception|Gossip/ })).not.toBeInTheDocument();
    // No calculated total is shown.
    expect(screen.queryByRole('button', { name: /breakdown/ })).not.toBeInTheDocument();
  });
});
