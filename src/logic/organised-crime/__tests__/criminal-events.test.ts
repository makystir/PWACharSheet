import { describe, it, expect } from 'vitest';
import { CRIMINAL_EVENTS, resolveCriminalEvent } from '../criminal-events';

/**
 * Fixture + mapping tests for the Criminal Events 1d100 table (Deft Steps p.60).
 * Pins the 24 enumerated ranges so a silent edit trips here, confirms the ranges
 * tile 1–100 contiguously, and checks resolveCriminalEvent boundaries including
 * the wider 65-70 / 71-75 / 76-80 ranges and the 00 → 97-00 convention.
 */

const EXPECTED_RANGES = [
  '01-04', '05-08', '09-12', '13-16', '17-20', '21-24', '25-28', '29-32',
  '33-36', '37-40', '41-44', '45-48', '49-52', '53-56', '57-60', '61-64',
  '65-70', '71-75', '76-80', '81-84', '85-88', '89-92', '93-96', '97-00',
];

describe('Criminal Events table — verbatim extent (Deft Steps p.60)', () => {
  it('has exactly the 24 enumerated ranges in order', () => {
    expect(CRIMINAL_EVENTS.map((e) => e.range)).toEqual(EXPECTED_RANGES);
    expect(CRIMINAL_EVENTS).toHaveLength(24);
  });

  it('every row has a non-empty verbatim title and text', () => {
    for (const e of CRIMINAL_EVENTS) {
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.text.length).toBeGreaterThan(0);
    }
  });

  it('the ranges tile 1–100 contiguously with no gaps or overlaps', () => {
    expect(CRIMINAL_EVENTS[0].min).toBe(1);
    expect(CRIMINAL_EVENTS[CRIMINAL_EVENTS.length - 1].max).toBe(100);
    for (let i = 1; i < CRIMINAL_EVENTS.length; i++) {
      expect(CRIMINAL_EVENTS[i].min).toBe(CRIMINAL_EVENTS[i - 1].max + 1);
    }
  });

  it('pins the first and last rows verbatim', () => {
    expect(CRIMINAL_EVENTS[0].title).toBe('Watch - Good Crooks And Bad Constables');
    expect(CRIMINAL_EVENTS[CRIMINAL_EVENTS.length - 1].title).toBe('Gang War - Regicide');
  });

  it('pins the four Gang War rows', () => {
    const gangWar = CRIMINAL_EVENTS.filter((e) => e.title.startsWith('Gang War'));
    expect(gangWar.map((e) => e.range)).toEqual(['85-88', '89-92', '93-96', '97-00']);
  });
});

describe('resolveCriminalEvent — boundary rolls', () => {
  const cases: [number, string][] = [
    [1, '01-04'],
    [4, '01-04'],
    [5, '05-08'],
    [64, '61-64'],
    [65, '65-70'],
    [70, '65-70'],
    [71, '71-75'],
    [75, '71-75'],
    [76, '76-80'],
    [80, '76-80'],
    [92, '89-92'],
    [93, '93-96'],
    [96, '93-96'],
    [97, '97-00'],
    [100, '97-00'],
    [0, '97-00'],
  ];

  for (const [roll, range] of cases) {
    it(`roll ${roll} → ${range}`, () => {
      expect(resolveCriminalEvent(roll).range).toBe(range);
    });
  }

  it('clamps out-of-range rolls', () => {
    expect(resolveCriminalEvent(-5).range).toBe('01-04');
    expect(resolveCriminalEvent(250).range).toBe('97-00');
    expect(resolveCriminalEvent(42.7).range).toBe('41-44');
  });
});
