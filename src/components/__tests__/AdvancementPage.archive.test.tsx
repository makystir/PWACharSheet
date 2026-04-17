import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AdvancementPage } from '../pages/AdvancementPage';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, ArmourPoints, AdvancementEntry } from '../../types/character';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function makeEntry(overrides: Partial<AdvancementEntry> & { timestamp: number; name: string }): AdvancementEntry {
  return {
    type: 'skill',
    from: 0,
    to: 1,
    xpCost: 10,
    careerLevel: 'Recruit',
    inCareer: true,
    ...overrides,
  };
}

const defaultAP: ArmourPoints = { head: 0, lArm: 0, rArm: 0, body: 0, lLeg: 0, rLeg: 0, shield: 0 };

function makeTestCharacter(overrides: Partial<Character> = {}): Character {
  return structuredClone({
    ...BLANK_CHARACTER,
    name: 'Test Soldier',
    species: 'Human',
    class: 'Warriors',
    career: 'Soldier',
    careerLevel: 'Recruit',
    status: 'Silver 1',
    xpCur: 500,
    xpTotal: 500,
    chars: {
      ...BLANK_CHARACTER.chars,
      WS: { i: 35, a: 0, b: 0 },
      BS: { i: 30, a: 0, b: 0 },
      S: { i: 30, a: 0, b: 0 },
      T: { i: 30, a: 0, b: 0 },
      I: { i: 30, a: 0, b: 0 },
      Ag: { i: 30, a: 0, b: 0 },
      Dex: { i: 25, a: 0, b: 0 },
      Int: { i: 25, a: 0, b: 0 },
      WP: { i: 30, a: 0, b: 0 },
      Fel: { i: 25, a: 0, b: 0 },
    },
    ...overrides,
  });
}

/**
 * Render AdvancementPage with a stateful wrapper so that updateCharacter
 * actually updates the rendered component (re-renders with new character).
 */
function renderAdvancementPage(overrides: Partial<Character> = {}) {
  let currentChar = makeTestCharacter(overrides);
  const updateSpy = vi.fn();

  const updateCharacter = vi.fn((mutator: (c: Character) => Character) => {
    currentChar = mutator(currentChar);
  });

  const { rerender } = render(
    <AdvancementPage
      character={currentChar}
      update={updateSpy}
      updateCharacter={updateCharacter}
      totalWounds={12}
      armourPoints={defaultAP}
      maxEncumbrance={10}
      coinWeight={0}
    />,
  );

  /** Re-render with the latest character state (after updateCharacter calls). */
  function rerenderWithLatest() {
    rerender(
      <AdvancementPage
        character={currentChar}
        update={updateSpy}
        updateCharacter={updateCharacter}
        totalWounds={12}
        armourPoints={defaultAP}
        maxEncumbrance={10}
        coinWeight={0}
      />,
    );
  }

  return { updateCharacter, updateSpy, rerenderWithLatest, getCurrentChar: () => currentChar };
}

/* ------------------------------------------------------------------ */
/*  Archive entries used across tests                                 */
/* ------------------------------------------------------------------ */

const archiveEntries: AdvancementEntry[] = [
  makeEntry({ timestamp: 1000, name: 'Oldest Skill', type: 'skill', from: 0, to: 1, xpCost: 10, inCareer: true }),
  makeEntry({ timestamp: 2000, name: 'Middle Skill', type: 'skill', from: 1, to: 2, xpCost: 20, inCareer: false }),
  makeEntry({ timestamp: 3000, name: 'Newest Skill', type: 'characteristic', from: 2, to: 3, xpCost: 30, inCareer: true }),
];

/* ------------------------------------------------------------------ */
/*  Tests                                                             */
/* ------------------------------------------------------------------ */

describe('AdvancementPage archive UI', () => {
  beforeEach(() => {
    cleanup();
  });

  // **Validates: Requirements 1.1**
  it('Archive card is rendered on the page', () => {
    renderAdvancementPage();
    expect(screen.getByText('Archive')).toBeInTheDocument();
  });

  // **Validates: Requirements 1.3, 2.1, 6.1**
  it('toggle button displays the archive entry count', () => {
    renderAdvancementPage({ advancementLogArchive: archiveEntries });
    expect(screen.getByRole('button', { name: /Show Archive \(3\)/ })).toBeInTheDocument();
  });

  // **Validates: Requirements 1.3, 2.1**
  it('toggle button shows (0) when archive is empty', () => {
    renderAdvancementPage({ advancementLogArchive: [] });
    expect(screen.getByRole('button', { name: /Show Archive \(0\)/ })).toBeInTheDocument();
  });

  // **Validates: Requirements 1.4, 1.6**
  it('clicking toggle shows the archive table, clicking again hides it', () => {
    renderAdvancementPage({ advancementLogArchive: archiveEntries });

    const toggleBtn = screen.getByRole('button', { name: /Show Archive/ });

    // Initially the table should not be visible
    expect(screen.queryByText('Oldest Skill')).not.toBeInTheDocument();

    // Click to show
    fireEvent.click(toggleBtn);
    expect(screen.getByText('Oldest Skill')).toBeInTheDocument();
    expect(screen.getByText('Middle Skill')).toBeInTheDocument();
    expect(screen.getByText('Newest Skill')).toBeInTheDocument();

    // Button text should now say "Hide"
    expect(screen.getByRole('button', { name: /Hide Archive/ })).toBeInTheDocument();

    // Click to hide
    fireEvent.click(screen.getByRole('button', { name: /Hide Archive/ }));
    expect(screen.queryByText('Oldest Skill')).not.toBeInTheDocument();
  });

  // **Validates: Requirements 2.2**
  it('empty state message is displayed when archive is empty and expanded', () => {
    renderAdvancementPage({ advancementLogArchive: [] });

    fireEvent.click(screen.getByRole('button', { name: /Show Archive \(0\)/ }));

    expect(
      screen.getByText(/No archived entries\. Entries are automatically archived when the active log exceeds 100 entries\./),
    ).toBeInTheDocument();
  });

  // **Validates: Requirements 1.4, 1.5**
  it('archived entries are displayed in reverse chronological order (most recent first)', () => {
    renderAdvancementPage({ advancementLogArchive: archiveEntries });

    fireEvent.click(screen.getByRole('button', { name: /Show Archive/ }));

    // Get all table bodies — the archive table is the one containing our entries
    const rows = screen.getAllByRole('row');
    const dataRows = rows.filter(
      (row) => row.textContent?.includes('Oldest Skill') || row.textContent?.includes('Middle Skill') || row.textContent?.includes('Newest Skill'),
    );

    expect(dataRows).toHaveLength(3);
    // Most recent first (timestamp 3000), then 2000, then 1000
    expect(dataRows[0]).toHaveTextContent('Newest Skill');
    expect(dataRows[1]).toHaveTextContent('Middle Skill');
    expect(dataRows[2]).toHaveTextContent('Oldest Skill');
  });

  // **Validates: Requirements 3.1**
  it('each archived entry row has a "Restore" button', () => {
    renderAdvancementPage({ advancementLogArchive: archiveEntries });

    fireEvent.click(screen.getByRole('button', { name: /Show Archive/ }));

    const restoreButtons = screen.getAllByRole('button', { name: 'Restore' });
    expect(restoreButtons).toHaveLength(3);
  });

  // **Validates: Requirements 3.2, 3.3, 6.2**
  it('clicking "Restore" removes the entry from the archive display', () => {
    const { updateCharacter, rerenderWithLatest } = renderAdvancementPage({
      advancementLogArchive: structuredClone(archiveEntries),
    });

    fireEvent.click(screen.getByRole('button', { name: /Show Archive/ }));

    // Restore the first displayed entry (Newest Skill, which maps to originalIndex 2)
    const restoreButtons = screen.getAllByRole('button', { name: 'Restore' });
    fireEvent.click(restoreButtons[0]);

    expect(updateCharacter).toHaveBeenCalledTimes(1);

    // Re-render with updated character
    rerenderWithLatest();

    // The archive should now have 2 entries and the toggle should reflect that
    expect(screen.getByRole('button', { name: /Archive \(2\)/ })).toBeInTheDocument();
    // Newest Skill should no longer be in the archive table
    expect(screen.queryByText('Newest Skill')).not.toBeInTheDocument();
    expect(screen.getByText('Middle Skill')).toBeInTheDocument();
    expect(screen.getByText('Oldest Skill')).toBeInTheDocument();
  });

  // **Validates: Requirements 4.1**
  it('"Clear Archive" button is visible when archive has entries', () => {
    renderAdvancementPage({ advancementLogArchive: archiveEntries });
    expect(screen.getByRole('button', { name: 'Clear Archive' })).toBeInTheDocument();
  });

  // **Validates: Requirements 4.5**
  it('"Clear Archive" button is hidden when archive is empty', () => {
    renderAdvancementPage({ advancementLogArchive: [] });
    expect(screen.queryByRole('button', { name: 'Clear Archive' })).not.toBeInTheDocument();
  });

  // **Validates: Requirements 4.2**
  it('clicking "Clear Archive" shows the confirmation dialog', () => {
    renderAdvancementPage({ advancementLogArchive: archiveEntries });

    fireEvent.click(screen.getByRole('button', { name: 'Clear Archive' }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent('Clear all archived advancement entries? This cannot be undone.');
  });

  // **Validates: Requirements 4.3**
  it('confirming clear empties the archive and shows empty state', () => {
    const { updateCharacter, rerenderWithLatest } = renderAdvancementPage({
      advancementLogArchive: structuredClone(archiveEntries),
    });

    // Open the archive first so we can verify the empty state after clearing
    fireEvent.click(screen.getByRole('button', { name: /Show Archive/ }));
    expect(screen.getByText('Newest Skill')).toBeInTheDocument();

    // Click Clear Archive
    fireEvent.click(screen.getByRole('button', { name: 'Clear Archive' }));
    // Confirm via the dialog's confirm button
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Clear Archive' }));

    expect(updateCharacter).toHaveBeenCalled();

    // Re-render with updated character
    rerenderWithLatest();

    // Archive should now be empty
    expect(screen.getByRole('button', { name: /Archive \(0\)/ })).toBeInTheDocument();
    // Dialog should be dismissed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // The archive is still expanded, so the empty state message should show
    expect(
      screen.getByText(/No archived entries/),
    ).toBeInTheDocument();
  });

  // **Validates: Requirements 4.4**
  it('cancelling clear leaves the archive unchanged', () => {
    const { updateCharacter } = renderAdvancementPage({
      advancementLogArchive: archiveEntries,
    });

    // Click Clear Archive
    fireEvent.click(screen.getByRole('button', { name: 'Clear Archive' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Cancel
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    // Dialog should be dismissed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // updateCharacter should NOT have been called
    expect(updateCharacter).not.toHaveBeenCalled();
    // Archive count should still be 3
    expect(screen.getByRole('button', { name: /Archive \(3\)/ })).toBeInTheDocument();
  });
});
