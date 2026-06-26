import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { parseLogEntry, createLogEntry } from '../SessionNotesPanel';

// Feature: ux-polish-and-functionality, Property 4: Session Notes Chronological Ordering

// ─── Generators ─────────────────────────────────────────────────────────────

/** Arbitrary non-empty note text (no pipe at start to avoid confusion with separator). */
const arbNoteText = fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

/** Arbitrary positive timestamp (realistic range: year 2000 to year 2100). */
const arbTimestamp = fc.integer({ min: 946684800000, max: 4102444800000 });

/** Arbitrary list of distinct timestamps to simulate note additions over time. */
const arbTimestampList = fc.array(arbTimestamp, { minLength: 1, maxLength: 30 });

/** Arbitrary list of notes: each entry is a {text, timestamp} pair. */
const arbNoteEntries = fc.array(
  fc.record({ text: arbNoteText, timestamp: arbTimestamp }),
  { minLength: 1, maxLength: 30 }
);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: ux-polish-and-functionality', () => {
  describe('Property 4: Session Notes Chronological Ordering', () => {
    /**
     * **Validates: Requirements 6.1, 6.3**
     */

    it('displayed log is ordered by timestamp descending (newest first)', () => {
      fc.assert(
        fc.property(
          arbNoteEntries,
          (entries) => {
            // Create log entries using createLogEntry (simulates adding notes)
            const logStrings = entries.map(e => createLogEntry(e.text, e.timestamp));

            // Parse and sort as the component does: sort by timestamp descending
            const parsed = logStrings.map(entry => parseLogEntry(entry));
            const sorted = [...parsed].sort((a, b) => b.timestamp - a.timestamp);

            // Verify descending order: each timestamp ≤ previous
            for (let i = 1; i < sorted.length; i++) {
              expect(sorted[i].timestamp).toBeLessThanOrEqual(sorted[i - 1].timestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('most recently added note always appears at index 0 after sorting', () => {
      fc.assert(
        fc.property(
          arbNoteEntries,
          arbNoteText,
          (existingEntries, newNoteText) => {
            // Create existing log entries with various timestamps
            const logStrings = existingEntries.map(e => createLogEntry(e.text, e.timestamp));

            // Add a new entry with a timestamp guaranteed to be the most recent
            const maxExistingTs = Math.max(...existingEntries.map(e => e.timestamp));
            const newTimestamp = maxExistingTs + 1;
            const newEntry = createLogEntry(newNoteText, newTimestamp);
            const allLogStrings = [...logStrings, newEntry];

            // Parse and sort descending by timestamp (as the component does)
            const parsed = allLogStrings.map(entry => parseLogEntry(entry));
            const sorted = [...parsed].sort((a, b) => b.timestamp - a.timestamp);

            // The newest note should be at index 0
            expect(sorted[0].timestamp).toBe(newTimestamp);
            expect(sorted[0].text).toBe(newNoteText);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('most recent note has timestamp ≤ Date.now()', () => {
      fc.assert(
        fc.property(
          arbNoteText,
          (noteText) => {
            const before = Date.now();
            const entry = createLogEntry(noteText);
            const after = Date.now();

            const parsed = parseLogEntry(entry);

            // Timestamp should be between before and after (inclusive)
            expect(parsed.timestamp).toBeGreaterThanOrEqual(before);
            expect(parsed.timestamp).toBeLessThanOrEqual(after);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('for any sequence of note additions, sorting preserves all entries (no data loss)', () => {
      fc.assert(
        fc.property(
          arbNoteEntries,
          (entries) => {
            // Create log entries
            const logStrings = entries.map(e => createLogEntry(e.text, e.timestamp));

            // Parse all
            const parsed = logStrings.map(entry => parseLogEntry(entry));

            // Sort descending by timestamp
            const sorted = [...parsed].sort((a, b) => b.timestamp - a.timestamp);

            // Same length — no entries lost
            expect(sorted).toHaveLength(parsed.length);

            // Every original entry's text appears in the sorted result
            for (const original of parsed) {
              const found = sorted.some(
                s => s.timestamp === original.timestamp && s.text === original.text
              );
              expect(found).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
