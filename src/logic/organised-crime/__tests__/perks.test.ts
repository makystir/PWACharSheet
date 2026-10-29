import { describe, it, expect } from 'vitest';
import {
  PERKS_BY_LEVEL,
  PERKS_ARTIFACT_NOTE,
  SOURCE_HEADER_LAWYERS,
  PERKS_LAWYERS_DISPLAY_HEADER,
} from '../perks';

/**
 * Literal fixture test pinning the Perks by Organisation Level table (Deft Steps
 * p.63) verbatim, with the "CRIMINAL ENTERPRISE PERKS" header-leak tokens
 * STRIPPED, so a silent edit of the transcribed rules trips here. Also pins the
 * preserved source typo "Memebers" so the artifact can never be normalised away.
 */
describe('Perks by Organisation Level — verbatim (Deft Steps p.63)', () => {
  it('pins all four rows with the clean, artifact-stripped values', () => {
    expect(PERKS_BY_LEVEL).toEqual([
      {
        level: 1,
        contacts: 'Bawd, Racketeer',
        news: 'Plans of Public Areas',
        fence: 'Goods of a value of up to 10 GC per Month',
        lawyers: 'Trivial and Moderate Crimes',
      },
      {
        level: 2,
        contacts: 'Bawd, Charlatan, Fence, Racketeer',
        news: 'Schedules of Watch Patrols',
        fence: 'Goods of a value of up to 20 GC per Month',
        lawyers: 'Trivial and Moderate Crimes',
      },
      {
        level: 3,
        contacts: 'Bawd, Charlatan, Fence, Forger, Racketeer',
        news: 'Plans of Sewers and Notable Buildings',
        fence: 'Goods of a value of up to 40 GC per Month',
        lawyers: 'Trivial, Moderate and Serious Crimes',
      },
      {
        level: 4,
        contacts: 'All Contacts',
        news: 'Copied Keys, Friendly Insiders',
        fence: 'Goods of a value of up to 80 GC per Month',
        lawyers: 'All Crimes',
      },
    ]);
  });

  it('contains no leaked page-header tokens in any cell', () => {
    for (const row of PERKS_BY_LEVEL) {
      for (const value of Object.values(row)) {
        const s = String(value);
        expect(s).not.toMatch(/CRIMINAL/);
        expect(s).not.toMatch(/ENTERPRISES?/);
        expect(s).not.toMatch(/PERKS/);
      }
    }
  });

  it('preserves the verbatim source-header typo "Memebers"', () => {
    expect(SOURCE_HEADER_LAWYERS).toBe('Provide Lawyers for Memebers Accused of');
    // The display header is the corrected spelling.
    expect(PERKS_LAWYERS_DISPLAY_HEADER).toBe('Provide Lawyers for Members Accused of');
  });

  it('documents the stripped header-leak artifact', () => {
    expect(PERKS_ARTIFACT_NOTE).toMatch(/p\.63/);
    expect(PERKS_ARTIFACT_NOTE).toMatch(/Memebers/);
  });
});
