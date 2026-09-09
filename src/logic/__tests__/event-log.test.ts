import { describe, it, expect } from 'vitest';
import { clearEventLog } from '../event-log';
import type {
  Character,
  AdvancementEntry,
  LedgerEntry,
  LogEvent,
} from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// Feature: unified-event-log
// Unit tests for clearEventLog isolation (Req 9.3, 9.4).

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeEvent(overrides: Partial<LogEvent> = {}): LogEvent {
  return {
    id: 'evt-1',
    timestamp: 1000,
    category: 'roll',
    type: 'roll.skill',
    summary: 'Rolled Melee',
    payload: {},
    ...overrides,
  };
}

function makeAdvancement(overrides: Partial<AdvancementEntry> = {}): AdvancementEntry {
  return {
    timestamp: 2000,
    type: 'characteristic',
    name: 'WS',
    from: 5,
    to: 6,
    xpCost: 100,
    careerLevel: 'Soldier',
    inCareer: true,
    ...overrides,
  };
}

function makeLedgerEntry(overrides: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    timestamp: 3000,
    type: 'income',
    description: 'Sold loot',
    amount: { d: 0, ss: 5, gc: 2 },
    ...overrides,
  };
}

/**
 * Build a character with populated eventLog, advancementLog,
 * advancementLogArchive, and estate.ledger.
 */
function makeCharacter(): Character {
  return {
    ...BLANK_CHARACTER,
    eventLog: [makeEvent({ id: 'evt-1' }), makeEvent({ id: 'evt-2' })],
    advancementLog: [makeAdvancement({ name: 'WS' })],
    advancementLogArchive: [makeAdvancement({ name: 'BS', from: 3, to: 4 })],
    estate: {
      ...BLANK_CHARACTER.estate,
      ledger: [makeLedgerEntry(), makeLedgerEntry({ description: 'Bribe', type: 'expense' })],
    },
  };
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe('Feature: unified-event-log — clearEventLog isolation', () => {
  it('empties the eventLog', () => {
    const character = makeCharacter();
    const result = clearEventLog(character);
    expect(result.eventLog).toEqual([]);
  });

  it('leaves advancementLog structurally unchanged and referentially identical', () => {
    const character = makeCharacter();
    const originalLog = character.advancementLog;
    const result = clearEventLog(character);
    // Structural equality
    expect(result.advancementLog).toEqual(originalLog);
    // Referential identity — the spread carries it over by reference
    expect(result.advancementLog).toBe(originalLog);
  });

  it('leaves advancementLogArchive structurally unchanged and referentially identical', () => {
    const character = makeCharacter();
    const originalArchive = character.advancementLogArchive;
    const result = clearEventLog(character);
    expect(result.advancementLogArchive).toEqual(originalArchive);
    expect(result.advancementLogArchive).toBe(originalArchive);
  });

  it('leaves estate.ledger structurally unchanged and referentially identical', () => {
    const character = makeCharacter();
    const originalLedger = character.estate.ledger;
    const originalEstate = character.estate;
    const result = clearEventLog(character);
    expect(result.estate.ledger).toEqual(originalLedger);
    // estate is not a cleared field, so the whole estate object is carried by reference
    expect(result.estate).toBe(originalEstate);
    expect(result.estate.ledger).toBe(originalLedger);
  });

  it('does not mutate the input character', () => {
    const character = makeCharacter();
    const eventLogBefore = character.eventLog;
    const snapshot = JSON.parse(JSON.stringify(character));

    clearEventLog(character);

    // Input eventLog reference is untouched and still holds its entries
    expect(character.eventLog).toBe(eventLogBefore);
    expect(character.eventLog).toHaveLength(2);
    // Deep snapshot of the input is unchanged
    expect(character).toEqual(snapshot);
  });

  it('returns a new character object (does not return the same reference)', () => {
    const character = makeCharacter();
    const result = clearEventLog(character);
    expect(result).not.toBe(character);
  });
});
