import { useState } from 'react';
import type { Character } from '../../types/character';
import { Card } from './Card';
import styles from './SessionNotesPanel.module.css';

interface SessionNotesPanelProps {
  character: Character;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/** Separator between timestamp and note text in each log entry string */
const SEPARATOR = '|';

/** Format a timestamp as a human-readable date/time string */
function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Parse a log entry string into timestamp and text parts */
export function parseLogEntry(entry: string): { timestamp: number; text: string } {
  const sepIndex = entry.indexOf(SEPARATOR);
  if (sepIndex > 0) {
    const tsStr = entry.slice(0, sepIndex);
    const ts = Number(tsStr);
    if (!isNaN(ts) && ts > 0) {
      return { timestamp: ts, text: entry.slice(sepIndex + 1) };
    }
  }
  // Legacy entry without timestamp — treat as epoch 0
  return { timestamp: 0, text: entry };
}

/** Create a log entry string from text and current time */
export function createLogEntry(text: string, now: number = Date.now()): string {
  return `${now}${SEPARATOR}${text}`;
}

export function SessionNotesPanel({ character, updateCharacter }: SessionNotesPanelProps) {
  const [noteInput, setNoteInput] = useState('');

  const logEntries = (character.log ?? []).map((entry, index) => ({
    ...parseLogEntry(entry),
    index,
  }));

  // Sort by timestamp descending (newest first)
  const sortedEntries = [...logEntries].sort((a, b) => b.timestamp - a.timestamp);

  const handleSubmit = () => {
    const text = noteInput.trim();
    if (!text) return;

    const entry = createLogEntry(text);

    updateCharacter((char) => ({
      ...char,
      log: [entry, ...(char.log ?? [])],
    }));

    setNoteInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleDelete = (index: number) => {
    updateCharacter((char) => ({
      ...char,
      log: (char.log ?? []).filter((_, i) => i !== index),
    }));
  };

  return (
    <Card>
      <div className={styles.container}>
        {/* Add Note Form */}
        <div className={styles.addForm}>
          <textarea
            className={styles.noteInput}
            placeholder="Add a session note…"
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            aria-label="New session note"
          />
          <button
            type="button"
            className={styles.submitBtn}
            onClick={handleSubmit}
            disabled={!noteInput.trim()}
          >
            Add
          </button>
        </div>

        {/* Notes List */}
        {sortedEntries.length === 0 ? (
          <div className={styles.emptyState}>
            No session notes recorded yet. Add notes to track events, decisions, and reminders.
          </div>
        ) : (
          <div className={styles.noteList}>
            {sortedEntries.map((entry) => (
              <div key={`${entry.index}-${entry.timestamp}`} className={styles.noteItem}>
                {entry.timestamp > 0 && (
                  <span className={styles.noteTimestamp}>
                    {formatTimestamp(entry.timestamp)}
                  </span>
                )}
                <span className={styles.noteText}>{entry.text}</span>
                <div className={styles.noteActions}>
                  <button
                    type="button"
                    className={styles.deleteBtn}
                    onClick={() => handleDelete(entry.index)}
                    aria-label="Delete note"
                  >
                    ✕ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
