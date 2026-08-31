// Guards that every talent referenced by every career in CAREER_SCHEMES resolves to a
// TALENT_DB entry — via exact match, the TALENT_ALIASES map, or a specialisation base-name
// match (e.g. "Fearless (Undead)" resolves to the "Fearless" base). This catches typos or
// non-canonical talent names (e.g. "Strongminded", "Wellprepared", "Master Craftsman") that
// would otherwise silently fail tooltip/description resolution at runtime.
import { describe, it, expect } from 'vitest';
import { CAREER_SCHEMES } from '../careers';
import { TALENT_DB } from '../talents';
import { TALENT_ALIASES } from '../talent-aliases';

const dbNames = new Set(TALENT_DB.map((t) => t.name));
const dbBases = new Set(TALENT_DB.map((t) => t.name.split(' (')[0]));

const base = (n: string) => n.split(' (')[0];

function resolves(name: string): boolean {
  if (dbNames.has(name)) return true;
  const aliased = TALENT_ALIASES[name];
  if (aliased && (dbNames.has(aliased) || dbBases.has(base(aliased)))) return true;
  if (dbBases.has(base(name))) return true;
  return false;
}

describe('Career talent resolution', () => {
  it('every talent in every career resolves to TALENT_DB (exact/alias/specialisation base)', () => {
    const unresolved = new Map<string, string[]>();
    for (const [name, scheme] of Object.entries(CAREER_SCHEMES)) {
      const levels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5].filter(Boolean);
      for (const lvl of levels) {
        for (const t of lvl!.talents) {
          if (!resolves(t)) {
            const arr = unresolved.get(t) ?? [];
            if (!arr.includes(name)) arr.push(name);
            unresolved.set(t, arr);
          }
        }
      }
    }
    const report = [...unresolved.entries()].map(([t, careers]) => `"${t}" (in: ${careers.join(', ')})`);
    expect(report, `\nUnresolved career talents:\n${report.join('\n')}`).toEqual([]);
  });
});
