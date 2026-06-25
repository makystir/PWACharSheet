import { describe, it, expect } from 'vitest';
import {
  isDwarf,
  isGrudgePanelVisible,
  getGrudgeXP,
  validateGrudgeForm,
  createGrudgeEntry,
  satisfyGrudge,
  deleteGrudge,
  canAddPartyGrudge,
  sortGrudges,
} from '../grudges';
import { BLANK_CHARACTER } from '../../types/character';
import type { Character, GrudgeEntry } from '../../types/character';
import type { GrudgeFormData } from '../grudges';

function makeCharacter(overrides: Partial<Character>): Character {
  return { ...BLANK_CHARACTER, ...overrides } as Character;
}

function makeGrudge(overrides: Partial<GrudgeEntry> = {}): GrudgeEntry {
  return {
    id: 'test-id-1',
    offence: 'Stole my ale',
    perpetrator: 'Gotrek',
    restitution: 'Buy me a new one',
    type: 'standard',
    status: 'outstanding',
    isPartyGrudge: false,
    dateRecorded: '2024-01-15',
    ...overrides,
  };
}

describe('isDwarf', () => {
  it('returns true for "Dwarf"', () => {
    expect(isDwarf('Dwarf')).toBe(true);
  });

  it('returns true for "Dwarf (Karaz-a-Karak)"', () => {
    expect(isDwarf('Dwarf (Karaz-a-Karak)')).toBe(true);
  });

  it('returns true for "Dwarf (Barak Varr)"', () => {
    expect(isDwarf('Dwarf (Barak Varr)')).toBe(true);
  });

  it('returns false for "Human"', () => {
    expect(isDwarf('Human')).toBe(false);
  });

  it('returns false for "High Elf"', () => {
    expect(isDwarf('High Elf')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isDwarf('')).toBe(false);
  });

  it('returns true for "DWARF" (case-insensitive)', () => {
    expect(isDwarf('DWARF')).toBe(true);
  });
});

describe('isGrudgePanelVisible', () => {
  it('returns true when useGrudgeBook is true and species is Dwarf', () => {
    const char = makeCharacter({
      species: 'Dwarf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true },
    });
    expect(isGrudgePanelVisible(char)).toBe(true);
  });

  it('returns false when useGrudgeBook is false and species is Dwarf', () => {
    const char = makeCharacter({
      species: 'Dwarf',
      houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: false },
    });
    expect(isGrudgePanelVisible(char)).toBe(false);
  });

  it('returns false when useGrudgeBook is true and species is Human', () => {
    const char = makeCharacter({
      species: 'Human',
      houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true },
    });
    expect(isGrudgePanelVisible(char)).toBe(false);
  });

  it('returns false when useGrudgeBook is false and species is Human', () => {
    const char = makeCharacter({
      species: 'Human',
      houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: false },
    });
    expect(isGrudgePanelVisible(char)).toBe(false);
  });

  it('returns true for Dwarf subspecies with toggle enabled', () => {
    const char = makeCharacter({
      species: 'Dwarf (Karaz-a-Karak)',
      houseRules: { ...BLANK_CHARACTER.houseRules, useGrudgeBook: true },
    });
    expect(isGrudgePanelVisible(char)).toBe(true);
  });
});

describe('getGrudgeXP', () => {
  it('returns 25 for standard grudge', () => {
    expect(getGrudgeXP('standard')).toBe(25);
  });

  it('returns 50 for blood grudge', () => {
    expect(getGrudgeXP('blood')).toBe(50);
  });
});

describe('validateGrudgeForm', () => {
  it('returns valid for a complete form', () => {
    const form: GrudgeFormData = {
      offence: 'Insulted my beard',
      perpetrator: 'Snorri',
      restitution: 'Public apology',
      type: 'standard',
      isPartyGrudge: false,
    };
    const result = validateGrudgeForm(form);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns invalid when offence is empty', () => {
    const form: GrudgeFormData = {
      offence: '',
      perpetrator: 'Snorri',
      restitution: 'Public apology',
      type: 'standard',
      isPartyGrudge: false,
    };
    const result = validateGrudgeForm(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].field).toBe('offence');
  });

  it('returns invalid with three errors when all fields are empty', () => {
    const form: GrudgeFormData = {
      offence: '',
      perpetrator: '',
      restitution: '',
      type: 'standard',
      isPartyGrudge: false,
    };
    const result = validateGrudgeForm(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });

  it('returns invalid for whitespace-only fields', () => {
    const form: GrudgeFormData = {
      offence: '   ',
      perpetrator: '\t',
      restitution: ' \n ',
      type: 'blood',
      isPartyGrudge: true,
    };
    const result = validateGrudgeForm(form);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(3);
  });
});

describe('createGrudgeEntry', () => {
  it('appends a new grudge with status outstanding', () => {
    const char = makeCharacter({ species: 'Dwarf', grudges: [] });
    const form: GrudgeFormData = {
      offence: 'Broke my axe',
      perpetrator: 'Ungrim',
      restitution: 'Replace with runic axe',
      type: 'blood',
      isPartyGrudge: false,
    };
    const updated = createGrudgeEntry(char, form);
    expect(updated.grudges).toHaveLength(1);
    expect(updated.grudges![0].status).toBe('outstanding');
  });

  it('generates a non-empty ID', () => {
    const char = makeCharacter({ species: 'Dwarf', grudges: [] });
    const form: GrudgeFormData = {
      offence: 'Broke my axe',
      perpetrator: 'Ungrim',
      restitution: 'Replace with runic axe',
      type: 'standard',
      isPartyGrudge: false,
    };
    const updated = createGrudgeEntry(char, form);
    expect(updated.grudges![0].id).toBeTruthy();
    expect(updated.grudges![0].id.length).toBeGreaterThan(0);
  });

  it('sets dateRecorded to today', () => {
    const char = makeCharacter({ species: 'Dwarf', grudges: [] });
    const form: GrudgeFormData = {
      offence: 'Broke my axe',
      perpetrator: 'Ungrim',
      restitution: 'Replace with runic axe',
      type: 'standard',
      isPartyGrudge: false,
    };
    const updated = createGrudgeEntry(char, form);
    const today = new Date().toISOString().slice(0, 10);
    expect(updated.grudges![0].dateRecorded).toBe(today);
  });

  it('does not mutate the original character', () => {
    const char = makeCharacter({ species: 'Dwarf', grudges: [] });
    const form: GrudgeFormData = {
      offence: 'Broke my axe',
      perpetrator: 'Ungrim',
      restitution: 'Replace with runic axe',
      type: 'standard',
      isPartyGrudge: false,
    };
    createGrudgeEntry(char, form);
    expect(char.grudges).toHaveLength(0);
  });
});

describe('satisfyGrudge', () => {
  it('sets status to satisfied and dateSatisfied to today', () => {
    const grudge = makeGrudge({ id: 'g1', status: 'outstanding' });
    const char = makeCharacter({ grudges: [grudge] });
    const updated = satisfyGrudge(char, 'g1');
    const today = new Date().toISOString().slice(0, 10);
    expect(updated.grudges![0].status).toBe('satisfied');
    expect(updated.grudges![0].dateSatisfied).toBe(today);
  });

  it('is a no-op on already satisfied grudge', () => {
    const grudge = makeGrudge({ id: 'g1', status: 'satisfied', dateSatisfied: '2024-01-01' });
    const char = makeCharacter({ grudges: [grudge] });
    const updated = satisfyGrudge(char, 'g1');
    expect(updated).toBe(char); // same reference — no-op
  });

  it('is a no-op when grudge ID is not found', () => {
    const grudge = makeGrudge({ id: 'g1', status: 'outstanding' });
    const char = makeCharacter({ grudges: [grudge] });
    const updated = satisfyGrudge(char, 'non-existent');
    expect(updated).toBe(char);
  });
});

describe('deleteGrudge', () => {
  it('removes the grudge with the given ID', () => {
    const grudge = makeGrudge({ id: 'g1' });
    const char = makeCharacter({ grudges: [grudge] });
    const updated = deleteGrudge(char, 'g1');
    expect(updated.grudges).toHaveLength(0);
  });

  it('is a no-op when ID is not found', () => {
    const grudge = makeGrudge({ id: 'g1' });
    const char = makeCharacter({ grudges: [grudge] });
    const updated = deleteGrudge(char, 'non-existent');
    expect(updated).toBe(char);
  });

  it('removes only the target and leaves other grudges intact', () => {
    const g1 = makeGrudge({ id: 'g1', offence: 'First' });
    const g2 = makeGrudge({ id: 'g2', offence: 'Second' });
    const char = makeCharacter({ grudges: [g1, g2] });
    const updated = deleteGrudge(char, 'g1');
    expect(updated.grudges).toHaveLength(1);
    expect(updated.grudges![0].id).toBe('g2');
  });
});

describe('canAddPartyGrudge', () => {
  it('returns true with 0 outstanding party grudges', () => {
    expect(canAddPartyGrudge([])).toBe(true);
  });

  it('returns true with 1 outstanding party grudge', () => {
    const grudges = [makeGrudge({ isPartyGrudge: true, status: 'outstanding' })];
    expect(canAddPartyGrudge(grudges)).toBe(true);
  });

  it('returns true with 2 outstanding party grudges', () => {
    const grudges = [
      makeGrudge({ id: 'g1', isPartyGrudge: true, status: 'outstanding' }),
      makeGrudge({ id: 'g2', isPartyGrudge: true, status: 'outstanding' }),
    ];
    expect(canAddPartyGrudge(grudges)).toBe(true);
  });

  it('returns false with 3 outstanding party grudges', () => {
    const grudges = [
      makeGrudge({ id: 'g1', isPartyGrudge: true, status: 'outstanding' }),
      makeGrudge({ id: 'g2', isPartyGrudge: true, status: 'outstanding' }),
      makeGrudge({ id: 'g3', isPartyGrudge: true, status: 'outstanding' }),
    ];
    expect(canAddPartyGrudge(grudges)).toBe(false);
  });

  it('does not count satisfied party grudges toward limit', () => {
    const grudges = [
      makeGrudge({ id: 'g1', isPartyGrudge: true, status: 'satisfied' }),
      makeGrudge({ id: 'g2', isPartyGrudge: true, status: 'satisfied' }),
      makeGrudge({ id: 'g3', isPartyGrudge: true, status: 'satisfied' }),
    ];
    expect(canAddPartyGrudge(grudges)).toBe(true);
  });

  it('does not count personal outstanding grudges toward limit', () => {
    const grudges = [
      makeGrudge({ id: 'g1', isPartyGrudge: false, status: 'outstanding' }),
      makeGrudge({ id: 'g2', isPartyGrudge: false, status: 'outstanding' }),
      makeGrudge({ id: 'g3', isPartyGrudge: false, status: 'outstanding' }),
    ];
    expect(canAddPartyGrudge(grudges)).toBe(true);
  });
});

describe('sortGrudges', () => {
  it('places outstanding grudges before satisfied', () => {
    const grudges = [
      makeGrudge({ id: 'g1', status: 'satisfied' }),
      makeGrudge({ id: 'g2', status: 'outstanding' }),
      makeGrudge({ id: 'g3', status: 'satisfied' }),
      makeGrudge({ id: 'g4', status: 'outstanding' }),
    ];
    const sorted = sortGrudges(grudges);
    expect(sorted[0].status).toBe('outstanding');
    expect(sorted[1].status).toBe('outstanding');
    expect(sorted[2].status).toBe('satisfied');
    expect(sorted[3].status).toBe('satisfied');
  });

  it('preserves relative order within same status group', () => {
    const grudges = [
      makeGrudge({ id: 'g1', status: 'satisfied' }),
      makeGrudge({ id: 'g2', status: 'outstanding' }),
      makeGrudge({ id: 'g3', status: 'outstanding' }),
    ];
    const sorted = sortGrudges(grudges);
    expect(sorted[0].id).toBe('g2');
    expect(sorted[1].id).toBe('g3');
    expect(sorted[2].id).toBe('g1');
  });

  it('returns empty array for empty input', () => {
    expect(sortGrudges([])).toEqual([]);
  });

  it('does not mutate the original array', () => {
    const grudges = [
      makeGrudge({ id: 'g1', status: 'satisfied' }),
      makeGrudge({ id: 'g2', status: 'outstanding' }),
    ];
    sortGrudges(grudges);
    expect(grudges[0].id).toBe('g1');
  });
});
