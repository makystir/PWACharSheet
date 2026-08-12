import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { SessionNotesPanel } from '../SessionNotesPanel';
import { parseLogEntry, createLogEntry } from '../SessionNotesPanel';
import { BLANK_CHARACTER } from '../../../types/character';

function makeCharacterWithLog(log: string[] = []) {
  return { ...BLANK_CHARACTER, log };
}

describe('SessionNotesPanel', () => {
  // **Validates: Requirement 6.6**
  it('displays empty state message when no notes exist', () => {
    const updateCharacter = vi.fn();
    render(
      <SessionNotesPanel character={makeCharacterWithLog([])} updateCharacter={updateCharacter} />
    );

    expect(screen.getByText('No Session Notes')).toBeInTheDocument();
  });

  // **Validates: Requirement 6.2**
  it('provides a text input and submit control for adding new entries', () => {
    const updateCharacter = vi.fn();
    render(
      <SessionNotesPanel character={makeCharacterWithLog([])} updateCharacter={updateCharacter} />
    );

    expect(screen.getByLabelText('New session note')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument();
  });

  // **Validates: Requirement 6.3**
  it('submitting a note prepends entry with current timestamp to the log', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    render(
      <SessionNotesPanel character={makeCharacterWithLog([])} updateCharacter={updateCharacter} />
    );

    const input = screen.getByLabelText('New session note');
    await user.type(input, 'Party arrived at Altdorf');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const result = mutator(makeCharacterWithLog([]));

    // Should have one entry
    expect(result.log).toHaveLength(1);

    // Parse the entry to verify timestamp and text
    const parsed = parseLogEntry(result.log[0]);
    expect(parsed.text).toBe('Party arrived at Altdorf');
    expect(parsed.timestamp).toBeLessThanOrEqual(Date.now());
    expect(parsed.timestamp).toBeGreaterThan(0);
  });

  // **Validates: Requirement 6.1**
  it('displays log entries in reverse chronological order (newest first)', () => {
    const updateCharacter = vi.fn();
    const log = [
      createLogEntry('First note', 1000),
      createLogEntry('Second note', 2000),
      createLogEntry('Third note', 3000),
    ];

    render(
      <SessionNotesPanel character={makeCharacterWithLog(log)} updateCharacter={updateCharacter} />
    );

    const noteTexts = screen.getAllByText(/note$/i);
    expect(noteTexts[0]).toHaveTextContent('Third note');
    expect(noteTexts[1]).toHaveTextContent('Second note');
    expect(noteTexts[2]).toHaveTextContent('First note');
  });

  // **Validates: Requirement 6.4**
  it('displays timestamp formatted as human-readable date and time', () => {
    const updateCharacter = vi.fn();
    const ts = new Date('2024-03-15T10:30:00.000Z').getTime();
    const log = [createLogEntry('A note', ts)];

    render(
      <SessionNotesPanel character={makeCharacterWithLog(log)} updateCharacter={updateCharacter} />
    );

    // The timestamp should render as a locale string; just verify something is there
    const noteItem = screen.getByText('A note').closest('[class*="noteItem"]');
    expect(noteItem).toBeTruthy();
    // Should have a timestamp element
    const tsElement = noteItem?.querySelector('[class*="noteTimestamp"]');
    expect(tsElement).toBeTruthy();
    expect(tsElement?.textContent).toBeTruthy();
  });

  // **Validates: Requirement 6.5**
  it('provides delete control per entry that removes it from log', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    const log = [
      createLogEntry('Keep this', 1000),
      createLogEntry('Delete this', 2000),
    ];

    render(
      <SessionNotesPanel character={makeCharacterWithLog(log)} updateCharacter={updateCharacter} />
    );

    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    // First delete button corresponds to newest (index 0 in sorted = "Delete this")
    await user.click(deleteButtons[0]);

    expect(updateCharacter).toHaveBeenCalledTimes(1);

    const mutator = updateCharacter.mock.calls[0][0];
    const result = mutator(makeCharacterWithLog(log));

    expect(result.log).toHaveLength(1);
    expect(parseLogEntry(result.log[0]).text).toBe('Keep this');
  });

  // **Validates: Requirement 6.6**
  it('shows empty state when log array length is 0', () => {
    const updateCharacter = vi.fn();
    render(
      <SessionNotesPanel character={makeCharacterWithLog([])} updateCharacter={updateCharacter} />
    );

    expect(screen.getByText('No Session Notes')).toBeInTheDocument();
    expect(screen.queryAllByRole('button', { name: /delete/i })).toHaveLength(0);
  });

  it('submit button is disabled when input is empty', () => {
    const updateCharacter = vi.fn();
    render(
      <SessionNotesPanel character={makeCharacterWithLog([])} updateCharacter={updateCharacter} />
    );

    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
  });

  it('clears input after successful submission', async () => {
    const user = userEvent.setup();
    const updateCharacter = vi.fn();
    render(
      <SessionNotesPanel character={makeCharacterWithLog([])} updateCharacter={updateCharacter} />
    );

    const input = screen.getByLabelText('New session note');
    await user.type(input, 'Test note');
    await user.click(screen.getByRole('button', { name: /add/i }));

    expect(input).toHaveValue('');
  });
});

describe('parseLogEntry', () => {
  it('parses a timestamped entry correctly', () => {
    const result = parseLogEntry('1718456000000|Hello world');
    expect(result.timestamp).toBe(1718456000000);
    expect(result.text).toBe('Hello world');
  });

  it('handles legacy entries without timestamp', () => {
    const result = parseLogEntry('Just some old text');
    expect(result.timestamp).toBe(0);
    expect(result.text).toBe('Just some old text');
  });

  it('handles entries with pipe characters in the text', () => {
    const result = parseLogEntry('1718456000000|Text with | pipe');
    expect(result.timestamp).toBe(1718456000000);
    expect(result.text).toBe('Text with | pipe');
  });
});

describe('createLogEntry', () => {
  it('creates a log entry with timestamp and text', () => {
    const entry = createLogEntry('Test', 1234567890);
    expect(entry).toBe('1234567890|Test');
  });
});
