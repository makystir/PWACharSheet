import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { YenluiPanel } from '../YenluiPanel';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...BLANK_CHARACTER, ...overrides };
}

describe('YenluiPanel integration', () => {
  /**
   * **Validates: Requirements 1.3, 1.4**
   * Full save/load cycle preserves yenluiState.
   */
  it('serialization round-trip preserves yenluiState', () => {
    const character = makeCharacter({
      species: 'High Elf',
      yenluiState: 'dark',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
    });

    const serialized = JSON.stringify(character);
    const deserialized = JSON.parse(serialized) as Character;

    expect(deserialized.yenluiState).toBe('dark');
  });

  /**
   * **Validates: Requirements 2.6, 3.3**
   * Toggling useYenlui off hides the panel without clearing yenluiState.
   */
  it('toggling useYenlui off hides panel without clearing yenluiState', () => {
    const char = makeCharacter({
      species: 'High Elf',
      yenluiState: 'dark',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
    });
    const updateFn = vi.fn();

    const { rerender, container } = render(
      <YenluiPanel character={char} updateCharacter={updateFn} />
    );

    // Panel should be visible — the Yenlui Balance heading is rendered
    expect(screen.getByText('Yenlui Balance')).toBeInTheDocument();
    // Dark toggle button should be pressed
    expect(screen.getByRole('button', { name: 'Set Yenlui state to Dark', pressed: true })).toBeInTheDocument();

    // Toggle useYenlui off
    const charHidden = {
      ...char,
      houseRules: { ...char.houseRules, useYenlui: false },
    };
    rerender(<YenluiPanel character={charHidden} updateCharacter={updateFn} />);

    // Panel should not render
    expect(container.firstChild).toBeNull();

    // The character's yenluiState is still 'dark' — state was not cleared
    expect(charHidden.yenluiState).toBe('dark');
  });

  /**
   * **Validates: Requirements 3.3, 3.4**
   * Switching species from Elf to non-Elf hides panel without clearing yenluiState.
   */
  it('switching species hides/shows panel without clearing yenluiState', () => {
    const char = makeCharacter({
      species: 'High Elf',
      yenluiState: 'balanced',
      houseRules: { ...BLANK_CHARACTER.houseRules, useYenlui: true },
    });
    const updateFn = vi.fn();

    const { rerender, container } = render(
      <YenluiPanel character={char} updateCharacter={updateFn} />
    );

    // Panel should be visible with Balanced state active
    expect(screen.getByText('Yenlui Balance')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Set Yenlui state to Balanced', pressed: true })).toBeInTheDocument();

    // Switch to Human (non-Elf species)
    const charHuman = { ...char, species: 'Human' };
    rerender(<YenluiPanel character={charHuman} updateCharacter={updateFn} />);

    // Panel should not render
    expect(container.firstChild).toBeNull();

    // The character's yenluiState is preserved
    expect(charHuman.yenluiState).toBe('balanced');

    // Switch back to Wood Elf — panel should reappear with stored state
    const charWoodElf = { ...char, species: 'Wood Elf' };
    rerender(<YenluiPanel character={charWoodElf} updateCharacter={updateFn} />);

    expect(screen.getByRole('button', { name: 'Set Yenlui state to Balanced', pressed: true })).toBeInTheDocument();
  });
});
