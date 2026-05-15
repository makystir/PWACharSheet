import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SwordDancingPanel } from '../shared/SwordDancingPanel';
import { BLANK_CHARACTER, type Character } from '../../types/character';
import { SWORD_DANCING_TECHNIQUES } from '../../data/swordDancingTechniques';

/** Helper: create a character with the Sword-dancing talent and configurable XP */
function makeCharacter(overrides: Partial<Character> = {}): Character {
  return {
    ...BLANK_CHARACTER,
    talents: [{ n: 'Sword-dancing', lvl: 1, desc: '' }],
    xpCur: 500,
    ...overrides,
  };
}

describe('SwordDancingPanel', () => {
  let confirmSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  afterEach(() => {
    confirmSpy.mockRestore();
  });

  it('does not render when character lacks Sword-dancing talent', () => {
    const char = { ...BLANK_CHARACTER, talents: [] };
    const { container } = render(
      <SwordDancingPanel character={char} updateCharacter={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders all 10 techniques when character has the talent', () => {
    const char = makeCharacter();
    render(<SwordDancingPanel character={char} updateCharacter={vi.fn()} />);

    for (const technique of SWORD_DANCING_TECHNIQUES) {
      expect(screen.getByText(technique.name)).toBeInTheDocument();
    }
  });

  it('shows "Learned" badge for learned techniques, not "Learn" button', () => {
    const char = makeCharacter({
      learnedTechniques: ['ritual-of-cleansing'],
    });
    render(<SwordDancingPanel character={char} updateCharacter={vi.fn()} />);

    // Should show the learned badge
    expect(screen.getByText('✓ Learned')).toBeInTheDocument();

    // The learned technique should NOT have a Learn button
    const learnButtons = screen.getAllByRole('button');
    const ritualLearnBtn = learnButtons.find(
      (btn) => btn.textContent?.includes('Ritual of Cleansing')
    );
    expect(ritualLearnBtn).toBeUndefined();
  });

  it('shows "Learn" button with correct XP cost for unlearned techniques', () => {
    // Character with 0 learned techniques → next cost = 0 * 100 = 0 XP
    // Wait, that's the first technique which is free (cost = 0).
    // With 0 known, cost = 0. With 1 known, cost = 100. etc.
    const char = makeCharacter({ learnedTechniques: [], xpCur: 500 });
    render(<SwordDancingPanel character={char} updateCharacter={vi.fn()} />);

    // With 0 known techniques, cost = 0 XP
    expect(screen.getAllByText('Learn (0 XP)').length).toBeGreaterThan(0);
  });

  it('shows "Learn" button with escalating XP cost based on known count', () => {
    // Character with 2 learned techniques → next cost = 2 * 100 = 200 XP
    const char = makeCharacter({
      learnedTechniques: ['ritual-of-cleansing', 'flight-of-the-phoenix'],
      xpCur: 500,
    });
    render(<SwordDancingPanel character={char} updateCharacter={vi.fn()} />);

    expect(screen.getAllByText('Learn (200 XP)').length).toBeGreaterThan(0);
  });

  it('"Learn" button is disabled (not shown) when character has insufficient XP', () => {
    // Character with 3 learned techniques → next cost = 300 XP, but only has 50 XP
    const char = makeCharacter({
      learnedTechniques: ['ritual-of-cleansing', 'flight-of-the-phoenix', 'path-of-the-sun'],
      xpCur: 50,
    });
    render(<SwordDancingPanel character={char} updateCharacter={vi.fn()} />);

    // With insufficient XP, the component shows error text instead of Learn buttons
    const errorMessages = screen.getAllByText('Insufficient XP. Need 300, have 50.');
    expect(errorMessages.length).toBe(7); // 10 techniques - 3 learned = 7 unavailable

    // No Learn buttons should be present (all unlearned are unavailable)
    const learnButtons = screen.queryAllByRole('button', { name: /Learn/ });
    expect(learnButtons).toHaveLength(0);
  });

  it('clicking "Learn" triggers confirmation and calls updateCharacter on confirm', () => {
    const updateCharacter = vi.fn();
    const char = makeCharacter({ learnedTechniques: [], xpCur: 500 });
    render(<SwordDancingPanel character={char} updateCharacter={updateCharacter} />);

    // Click the first Learn button (Ritual of Cleansing)
    const learnButtons = screen.getAllByRole('button', { name: /Learn/ });
    fireEvent.click(learnButtons[0]);

    // Confirm dialog should have been called
    expect(confirmSpy).toHaveBeenCalledWith(
      'Learn "Ritual of Cleansing" for 0 XP?'
    );

    // updateCharacter should have been called with a mutator function
    expect(updateCharacter).toHaveBeenCalledTimes(1);
    expect(typeof updateCharacter.mock.calls[0][0]).toBe('function');
  });

  it('"Ritual of Cleansing" shows as learned when learnedTechniques includes it', () => {
    const char = makeCharacter({
      learnedTechniques: ['ritual-of-cleansing'],
    });
    render(<SwordDancingPanel character={char} updateCharacter={vi.fn()} />);

    // Ritual of Cleansing should be displayed
    expect(screen.getByText('Ritual of Cleansing')).toBeInTheDocument();
    // And it should show the learned badge
    expect(screen.getByText('✓ Learned')).toBeInTheDocument();
  });
});
