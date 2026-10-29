import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EndeavoursPage } from '../../pages/EndeavoursPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

function renderEndeavours(charOverrides: Partial<Character> = {}, subTab: string | null = null) {
  const char = structuredClone({ ...BLANK_CHARACTER, ...charOverrides });
  const updateCharacter = vi.fn();
  render(
    <EndeavoursPage
      character={char}
      update={vi.fn()}
      updateCharacter={updateCharacter}
      subTab={subTab}
      onSubTabChange={vi.fn()}
    />,
  );
  return { char, updateCharacter };
}

function withCrimeOn(extra: Partial<Character> = {}): Partial<Character> {
  const hr = structuredClone(BLANK_CHARACTER.houseRules);
  hr.useOrganisedCrime = true;
  return { houseRules: hr, ...extra };
}

beforeEach(() => {
  localStorage.clear();
});

describe('EndeavoursPage — Organised Crime gating (zero footprint when off)', () => {
  it('renders NO Crime tab and no Organised Crime DOM when the toggle is off', () => {
    const { char } = renderEndeavours();
    expect(screen.queryByRole('tab', { name: 'Crime' })).not.toBeInTheDocument();
    expect(screen.queryByText('Gang Memberships')).not.toBeInTheDocument();
    expect(screen.queryByText('Criminal Organisation (Reference)')).not.toBeInTheDocument();
    // The existing downtime tracker still renders exactly as before.
    expect(screen.getByText('Endeavours Tracker')).toBeInTheDocument();

    // No new persisted field beyond houseRules.useOrganisedCrime === false.
    expect(char.houseRules.useOrganisedCrime).toBe(false);
    expect(Object.keys(char)).not.toContain('organisedCrime');
  });

  it('renders a Crime tab and the tracker + reference when the toggle is on', () => {
    renderEndeavours(withCrimeOn(), 'crime');
    expect(screen.getByRole('tab', { name: 'Endeavours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Crime' })).toBeInTheDocument();

    expect(screen.getByText('Gang Memberships')).toBeInTheDocument();
    expect(screen.getByText('Criminal Organisation (Reference)')).toBeInTheDocument();
    expect(screen.getByText('Perks by Organisation Level (Reference)')).toBeInTheDocument();
    expect(screen.getByText('Criminal Events (Reference)')).toBeInTheDocument();
  });

  it('shows the computed dues with a breakdown tooltip for a tracked gang', () => {
    const char: Partial<Character> = withCrimeOn({
      status: 'Brass 3',
      organisedCrime: {
        memberships: [{ id: 'g1', name: 'Essen Black Rose Lodge', organisationLevel: 3 }],
      },
    });
    renderEndeavours(char, 'crime');

    // Dues cell shows 3d (Brass 3 / Level 3 = 3 pennies).
    const duesCell = screen.getByRole('button', { name: /Monthly dues: 3d/ });
    expect(duesCell).toBeInTheDocument();

    // Opening the tooltip reveals the labelled breakdown.
    fireEvent.click(duesCell);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toBeInTheDocument();
    expect(within(tooltip).getByText('Status tier')).toBeInTheDocument();
    expect(within(tooltip).getByText('Brass (pennies)')).toBeInTheDocument();
    expect(within(tooltip).getByText('Organisation Level')).toBeInTheDocument();
    expect(within(tooltip).getByText('3d per month')).toBeInTheDocument();
  });

  it('shows unknown-tier guidance (no dues number) when status cannot be parsed', () => {
    const char: Partial<Character> = withCrimeOn({
      status: 'Vagabond',
      organisedCrime: {
        memberships: [{ id: 'g1', name: 'The Hooks', organisationLevel: 2 }],
      },
    });
    renderEndeavours(char, 'crime');
    expect(
      screen.getByText('status tier unknown — set a Brass/Silver/Gold status'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Monthly dues:/ })).not.toBeInTheDocument();
  });

  it('shows all four tabs when every optional Endeavours mechanic is on', () => {
    const hr = structuredClone(BLANK_CHARACTER.houseRules);
    hr.useWildernessTravel = true;
    hr.useHunting = true;
    hr.useOrganisedCrime = true;
    renderEndeavours({ houseRules: hr }, 'crime');
    expect(screen.getByRole('tab', { name: 'Endeavours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Travel' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hunting' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Crime' })).toBeInTheDocument();
  });

  it('adds a gang membership through updateCharacter when "Add Gang" is clicked', () => {
    const { updateCharacter } = renderEndeavours(withCrimeOn(), 'crime');
    fireEvent.click(screen.getAllByRole('button', { name: /Add Gang/ })[0]);
    expect(updateCharacter).toHaveBeenCalled();
    // The mutator produces an organisedCrime object with one membership.
    const mutator = updateCharacter.mock.calls[0][0] as (c: Character) => Character;
    const next = mutator(structuredClone(BLANK_CHARACTER));
    expect(next.organisedCrime?.memberships).toHaveLength(1);
  });
});
