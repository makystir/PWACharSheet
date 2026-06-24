import { describe, it, expect } from 'vitest';
import { addDisease, removeDisease, updateDiseaseNotes, ActiveDisease } from '../diseases';

// ─── Disease Tracker edge case unit tests ────────────────────────────────────
// Validates: Requirements 4.1, 4.2, 4.3

describe('addDisease', () => {
  it('adding to empty array produces ID 1 with correct fields', () => {
    const result = addDisease([], 'Blood Rot');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(1);
    expect(result[0].diseaseName).toBe('Blood Rot');
    expect(result[0].contracted).toBeGreaterThan(0);
    expect(result[0].notes).toBe('');
  });

  it('adding to array with existing entries produces ID = max(existing) + 1', () => {
    const existing: ActiveDisease[] = [
      { id: 3, diseaseName: 'The Shakes', contracted: 1000, notes: '' },
      { id: 7, diseaseName: 'Fever', contracted: 2000, notes: 'bad' },
    ];
    const result = addDisease(existing, 'Black Plague');
    expect(result).toHaveLength(3);
    expect(result[2].id).toBe(8);
    expect(result[2].diseaseName).toBe('Black Plague');
  });

  it('does not mutate the original array', () => {
    const original: ActiveDisease[] = [
      { id: 1, diseaseName: 'Ratte Fever', contracted: 500, notes: '' },
    ];
    const originalLength = original.length;
    addDisease(original, 'Itching Pox');
    expect(original).toHaveLength(originalLength);
  });
});

describe('removeDisease', () => {
  it('removing from empty array returns empty array', () => {
    const result = removeDisease([], 42);
    expect(result).toEqual([]);
  });

  it('removing non-existent ID from non-empty array returns same content', () => {
    const existing: ActiveDisease[] = [
      { id: 1, diseaseName: 'Blood Rot', contracted: 1000, notes: '' },
      { id: 2, diseaseName: 'The Shakes', contracted: 2000, notes: 'notes' },
    ];
    const result = removeDisease(existing, 99);
    expect(result).toEqual(existing);
  });
});

describe('updateDiseaseNotes', () => {
  it('updating notes for non-existent ID returns unchanged array', () => {
    const existing: ActiveDisease[] = [
      { id: 1, diseaseName: 'Blood Rot', contracted: 1000, notes: 'original' },
      { id: 2, diseaseName: 'The Shakes', contracted: 2000, notes: 'other' },
    ];
    const result = updateDiseaseNotes(existing, 999, 'new notes');
    expect(result).toEqual(existing);
  });
});
