import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  parseGroupedName,
  buildGroupedName,
  specialiseName,
  inGroup,
  getSkillGroup,
  parseRequirement,
  isPlaceholderName,
  satisfiesRequirement,
  assignSlots,
} from '../grouped-names';
import { getCareerLevelOptions } from '../careers';
import { CAREER_SCHEMES } from '../../data/careers';
import { SPECIES_DATA } from '../../data/species';
import { ADV_SKILL_DB, SKILL_GROUPS } from '../../data/advanced-skills';
import { BLANK_CHARACTER } from '../../types/character';

// ─── parseGroupedName ────────────────────────────────────────────────────────

describe('parseGroupedName', () => {
  it('splits a grouped name into group and specialisation', () => {
    expect(parseGroupedName('Language (Magick)')).toEqual({ base: 'Language', spec: 'Magick' });
    expect(parseGroupedName('Hatred (Orcs and Goblins)')).toEqual({ base: 'Hatred', spec: 'Orcs and Goblins' });
  });

  it('returns no specialisation for an ungrouped name', () => {
    expect(parseGroupedName('Athletics')).toEqual({ base: 'Athletics', spec: null });
    expect(parseGroupedName('Read/Write')).toEqual({ base: 'Read/Write', spec: null });
  });

  it('tolerates missing, extra and inner spacing', () => {
    expect(parseGroupedName('Channelling(Aqshy)')).toEqual({ base: 'Channelling', spec: 'Aqshy' });
    expect(parseGroupedName('  Language   ( Magick ) ')).toEqual({ base: 'Language', spec: 'Magick' });
  });

  it('treats empty parentheses as no specialisation (basic "Stealth ()" row)', () => {
    expect(parseGroupedName('Stealth ()')).toEqual({ base: 'Stealth', spec: null });
    expect(parseGroupedName('Melee ()')).toEqual({ base: 'Melee', spec: null });
  });

  it('maps known spellings and capitalisation of a skill group to its canonical name', () => {
    expect(parseGroupedName('Channeling (Hysh)')).toEqual({ base: 'Channelling', spec: 'Hysh' });
    expect(parseGroupedName('channelling (hysh)')).toEqual({ base: 'Channelling', spec: 'hysh' });
    expect(parseGroupedName('language (Battle)').base).toBe('Language');
  });

  it('leaves an unknown group name as written', () => {
    expect(parseGroupedName('Etiquette (Nobles)')).toEqual({ base: 'Etiquette', spec: 'Nobles' });
  });
});

describe('buildGroupedName / specialiseName / inGroup', () => {
  it('builds the canonical form', () => {
    expect(buildGroupedName('Language', 'Battle')).toBe('Language (Battle)');
    expect(buildGroupedName('Channelling', null)).toBe('Channelling');
  });

  it('fills a placeholder with the chosen specialisation', () => {
    expect(specialiseName('Language (Any)', 'Battle')).toBe('Language (Battle)');
    expect(specialiseName('Art (Calligraphy or Engraving)', 'Engraving')).toBe('Art (Engraving)');
    expect(specialiseName('Channelling (Any Colour)', 'Homebrew Wind')).toBe('Channelling (Homebrew Wind)');
  });

  it('accepts a full name or the bare group as the choice', () => {
    expect(specialiseName('Language (Any)', 'Language (Battle)')).toBe('Language (Battle)');
    expect(specialiseName('Channelling (Any Colour)', 'Channelling')).toBe('Channelling');
  });

  it('writes the canonical group spelling and tidies the typed text', () => {
    expect(specialiseName('Channeling (Any Colour)', '  Aqshy ')).toBe('Channelling (Aqshy)');
    expect(specialiseName('Arcane Magic (Any Arcane Lore)', 'Fire (Bright)')).toBe('Arcane Magic (Fire Bright)');
  });

  it('getSkillGroup finds a group by any known spelling and ignores built-in object properties', () => {
    expect(getSkillGroup('Channelling')?.c).toBe('WP');
    expect(getSkillGroup('channeling')?.c).toBe('WP');
    expect(getSkillGroup('Etiquette')).toBeUndefined();
    expect(getSkillGroup('constructor')).toBeUndefined();
    expect(getSkillGroup('toString')).toBeUndefined();
  });

  it('inGroup ignores the specialisation, spacing and spelling', () => {
    expect(inGroup('Channelling (Hysh)', 'Channelling')).toBe(true);
    expect(inGroup('Channeling(Hysh)', 'Channelling')).toBe(true);
    expect(inGroup('Channelling', 'Channelling')).toBe(true);
    expect(inGroup('Stealth ()', 'Stealth')).toBe(true);
    expect(inGroup('Language (Magick)', 'Channelling')).toBe(false);
  });
});

// ─── parseRequirement ────────────────────────────────────────────────────────

describe('parseRequirement', () => {
  it('reads a name without specialisation as bare', () => {
    expect(parseRequirement('Channelling')).toMatchObject({ base: 'Channelling', kind: 'bare', options: [] });
  });

  it.each([
    'Language (Any)',
    'Lore (Any One)',
    'Channelling (Any Colour)',
    'Arcane Magic (Any Arcane Lore)',
  ])('reads "%s" as a wildcard', (entry) => {
    expect(parseRequirement(entry).kind).toBe('any');
  });

  it('reads "(A or B)" as a choice', () => {
    expect(parseRequirement('Art (Calligraphy or Engraving)')).toMatchObject({
      base: 'Art', kind: 'oneOf', options: ['Calligraphy', 'Engraving'],
    });
  });

  it('reads "(A, B, or C)" as a choice of three', () => {
    expect(parseRequirement('Trade (Blacksmith, Goldsmith, or Engineer)')).toMatchObject({
      base: 'Trade', kind: 'oneOf', options: ['Blacksmith', 'Goldsmith', 'Engineer'],
    });
  });

  it('reads a single specialisation as exact, including one that contains "and"', () => {
    expect(parseRequirement('Language (Magick)')).toMatchObject({ kind: 'exact', options: ['Magick'] });
    expect(parseRequirement('Hatred (Orcs and Goblins)')).toMatchObject({ kind: 'exact', options: ['Orcs and Goblins'] });
  });

  it('does not mistake a specialisation that merely starts with "any" letters for a wildcard', () => {
    expect(parseRequirement('Lore (Anything)').kind).toBe('exact');
  });

  it('isPlaceholderName is true only for wildcard and choice names', () => {
    expect(isPlaceholderName('Language (Any)')).toBe(true);
    expect(isPlaceholderName('Play (Drum or Fife)')).toBe(true);
    expect(isPlaceholderName('Language (Magick)')).toBe(false);
    expect(isPlaceholderName('Channelling')).toBe(false);
    expect(isPlaceholderName('Stealth ()')).toBe(false);
    expect(isPlaceholderName('')).toBe(false);
  });
});

// ─── satisfiesRequirement ────────────────────────────────────────────────────

describe('satisfiesRequirement', () => {
  it.each([
    // bare entry: any or no specialisation of the group
    ['Channelling', 'Channelling', true],
    ['Channelling', 'Channelling (Dhar)', true],
    ['Stealth', 'Stealth ()', true],
    ['Channelling', 'Language (Magick)', false],
    // wildcard entry: any or no specialisation, homebrew and odd spelling included
    ['Language (Any)', 'Language (Bretonnian)', true],
    ['Language (Any)', 'Language (Homebrew Tongue)', true],
    ['Channelling (Any Colour)', 'Channelling (Qhaysh)', true],
    ['Channelling (Any Colour)', 'Channelling (Homebrew Wind)', true],
    ['Channelling (Any Colour)', 'Channelling', true],
    ['Channelling (Any Colour)', 'Channeling(Aqshy)', true],
    ['Stealth (Any)', 'Stealth ()', true],
    ['Art (Any)', 'Art (Calligraphy or Engraving)', true],
    ['Language (Any)', 'Lore (Magic)', false],
    ['Language (Any)', '', false],
    // choice entry: only the listed specialisations
    ['Art (Calligraphy or Engraving)', 'Art (Engraving)', true],
    ['Art (Calligraphy or Engraving)', 'Art (Painting)', false],
    ['Trade (Blacksmith, Goldsmith, or Engineer)', 'Trade (Goldsmith)', true],
    ['Trade (Blacksmith, Goldsmith, or Engineer)', 'Trade (Engineer)', true],
    ['Trade (Blacksmith, Goldsmith, or Engineer)', 'Trade (Cook)', false],
    ['Melee (Basic or Two-handed)', 'Melee (Two-Handed)', true],
    ['Play (Drum or Fife)', 'Play (Drum or Fife)', true],
    ['Play (Drum or Fife)', 'Play (Fife or Drum)', true],
    ['Stealth (Rural or Urban)', 'Stealth (Underground or Urban)', false],
    ['Stealth (Rural or Urban)', 'Stealth ()', false],
    ['Art (Calligraphy or Engraving)', 'Art (Any)', false],
    // exact entry: that specialisation only
    ['Language (Magick)', 'Language (Magick)', true],
    ['Language (Magick)', 'language (magick)', true],
    ['Language (Magick)', 'Language (Battle)', false],
    ['Language (Magick)', 'Language (Any)', false],
    ['Language (Magick)', 'Language', false],
    ['Melee (Basic)', 'Melee ()', false],
  ])('entry "%s" vs owned "%s" -> %s', (entry, owned, expected) => {
    expect(satisfiesRequirement(entry, owned)).toBe(expected);
  });

  it('with bareOwnedSatisfiesSpecific, a name without specialisation counts for a specific entry', () => {
    const lenient = { bareOwnedSatisfiesSpecific: true };
    expect(satisfiesRequirement('Strider (Woodlands)', 'Strider', lenient)).toBe(true);
    expect(satisfiesRequirement('Acute Sense (Taste or Touch)', 'Acute Sense', lenient)).toBe(true);
    expect(satisfiesRequirement('Strider (Woodlands)', 'Strider (Marshes)', lenient)).toBe(false);
    expect(satisfiesRequirement('Strider (Woodlands)', 'Strider')).toBe(false);
  });

  it('never consults a list of known specialisations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom('Language', 'Channelling', 'Lore', 'Etiquette', 'Made Up Group'),
        fc.stringMatching(/^[A-Za-z][A-Za-z' -]{0,18}[A-Za-z]$/).filter(s => !/^any\b/i.test(s) && !/\sor\s/i.test(s)),
        (group, spec) => {
          expect(satisfiesRequirement(`${group} (Any)`, `${group} (${spec})`)).toBe(true);
          expect(satisfiesRequirement(`${group} (${spec})`, `${group} (${spec})`)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

// ─── assignSlots ─────────────────────────────────────────────────────────────

describe('assignSlots', () => {
  it('a specific entry is only filled by its own specialisation; the wildcard takes another', () => {
    const entries = ['Language (Any)', 'Language (Magick)'];
    expect(assignSlots(entries, ['Language (Magick)'])).toEqual([-1, 0]);
    expect(assignSlots(entries, ['Language (Bretonnian)', 'Language (Tilean)'])).toEqual([0, -1]);
    expect(assignSlots(entries, ['Language (Bretonnian)', 'Language (Magick)'])).toEqual([0, 1]);
  });

  it('counts Channelling specialisations against the wildcard and Qhaysh against its own entry', () => {
    const entries = ['Channelling (Any Colour)', 'Channelling (Qhaysh)'];
    expect(assignSlots(entries, ['Channelling (Qhaysh)'])).toEqual([-1, 0]);
    expect(assignSlots(entries, ['Channelling (Aqshy)', 'Channelling (Azyr)'])).toEqual([0, -1]);
    expect(assignSlots(entries, ['Channelling (Aqshy)', 'Channelling (Qhaysh)'])).toEqual([0, 1]);
    expect(assignSlots(entries, ['Channelling'])).toEqual([0, -1]);
  });

  it('re-routes an earlier assignment when that fills one more entry', () => {
    const entries = ['Art (Calligraphy or Engraving)', 'Art (Engraving or Painting)'];
    expect(assignSlots(entries, ['Art (Engraving)', 'Art (Calligraphy)'])).toEqual([1, 0]);
  });

  it('returns -1 everywhere when nothing is owned', () => {
    expect(assignSlots(['Language (Any)', 'Cool'], [])).toEqual([-1, -1]);
    expect(assignSlots([], ['Cool'])).toEqual([]);
  });

  const entryArb = fc.uniqueArray(
    fc.constantFrom(
      'Language (Any)', 'Language (Magick)', 'Language (Battle)', 'Language (Estalian or Tilean)',
      'Melee (Any)', 'Melee (Basic)', 'Melee (Basic or Two-handed)',
      'Channelling', 'Channelling (Any Colour)', 'Channelling (Qhaysh)',
      'Cool', 'Dodge',
    ),
    { maxLength: 7 },
  );
  const ownedArb = fc.uniqueArray(
    fc.constantFrom(
      'Language (Magick)', 'Language (Battle)', 'Language (Tilean)', 'Language (Homebrew Tongue)',
      'Melee (Basic)', 'Melee (Two-Handed)', 'Melee (Polearm)', 'Melee ()',
      'Channelling', 'Channelling (Aqshy)', 'Channelling (Qhaysh)',
      'Cool', 'Dodge', 'Athletics',
    ),
    { maxLength: 7 },
  );

  /** Largest number of entries that can be filled, by exhaustive search. */
  function bruteForceMax(entries: string[], owned: string[], from = 0, used = new Set<number>()): number {
    if (from >= entries.length) return 0;
    let best = bruteForceMax(entries, owned, from + 1, used);
    owned.forEach((name, i) => {
      if (used.has(i) || !satisfiesRequirement(entries[from], name)) return;
      used.add(i);
      best = Math.max(best, 1 + bruteForceMax(entries, owned, from + 1, used));
      used.delete(i);
    });
    return best;
  }

  it('Property: every assignment is valid and no owned name is used twice', () => {
    fc.assert(
      fc.property(entryArb, ownedArb, (entries, owned) => {
        const filledBy = assignSlots(entries, owned);
        expect(filledBy).toHaveLength(entries.length);
        const used = filledBy.filter(i => i !== -1);
        expect(new Set(used).size).toBe(used.length);
        filledBy.forEach((i, e) => {
          if (i !== -1) expect(satisfiesRequirement(entries[e], owned[i])).toBe(true);
        });
      }),
      { numRuns: 300 },
    );
  });

  it('Property: the number of filled entries is the largest possible', () => {
    fc.assert(
      fc.property(entryArb, ownedArb, (entries, owned) => {
        const filled = assignSlots(entries, owned).filter(i => i !== -1).length;
        expect(filled).toBe(bruteForceMax(entries, owned));
      }),
      { numRuns: 300 },
    );
  });

  it('Property: owning one more skill never lowers the count', () => {
    fc.assert(
      fc.property(entryArb, ownedArb, fc.constantFrom('Language (Norse)', 'Melee (Flail)', 'Channelling (Hysh)', 'Gossip'), (entries, owned, extra) => {
        const before = assignSlots(entries, owned).filter(i => i !== -1).length;
        const after = assignSlots(entries, [...owned, extra]).filter(i => i !== -1).length;
        expect(after).toBeGreaterThanOrEqual(before);
      }),
      { numRuns: 300 },
    );
  });
});

// ─── Guards over the game data ───────────────────────────────────────────────
// These fail loudly when new career or species data uses a naming form the
// grammar does not read, instead of the entry silently never matching.

describe('game data follows the grouped-name grammar', () => {
  const careerLevels = Object.keys(CAREER_SCHEMES).flatMap(name =>
    getCareerLevelOptions(name).map(level => ({ where: `${name} / ${level.title}`, level })),
  );
  const careerEntries = careerLevels.flatMap(({ where, level }) =>
    [...level.skills, ...level.talents].map(entry => ({ where, entry })),
  );

  it('has career data to check', () => {
    expect(careerEntries.length).toBeGreaterThan(1000);
  });

  it('every career skill and talent entry reads as a group with a well-formed specialisation', () => {
    const offenders = careerEntries.filter(({ entry }) => {
      const req = parseRequirement(entry);
      if (req.base === '' || /[()]/.test(req.base)) return true;          // unbalanced or nested parentheses
      if (req.kind === 'oneOf' && req.options.length < 2) return true;    // a choice of one
      if (req.kind === 'exact' && req.options[0].includes(',')) return true; // a list the grammar did not split
      return false;
    });
    expect(offenders).toEqual([]);
  });

  it('every entry is satisfied by a specialisation built from it', () => {
    const offenders = careerEntries.filter(({ entry }) => {
      const req = parseRequirement(entry);
      const samples =
        req.kind === 'any' ? [buildGroupedName(req.base, 'Homebrew')]
        : req.kind === 'bare' ? [req.base, buildGroupedName(req.base, 'Homebrew')]
        : req.options.map(o => buildGroupedName(req.base, o));
      return !samples.every(sample => satisfiesRequirement(entry, sample));
    });
    expect(offenders).toEqual([]);
  });

  it('every grouped skill in career and species data has a linked characteristic on record', () => {
    const skills = [
      ...careerLevels.flatMap(({ where, level }) => level.skills.map(entry => ({ where, entry }))),
      ...Object.entries(SPECIES_DATA).flatMap(([species, data]) => data.skills.map(entry => ({ where: species, entry }))),
    ];
    // Without one of these, the characteristic would silently default to Int:
    // an exact skill row, a SKILL_GROUPS row, the same skill unspecialised
    // ("Drive" for "Drive (Skycutter)"), or another specialisation of the group.
    const offenders = skills.filter(({ entry }) => {
      const { base, spec } = parseGroupedName(entry);
      if (spec === null) return false;
      return !ADV_SKILL_DB.some(s => s.n === entry)
        && SKILL_GROUPS[base] === undefined
        && !ADV_SKILL_DB.some(s => s.n === base)
        && !BLANK_CHARACTER.bSkills.some(s => s.n === base)
        && !ADV_SKILL_DB.some(s => s.n.startsWith(base + ' ('));
    });
    expect(offenders).toEqual([]);
  });
});
