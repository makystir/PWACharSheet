import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EndeavoursPage } from '../../pages/EndeavoursPage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

function renderEndeavours(charOverrides: Partial<Character> = {}, subTab: string | null = null) {
  const char = structuredClone({ ...BLANK_CHARACTER, ...charOverrides });
  render(
    <EndeavoursPage
      character={char}
      update={vi.fn()}
      updateCharacter={vi.fn()}
      subTab={subTab}
      onSubTabChange={vi.fn()}
    />,
  );
  return char;
}

function withHuntingOn(): Partial<Character> {
  const hr = structuredClone(BLANK_CHARACTER.houseRules);
  hr.useHunting = true;
  return { houseRules: hr };
}

function withTravelOn(): Partial<Character> {
  const hr = structuredClone(BLANK_CHARACTER.houseRules);
  hr.useWildernessTravel = true;
  return { houseRules: hr };
}

beforeEach(() => {
  localStorage.clear();
});

describe('EndeavoursPage — Hunting gating (zero footprint when off)', () => {
  it('renders NO Hunting tab and no Hunting reference DOM when the toggle is off', () => {
    const char = renderEndeavours();
    expect(screen.queryByRole('tab', { name: 'Hunting' })).not.toBeInTheDocument();
    expect(screen.queryByText('Hunting Considerations')).not.toBeInTheDocument();
    expect(screen.queryByText('A Fast Buck — The Value Of')).not.toBeInTheDocument();
    // The existing downtime tracker still renders exactly as before.
    expect(screen.getByText('Endeavours Tracker')).toBeInTheDocument();

    // No new persisted field beyond houseRules.useHunting === false.
    expect(char.houseRules.useHunting).toBe(false);
    // The blank character carries no top-level hunting field.
    expect(Object.keys(char)).not.toContain('hunting');
  });

  it('keeps the Travel tab and adds no Hunting DOM when Wilderness Travel is ON but Hunting is OFF (regression)', () => {
    renderEndeavours(withTravelOn(), 'travel');
    expect(screen.getByRole('tab', { name: 'Travel' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Hunting' })).not.toBeInTheDocument();
    expect(screen.queryByText('Hunting Considerations')).not.toBeInTheDocument();
  });

  it('renders a Hunting tab and the reference surfaces when the toggle is on', () => {
    renderEndeavours(withHuntingOn(), 'hunting');
    expect(screen.getByRole('tab', { name: 'Endeavours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hunting' })).toBeInTheDocument();

    // Reference surfaces appear.
    expect(screen.getByText('Hunting Considerations')).toBeInTheDocument();
    expect(screen.getByText('A Fast Buck — The Value Of')).toBeInTheDocument();
    expect(screen.getByText('Animals and Equipment')).toBeInTheDocument();
    expect(screen.getByText('Hunting Hounds — Traits & Training')).toBeInTheDocument();
    expect(screen.getByText('Hunting Hawks — Traits & Training')).toBeInTheDocument();
    expect(screen.getByText('Hunting as Endeavour (Reference)')).toBeInTheDocument();
    expect(screen.getByText('A Typical Hunting Lodge')).toBeInTheDocument();
    // The flagged "GAME Oil" artifact note is surfaced.
    expect(screen.getByText(/GAME Oil/)).toBeInTheDocument();
  });

  it('shows all three tabs when both optional mechanics are on', () => {
    const hr = structuredClone(BLANK_CHARACTER.houseRules);
    hr.useWildernessTravel = true;
    hr.useHunting = true;
    renderEndeavours({ houseRules: hr }, 'hunting');
    expect(screen.getByRole('tab', { name: 'Endeavours' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Travel' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Hunting' })).toBeInTheDocument();
  });

  it('surfaces the Hunting tab even when a stale persisted tab order lacks it', () => {
    // Seed an endeavours tab order saved before the Hunting feature existed.
    localStorage.setItem('tabOrder:endeavours', JSON.stringify(['endeavours', 'travel']));
    const hr = structuredClone(BLANK_CHARACTER.houseRules);
    hr.useWildernessTravel = true;
    hr.useHunting = true;
    renderEndeavours({ houseRules: hr }, 'hunting');
    expect(screen.getByRole('tab', { name: 'Hunting' })).toBeInTheDocument();
  });
});
