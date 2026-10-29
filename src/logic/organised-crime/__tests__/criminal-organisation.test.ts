import { describe, it, expect } from 'vitest';
import {
  CRIMINAL_ORGANISATION,
  CRIMINAL_ORGANISATION_ARTIFACT_NOTE,
} from '../criminal-organisation';

/**
 * Literal fixture test pinning the Criminal Organisation table (Deft Steps p.58)
 * verbatim, with the "CRIMINAL ENTERPRISES" header-leak tokens STRIPPED, so a
 * silent edit of the transcribed rules trips here.
 */
describe('Criminal Organisation table — verbatim (Deft Steps p.58)', () => {
  it('pins all four rows with the clean, artifact-stripped values', () => {
    expect(CRIMINAL_ORGANISATION).toEqual([
      {
        level: 1,
        costToGrow: '10/-',
        muscle: '2 Racketeers',
        resources: '2/-',
        influence: 'Clerk, Guild Journeyman',
        legalTrouble: 'Watchman',
      },
      {
        level: 2,
        costToGrow: '1 GC',
        muscle: '1d10 Racketeers',
        resources: '4/-',
        influence: 'Junior Official, Guildsman',
        legalTrouble: 'Watch Sergeant',
      },
      {
        level: 3,
        costToGrow: '10 GC',
        muscle: '2d10 Racketeers',
        resources: '1 GC',
        influence: 'City Official, Guild Master',
        legalTrouble: 'Watch Captain',
      },
      {
        level: 4,
        costToGrow: '100 GC',
        muscle: '4d10 Racketeers',
        resources: '4 GC',
        influence: 'Senior Official, Guild Chairman',
        legalTrouble: 'Judge',
      },
    ]);
  });

  it('contains no leaked page-header tokens in any cell', () => {
    for (const row of CRIMINAL_ORGANISATION) {
      for (const value of Object.values(row)) {
        const s = String(value);
        expect(s).not.toMatch(/CRIMINAL/);
        expect(s).not.toMatch(/ENTERPRISES?/);
        expect(s).not.toMatch(/PERKS/);
      }
    }
  });

  it('documents the stripped header-leak artifact', () => {
    expect(CRIMINAL_ORGANISATION_ARTIFACT_NOTE).toMatch(/CRIMINAL ENTERPRISES/);
    expect(CRIMINAL_ORGANISATION_ARTIFACT_NOTE).toMatch(/p\.58/);
  });
});
