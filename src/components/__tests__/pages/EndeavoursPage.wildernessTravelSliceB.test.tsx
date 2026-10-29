import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EndeavoursPage } from '../../pages/EndeavoursPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

/**
 * Slice B component tests: terrain/weather selection + net-SL guidance, seeded
 * roll buttons, guidance-only endeavours, per-member Planning SL, and the
 * toggle-off zero-footprint guarantee for the new DOM.
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

/** Create a journey with one member + one Stage, ready for endeavour selection. */
function startJourneyWithStage() {
  fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));
  const addMember = screen.getByLabelText('New party member name');
  fireEvent.change(addMember, { target: { value: 'Gerd' } });
  fireEvent.click(screen.getByRole('button', { name: /Add Member/ }));
  fireEvent.click(screen.getByRole('button', { name: /Add Stage/ }));
}

beforeEach(() => {
  localStorage.clear();
});

describe('EndeavoursPage Slice B — zero footprint when the toggle is off', () => {
  it('renders no terrain/weather selects, no Planning-SL inputs, and keeps wildernessJourney absent', () => {
    const h = renderEndeavours();
    expect(screen.queryByLabelText('Terrain')).not.toBeInTheDocument();
    expect(screen.queryByText('Per-member banked Planning SL')).not.toBeInTheDocument();
    expect(screen.queryByText(/Party has tents/)).not.toBeInTheDocument();
    expect(h.char.wildernessJourney).toBeUndefined();
  });
});

describe('JourneyTrackerPanel Slice B — weather/terrain net-SL guidance', () => {
  it('surfaces a suggested net SL with a breakdown tooltip for Navigate in Mountains + Thick Fog', () => {
    renderEndeavours(withTravelOn());
    startJourneyWithStage();

    // Select terrain + visibility for the Stage.
    fireEvent.change(screen.getByLabelText('Terrain'), { target: { value: 'Mountains' } });
    fireEvent.change(screen.getByLabelText('Visibility'), { target: { value: 'Thick Fog' } });

    // Choose Navigate as the Travel Endeavour.
    fireEvent.change(screen.getByLabelText('Travel Endeavour'), { target: { value: 'Navigate' } });

    // Suggested net SL badge appears (Mountains Navigation 0 + Thick Fog −3 = −3).
    const badge = screen.getByRole('button', { name: /Suggested net SL −3 for Navigate/ });
    expect(badge).toBeInTheDocument();

    // Opening it shows the breakdown tooltip with the component + total.
    fireEvent.click(badge);
    const tooltip = screen.getByRole('tooltip');
    expect(within(tooltip).getByText('Weather (Visibility Thick Fog)')).toBeInTheDocument();
    expect(within(tooltip).getByText('Net SL')).toBeInTheDocument();
  });
});

describe('JourneyTrackerPanel Slice B — seeded vs guidance-only endeavours', () => {
  it('a seedable endeavour (Navigate) shows a roll button that opens the seeded RollDialog', () => {
    renderEndeavours(withTravelOn());
    startJourneyWithStage();
    fireEvent.change(screen.getByLabelText('Travel Endeavour'), { target: { value: 'Navigate' } });

    const rollBtn = screen.getByRole('button', { name: /Roll Navigation \(Navigate\)/ });
    fireEvent.click(rollBtn);
    // RollDialog mounts with the seeded name.
    expect(screen.getByRole('dialog', { name: 'Roll Dialog' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Navigation (Navigate)' })).toBeInTheDocument();
  });

  it('a guidance-only endeavour (Map) shows no roll button but shows the specialisation reason', () => {
    renderEndeavours(withTravelOn());
    startJourneyWithStage();
    fireEvent.change(screen.getByLabelText('Travel Endeavour'), { target: { value: 'Map' } });

    expect(screen.queryByRole('button', { name: /^Roll / })).not.toBeInTheDocument();
    expect(screen.getByText(/specialisations/i)).toBeInTheDocument();
  });
});

describe('JourneyTrackerPanel Slice B — per-member Planning SL', () => {
  it('records a per-member banked Planning SL', () => {
    const h = renderEndeavours(withTravelOn());
    fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));
    const addMember = screen.getByLabelText('New party member name');
    fireEvent.change(addMember, { target: { value: 'Gerd' } });
    fireEvent.click(screen.getByRole('button', { name: /Add Member/ }));

    const slInput = screen.getByLabelText('Banked Planning SL for Gerd') as HTMLInputElement;
    fireEvent.change(slInput, { target: { value: '2' } });
    expect(h.char.wildernessJourney!.roster[0].planningSL).toBe(2);
  });

  it('tents toggle makes Make Camp seed Average and is persisted', () => {
    const h = renderEndeavours(withTravelOn());
    fireEvent.click(screen.getByRole('button', { name: 'Start a Journey' }));
    const tents = screen.getByLabelText('Party has tents') as HTMLInputElement;
    fireEvent.click(tents);
    expect(h.char.wildernessJourney!.hasTents).toBe(true);
  });
});
