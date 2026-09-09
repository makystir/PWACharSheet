import { describe, it, expect } from 'vitest';
import { mirrorAdvancement, mirrorLedger } from '../event-log-mirrors';
import type {
  AdvancementEntry,
  AdvancementEventPayload,
  Character,
  LedgerEntry,
  WealthEventPayload,
} from '../../types/character';
import { BLANK_CHARACTER } from '../../types/character';

// Feature: unified-event-log
// Unit tests for the mirror helpers (Req 5.2, 5.4, 6.2).
//
// Mirror helpers are pure display/audit-only transforms applied AFTER the
// authoritative typed write. They append exactly one event to `eventLog` and
// must never read or alter `advancementLog` / `advancementLogArchive` /
// `estate.ledger` or any treasury field.

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
 * Build a character with pre-populated authoritative source-of-truth structures
 * so we can assert the mirror helpers leave them untouched.
 */
function makeCharacter(): Character {
  return {
    ...BLANK_CHARACTER,
    eventLog: [],
    advancementLog: [makeAdvancement({ name: 'WS' })],
    advancementLogArchive: [makeAdvancement({ name: 'BS', from: 3, to: 4 })],
    estate: {
      ...BLANK_CHARACTER.estate,
      ledger: [makeLedgerEntry(), makeLedgerEntry({ description: 'Bribe', type: 'expense' })],
    },
  };
}

// The minus sign used in the summaries is U+2212 (MINUS SIGN), not the ASCII
// hyphen-minus. Reference it explicitly so the assertions are unambiguous.
const MINUS = '\u2212';

// ─── mirrorAdvancement ───────────────────────────────────────────────────────

describe('Feature: unified-event-log — mirrorAdvancement', () => {
  it('appends exactly one advancement event for a normal advance', () => {
    const character = makeCharacter();
    const entry = makeAdvancement({ name: 'WS', from: 5, to: 6, xpCost: 100 });

    const result = mirrorAdvancement(character, entry);

    expect(result.eventLog).toHaveLength(1);
    expect(result.eventLog![0].category).toBe('advancement');
    expect(result.eventLog![0].type).toBe('advancement.mirror');
  });

  it('builds the expected summary for a normal advance', () => {
    const character = makeCharacter();
    const entry = makeAdvancement({ name: 'WS', from: 5, to: 6, xpCost: 100 });

    const result = mirrorAdvancement(character, entry);

    expect(result.eventLog![0].summary).toBe(`XP: Advance WS 5\u21926 (${MINUS}100 XP)`);
  });

  it('builds a correct AdvancementEventPayload for a normal advance', () => {
    const character = makeCharacter();
    const entry = makeAdvancement({ name: 'WS', from: 5, to: 6, xpCost: 100 });

    const result = mirrorAdvancement(character, entry);
    const payload = result.eventLog![0].payload as unknown as AdvancementEventPayload;

    expect(payload).toEqual({
      entryType: 'characteristic',
      name: 'WS',
      from: 5,
      to: 6,
      xpCost: 100,
      undo: false,
    });
  });

  it('builds the undo summary and payload for an undo (undo: true)', () => {
    const character = makeCharacter();
    const entry = makeAdvancement({ name: 'WS', from: 5, to: 6, xpCost: 100 });

    const result = mirrorAdvancement(character, entry, { undo: true });
    const event = result.eventLog![0];
    const payload = event.payload as unknown as AdvancementEventPayload;

    // Undo reverses the value direction (to→from) and refunds XP (+ sign).
    expect(event.summary).toBe('Undo: Advance WS 6\u21925 (+100 XP)');
    expect(event.category).toBe('advancement');
    expect(event.type).toBe('advancement.mirror.undo');
    expect(payload.undo).toBe(true);
    expect(payload).toEqual({
      entryType: 'characteristic',
      name: 'WS',
      from: 5,
      to: 6,
      xpCost: 100,
      undo: true,
    });
  });

  it('does not modify advancementLog or advancementLogArchive', () => {
    const character = makeCharacter();
    const originalLog = character.advancementLog;
    const originalArchive = character.advancementLogArchive;
    const entry = makeAdvancement();

    const result = mirrorAdvancement(character, entry);

    // Referentially and structurally unchanged — mirror never touches the
    // authoritative advancement structures.
    expect(result.advancementLog).toBe(originalLog);
    expect(result.advancementLogArchive).toBe(originalArchive);
    expect(result.advancementLog).toEqual(originalLog);
    expect(result.advancementLogArchive).toEqual(originalArchive);
  });

  it('does not mutate the input character', () => {
    const character = makeCharacter();
    const snapshot = JSON.parse(JSON.stringify(character));
    const eventLogBefore = character.eventLog;

    mirrorAdvancement(character, makeAdvancement());

    expect(character.eventLog).toBe(eventLogBefore);
    expect(character.eventLog).toHaveLength(0);
    expect(character).toEqual(snapshot);
  });
});

// ─── mirrorLedger ────────────────────────────────────────────────────────────

describe('Feature: unified-event-log — mirrorLedger', () => {
  it('appends exactly one wealth event', () => {
    const character = makeCharacter();
    const entry = makeLedgerEntry();

    const result = mirrorLedger(character, entry);

    expect(result.eventLog).toHaveLength(1);
    expect(result.eventLog![0].category).toBe('wealth');
    expect(result.eventLog![0].type).toBe('wealth.mirror');
  });

  it('builds a summary that includes the monetary amount', () => {
    const character = makeCharacter();
    const entry = makeLedgerEntry({
      description: 'Sold loot',
      amount: { d: 0, ss: 5, gc: 2 },
    });

    const result = mirrorLedger(character, entry);
    const summary = result.eventLog![0].summary;

    // Positive net amount → '+' sign, largest denomination first.
    expect(summary).toBe('Wealth: Sold loot +2 GC 5 ss');
    // Sanity: the amount is present in the summary text.
    expect(summary).toContain('2 GC');
    expect(summary).toContain('5 ss');
  });

  it('uses a minus sign for a net loss', () => {
    const character = makeCharacter();
    const entry = makeLedgerEntry({
      description: 'Bribe',
      type: 'expense',
      amount: { d: 0, ss: 0, gc: -3 },
    });

    const result = mirrorLedger(character, entry);

    expect(result.eventLog![0].summary).toBe(`Wealth: Bribe ${MINUS}3 GC`);
  });

  it('builds a correct WealthEventPayload', () => {
    const character = makeCharacter();
    const entry = makeLedgerEntry({
      type: 'income',
      description: 'Sold loot',
      amount: { d: 0, ss: 5, gc: 2 },
    });

    const result = mirrorLedger(character, entry);
    const payload = result.eventLog![0].payload as unknown as WealthEventPayload;

    expect(payload).toEqual({
      entryType: 'income',
      description: 'Sold loot',
      amount: { d: 0, ss: 5, gc: 2 },
    });
  });

  it('does not modify estate.ledger or the estate object', () => {
    const character = makeCharacter();
    const originalLedger = character.estate.ledger;
    const originalEstate = character.estate;

    const result = mirrorLedger(character, makeLedgerEntry());

    // The mirror only appends to eventLog; estate and its ledger are carried
    // over by reference, structurally unchanged.
    expect(result.estate).toBe(originalEstate);
    expect(result.estate.ledger).toBe(originalLedger);
    expect(result.estate.ledger).toEqual(originalLedger);
  });

  it('does not mutate the input character', () => {
    const character = makeCharacter();
    const snapshot = JSON.parse(JSON.stringify(character));
    const eventLogBefore = character.eventLog;

    mirrorLedger(character, makeLedgerEntry());

    expect(character.eventLog).toBe(eventLogBefore);
    expect(character.eventLog).toHaveLength(0);
    expect(character).toEqual(snapshot);
  });
});
