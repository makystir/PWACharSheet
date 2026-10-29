import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RetinuePage } from '../../pages/RetinuePage';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

/**
 * The Wilderness Travel "Travel" sub-tab lives on the Endeavours page, not the
 * Retinue page. These tests lock in that the Retinue page never surfaces a
 * Travel tab or the Journey Tracker, regardless of the house-rule toggle.
 */
function renderRetinue(charOverrides: Partial<Character> = {}) {
  const char = structuredClone({ ...BLANK_CHARACTER, ...charOverrides });
  render(
    <RetinuePage
      character={char}
      update={vi.fn()}
      updateCharacter={vi.fn()}
      subTab={null}
      onSubTabChange={vi.fn()}
    />,
  );
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

describe('RetinuePage — no Wilderness Travel tab (relocated to Endeavours)', () => {
  it('shows only Hirelings and Animal Companions tabs when the toggle is off', () => {
    renderRetinue();
    expect(screen.getByRole('tab', { name: 'Hirelings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Animal Companions' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Travel' })).not.toBeInTheDocument();
  });

  it('still shows NO Travel tab or Journey Tracker even when the toggle is on', () => {
    renderRetinue(withTravelOn());
    expect(screen.getByRole('tab', { name: 'Hirelings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Animal Companions' })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Travel' })).not.toBeInTheDocument();
    expect(screen.queryByText('Wilderness Travel')).not.toBeInTheDocument();
    expect(screen.queryByText('No active journey')).not.toBeInTheDocument();
  });
});
