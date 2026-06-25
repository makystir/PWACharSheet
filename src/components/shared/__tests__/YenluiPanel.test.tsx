import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { YenluiPanel } from '../YenluiPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character, Talent } from '../../../types/character';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

describe('YenluiPanel', () => {
  const updateCharacter = vi.fn();

  // **Validates: Requirements 2.4**
  it('renders null when useYenlui is false', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: false },
    });
    const { container } = render(
      <YenluiPanel character={char} updateCharacter={updateCharacter} />
    );
    expect(container.innerHTML).toBe('');
  });

  // **Validates: Requirements 3.2**
  it('renders null for non-Elf species even when useYenlui is true', () => {
    const char = makeCharacter({
      species: 'Human',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
    });
    const { container } = render(
      <YenluiPanel character={char} updateCharacter={updateCharacter} />
    );
    expect(container.innerHTML).toBe('');
  });

  // **Validates: Requirements 4.1**
  describe('state label display', () => {
    it('shows "Light" label when state is light', () => {
      const char = makeCharacter({
        species: 'High Elf',
        houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
        yenluiState: 'light',
      });
      const { container } = render(
        <YenluiPanel character={char} updateCharacter={updateCharacter} />
      );
      const stateLabel = container.querySelector('[class*="stateLabel"]');
      expect(stateLabel).not.toBeNull();
      expect(stateLabel!.textContent).toBe('Light');
    });

    it('shows "Balanced" label when state is balanced', () => {
      const char = makeCharacter({
        species: 'High Elf',
        houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
        yenluiState: 'balanced',
      });
      const { container } = render(
        <YenluiPanel character={char} updateCharacter={updateCharacter} />
      );
      const stateLabel = container.querySelector('[class*="stateLabel"]');
      expect(stateLabel).not.toBeNull();
      expect(stateLabel!.textContent).toBe('Balanced');
    });

    it('shows "Dark" label when state is dark', () => {
      const char = makeCharacter({
        species: 'High Elf',
        houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
        yenluiState: 'dark',
      });
      const { container } = render(
        <YenluiPanel character={char} updateCharacter={updateCharacter} />
      );
      const stateLabel = container.querySelector('[class*="stateLabel"]');
      expect(stateLabel).not.toBeNull();
      expect(stateLabel!.textContent).toBe('Dark');
    });

    it('shows "Unset" label when state is undefined', () => {
      const char = makeCharacter({
        species: 'High Elf',
        houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
        yenluiState: undefined,
      });
      const { container } = render(
        <YenluiPanel character={char} updateCharacter={updateCharacter} />
      );
      const stateLabel = container.querySelector('[class*="stateLabel"]');
      expect(stateLabel).not.toBeNull();
      expect(stateLabel!.textContent).toBe('Unset');
    });
  });

  // **Validates: Requirements 4.3**
  it('displays -30 warning indicator when state is dark', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: 'dark',
    });
    render(<YenluiPanel character={char} updateCharacter={updateCharacter} />);
    expect(screen.getByText('Sword-dancing penalty: -30')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  // **Validates: Requirements 4.5**
  it('omits description area when state is unset', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: undefined,
    });
    const { container } = render(
      <YenluiPanel character={char} updateCharacter={updateCharacter} />
    );
    // No <p> element for description should be rendered
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs.length).toBe(0);
  });

  // **Validates: Requirements 7.2**
  it('reference section defaults to collapsed', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: 'balanced',
    });
    const { container } = render(
      <YenluiPanel character={char} updateCharacter={updateCharacter} />
    );
    const detailsElements = container.querySelectorAll('details');
    expect(detailsElements.length).toBeGreaterThan(0);
    detailsElements.forEach((details) => {
      expect(details).not.toHaveAttribute('open');
    });
  });

  // **Validates: Requirements 8.1**
  it('shows talent note for "Blood of Aenarion" when present', () => {
    const talents: Talent[] = [
      { n: 'Blood of Aenarion', lvl: 1, desc: 'Aenarion bloodline' },
    ];
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: 'balanced',
      talents,
    });
    render(<YenluiPanel character={char} updateCharacter={updateCharacter} />);
    expect(
      screen.getByText('Weekly Average (+20) Cool Test required or Yenlui shifts to Dark.')
    ).toBeInTheDocument();
  });

  // **Validates: Requirements 8.4**
  it('"Sanctuary of the Mind" below level 3 shows no talent note', () => {
    const talents: Talent[] = [
      { n: 'Sanctuary of the Mind', lvl: 2, desc: 'Mental sanctuary' },
    ];
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: 'balanced',
      talents,
    });
    render(<YenluiPanel character={char} updateCharacter={updateCharacter} />);
    expect(screen.queryByText(/Negates the -30/)).not.toBeInTheDocument();
    // Talent notes section should not render at all since no qualifying talents
    expect(screen.queryByText('Talent Interactions')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 5.6**
  it('all state buttons have accessible labels', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: 'balanced',
    });
    render(<YenluiPanel character={char} updateCharacter={updateCharacter} />);
    expect(screen.getByLabelText('Set Yenlui state to Unset')).toBeInTheDocument();
    expect(screen.getByLabelText('Set Yenlui state to Light')).toBeInTheDocument();
    expect(screen.getByLabelText('Set Yenlui state to Balanced')).toBeInTheDocument();
    expect(screen.getByLabelText('Set Yenlui state to Dark')).toBeInTheDocument();
  });

  // **Validates: Requirements 9.5**
  it('state toggle buttons exist as interactive elements (touch targets)', () => {
    const char = makeCharacter({
      species: 'High Elf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
      yenluiState: 'balanced',
    });
    render(<YenluiPanel character={char} updateCharacter={updateCharacter} />);
    const buttons = [
      screen.getByLabelText('Set Yenlui state to Unset'),
      screen.getByLabelText('Set Yenlui state to Light'),
      screen.getByLabelText('Set Yenlui state to Balanced'),
      screen.getByLabelText('Set Yenlui state to Dark'),
    ];
    buttons.forEach((btn) => {
      expect(btn.tagName).toBe('BUTTON');
      expect(btn).toHaveAttribute('type', 'button');
      expect(btn).toHaveAttribute('aria-label');
      expect(btn).toHaveAttribute('aria-pressed');
    });
  });
});
