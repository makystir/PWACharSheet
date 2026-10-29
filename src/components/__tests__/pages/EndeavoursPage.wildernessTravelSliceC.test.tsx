import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EndeavoursPage } from '../../pages/EndeavoursPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

/**
 * Slice C component tests: the four-table event reference view and the optional
 * per-Stage "Roll event for this Stage" helper, plus the toggle-OFF
 * zero-footprint guarantee for the new event UI.
 */

function renderEndeavours(charOverrides: Partial<Character> = {}) {
  let char = structuredClone({ ...BLANK_CHARACTER, ...charOverrides });
  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    char = mutator(char);
    rerender(
      <EndeavoursPage
        character={char}
        update={vi.fn()}
        updateCharacter={updateCharacter}
        subTab="travel"
        onSubTabChange={vi.fn()}
      />,
    );
  });
  const { rerender } = render(
    <EndeavoursPage
      character={char}
      update={vi.fn()}
      updateCharacter={updateCharacter}
      subTab={charOverrides.houseRules?.useWildernessTravel ? 'travel' : null}
      onSubTabChange={vi.fn()}
    />,
  );
  return { get char() { return char; } };
}

function withTravelOn(): Partial<Character> {
  const hr = structuredClone(BLANK_CHARACTER.houseRules);
  hr.useWildernessTravel = true;
  return { houseRules: hr };
}

function startJourneyWithStage() {
  fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));
  fireEvent.click(screen.getByRole('button', { name: /Add Stage/ }));
}

beforeEach(() => {
  localStorage.clear();
});

describe('EndeavoursPage Slice C — zero footprint when the toggle is off', () => {
  it('renders no event-reference heading and no roll-event button', () => {
    renderEndeavours();
    expect(
      screen.queryByText(/Wilderness Travel Events \(Reference\)/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Roll event for this Stage/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Wilderness Travel Events Table 1/),
    ).not.toBeInTheDocument();
  });
});

describe('JourneyTrackerPanel Slice C — event reference view', () => {
  it('shows all four event tables with their terrain applicability and the trigger rule', () => {
    renderEndeavours(withTravelOn());
    fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));

    expect(screen.getByText(/Wilderness Travel Events \(Reference\)/)).toBeInTheDocument();
    expect(
      screen.getByText(/Wilderness Travel Events Table 1 — Light Woodland, Hills, and Temperate Plains/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Wilderness Travel Events Table 2 — Mountains/)).toBeInTheDocument();
    expect(screen.getByText(/Wilderness Travel Events Table 3 — Deep Forest/)).toBeInTheDocument();
    expect(screen.getByText(/Wilderness Travel Events Table 4 — Wetlands/)).toBeInTheDocument();
    // Verbatim trigger rule surfaced.
    expect(screen.getByText(/8 or more something unexpected has occured/)).toBeInTheDocument();
  });
});

describe('JourneyTrackerPanel Slice C — per-Stage event-roll helper', () => {
  it('prompts to pick terrain before rolling when the Stage has none', () => {
    renderEndeavours(withTravelOn());
    startJourneyWithStage();
    expect(screen.getByText(/Select a terrain for this Stage above to roll an event/)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Roll event for this Stage/ }),
    ).not.toBeInTheDocument();
  });

  it('shows a roll button once a terrain is selected, and rolls a reference result', () => {
    renderEndeavours(withTravelOn());
    startJourneyWithStage();

    fireEvent.change(screen.getByLabelText('Terrain'), { target: { value: 'Mountains' } });

    const rollBtn = screen.getByRole('button', { name: /Roll event for this Stage/ });
    expect(rollBtn).toBeInTheDocument();
    fireEvent.click(rollBtn);

    // The transient result region renders with the GM-adjudication caption.
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/Trigger 1d10:/);
    expect(status).toHaveTextContent(/the GM adjudicates whether and how this event occurs/);
  });
});
