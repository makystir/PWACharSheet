import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '../layout/Navigation';
import type { CharacterSummary } from '../../types/character';

function makeSummary(overrides: Partial<CharacterSummary> & { id: string; name: string }): CharacterSummary {
  return {
    species: 'Human',
    career: 'Soldier',
    careerLevel: 'Silver 1',
    lastModified: Date.now(),
    ...overrides,
  };
}

const charA = makeSummary({ id: 'a', name: 'Brunhilde' });
const charB = makeSummary({ id: 'b', name: 'Gottfried' });
const charC = makeSummary({ id: 'c', name: 'Elara' });

/** Helper: open the character switcher dropdown */
function openSwitcher() {
  fireEvent.click(screen.getByTitle('Switch character'));
}

describe('Navigation delete confirmation', () => {
  // **Validates: Requirements 1.1**
  it('shows delete button for all characters when multiple characters exist', () => {
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB, charC]}
        activeId="a"
        onDeleteCharacter={vi.fn()}
      />,
    );
    openSwitcher();

    // All three characters should have a Delete button, including the active one
    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons).toHaveLength(3);
  });

  // **Validates: Requirements 1.1**
  it('shows delete button for the active character', () => {
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB]}
        activeId="a"
        onDeleteCharacter={vi.fn()}
      />,
    );
    openSwitcher();

    // Both characters should have a Delete button, including the active one
    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons).toHaveLength(2);
  });

  // **Validates: Requirements 1.1, 1.2**
  it('shows delete button when only one character exists', () => {
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA]}
        activeId="a"
        onDeleteCharacter={vi.fn()}
      />,
    );
    openSwitcher();

    const deleteButtons = screen.getAllByTitle('Delete');
    expect(deleteButtons).toHaveLength(1);
  });

  // **Validates: Requirements 2.1**
  it('clicking delete button opens ConfirmDialog with the character name in the message', () => {
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB]}
        activeId="a"
        onDeleteCharacter={vi.fn()}
      />,
    );
    openSwitcher();

    // Click the delete button for charA (the active character, listed first)
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[1]); // charB's delete button

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Delete "Gottfried"? This cannot be undone.');
  });

  // **Validates: Requirements 2.1**
  it('clicking delete on the active character opens ConfirmDialog with the active character name', () => {
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB]}
        activeId="a"
        onDeleteCharacter={vi.fn()}
      />,
    );
    openSwitcher();

    // Click the delete button for charA (the active character)
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Delete "Brunhilde"? This cannot be undone.');
  });

  // **Validates: Requirements 2.2**
  it('confirming deletion calls onDeleteCharacter with the correct character ID', () => {
    const onDelete = vi.fn();
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB]}
        activeId="a"
        onDeleteCharacter={onDelete}
      />,
    );
    openSwitcher();

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[1]); // charB's delete button
    // Confirm the deletion
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('b');
    expect(onDelete).toHaveBeenCalledTimes(1);
    // Dialog should be dismissed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 2.2**
  it('confirming deletion of the active character calls onDeleteCharacter with the active character ID', () => {
    const onDelete = vi.fn();
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB]}
        activeId="a"
        onDeleteCharacter={onDelete}
      />,
    );
    openSwitcher();

    // Click the delete button for charA (the active character)
    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);
    // Confirm the deletion
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith('a');
    expect(onDelete).toHaveBeenCalledTimes(1);
    // Dialog should be dismissed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 2.3**
  it('cancelling deletion closes the dialog without calling onDeleteCharacter', () => {
    const onDelete = vi.fn();
    render(
      <Navigation
        activePage="character"
        onPageChange={vi.fn()}
        characterName="Brunhilde"
        characters={[charA, charB]}
        activeId="a"
        onDeleteCharacter={onDelete}
      />,
    );
    openSwitcher();

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Cancel the deletion
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
