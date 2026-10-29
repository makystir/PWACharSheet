import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EndeavoursPage } from '../../pages/EndeavoursPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

/**
 * Harness: a stateful updateCharacter so the journey tracker's dispatches
 * persist and re-render, mirroring production (App wires a real mutator).
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

beforeEach(() => {
  // Tab order / last-sub-tab persistence must not leak between tests.
  localStorage.clear();
});

describe('EndeavoursPage — Wilderness Travel gating (FR-1 zero footprint)', () => {
  it('renders NO sub-tab bar, no Travel tab, and no journey DOM when the toggle is off', () => {
    renderEndeavours();
    expect(screen.queryByRole('tab', { name: 'Travel' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Endeavours' })).not.toBeInTheDocument();
    expect(screen.queryByText('Wilderness Travel')).not.toBeInTheDocument();
    // The existing downtime tracker still renders exactly as before.
    expect(screen.getByText('Endeavours Tracker')).toBeInTheDocument();
  });

  it('renders both sub-tabs and the Journey Tracker when the toggle is on', () => {
    renderEndeavours(withTravelOn());
    expect(screen.getByRole('tab', { name: 'Endeavours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Travel' })).toBeInTheDocument();
    // Empty-state surface is shown until a journey is started.
    expect(screen.getByText('No active journey')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start a Journey' })).toBeInTheDocument();
  });
});

describe('JourneyTrackerPanel — Slice A basics (on Endeavours page)', () => {
  it('creates a journey, records endeavours, and derives the Stage-count total with a breakdown tooltip', () => {
    renderEndeavours(withTravelOn());

    // Create a journey.
    fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));

    // Name the journey.
    fireEvent.change(screen.getByLabelText('Journey Name'), { target: { value: 'Drakwald Crossing' } });
    expect((screen.getByLabelText('Journey Name') as HTMLInputElement).value).toBe('Drakwald Crossing');

    // Planned stages → total reflects it.
    fireEvent.change(screen.getByLabelText('Planned Stages'), { target: { value: '4' } });
    const total = screen.getByLabelText(/Total journey stages: 4/);
    expect(total).toBeInTheDocument();

    // Add a party member.
    const addMemberInput = screen.getByLabelText('New party member name');
    fireEvent.change(addMemberInput, { target: { value: 'Gerd' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Member/ }));

    // Add a Stage, then record Travel + Camp endeavours for Gerd.
    fireEvent.click(screen.getByRole('button', { name: /Add Stage/ }));
    expect(screen.getByText('Stage 1')).toBeInTheDocument();

    const travelSelect = screen.getByLabelText('Travel Endeavour') as HTMLSelectElement;
    fireEvent.change(travelSelect, { target: { value: 'Forage' } });
    expect(travelSelect.value).toBe('Forage');

    const campSelect = screen.getByLabelText('Camp Endeavour') as HTMLSelectElement;
    fireEvent.change(campSelect, { target: { value: 'Cook' } });
    expect(campSelect.value).toBe('Cook');

    // Both chosen → the cited Fatigue reminder appears (advisory only).
    expect(screen.getByText(/Hard \(−20\) Endurance Test or gain Fatigued/)).toBeInTheDocument();

    // Record the Planning Endeavour.
    fireEvent.change(screen.getByLabelText('Planning notes'), { target: { value: 'Bought maps in Altdorf' } });
    expect((screen.getByLabelText('Planning notes') as HTMLTextAreaElement).value).toBe('Bought maps in Altdorf');

    // Navigate outcome: reduce the total by one (shortcut).
    fireEvent.click(screen.getByRole('button', { name: /Reduce Total/ }));
    expect(screen.getByLabelText(/Total journey stages: 3/)).toBeInTheDocument();

    // The total is a calculated total with a breakdown tooltip.
    const totalCell = screen.getByLabelText(/Total journey stages: 3/);
    fireEvent.click(totalCell);
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('Planned')).toBeInTheDocument();
    expect(within(tooltip).getByText('Total')).toBeInTheDocument();
  });

  it('advances and removes Stages, keeping Recorded Stages independent of the Total', () => {
    renderEndeavours(withTravelOn());
    fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));
    fireEvent.change(screen.getByLabelText('Planned Stages'), { target: { value: '2' } });

    fireEvent.click(screen.getByRole('button', { name: /Add Stage/ }));
    fireEvent.click(screen.getByRole('button', { name: /Add Stage/ }));
    expect(screen.getByLabelText(/Recorded stages: 2/)).toBeInTheDocument();
    // Total is still the planned 2 — independent of recorded stage cards.
    expect(screen.getByLabelText(/Total journey stages: 2/)).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /Remove Stage/ })[0]);
    expect(screen.getByLabelText(/Recorded stages: 1/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Total journey stages: 2/)).toBeInTheDocument();
  });
});
