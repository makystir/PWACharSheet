// Validates that every career's per-level `characteristics` in CAREER_SCHEMES matches the
// authoritative advance-scheme transcription in careeradvanceschemes.json.
//
// careeradvanceschemes.json uses tier notation: "T1".."T5" indicates the career level at which
// a characteristic first becomes available for in-career advances. Because the app models each
// career level's `characteristics` array as the CUMULATIVE set of in-career characteristics
// available at that level, the expected set at level N is every characteristic whose tier <= N.
//
// The JSON was manually transcribed from the rulebook advance-scheme tables (which are images in
// the PDFs and cannot be OCR'd reliably), and is treated as the source of truth for advance schemes.
import { describe, it, expect } from 'vitest';
import { CAREER_SCHEMES } from '../careers';
import schemesJson from '../careeradvanceschemes.json';

const TIER_KEYS = ['WS', 'BS', 'S', 'T', 'I', 'Agi', 'Dex', 'Int', 'WP', 'Fel'] as const;
// The JSON uses "Agi" for Agility; CAREER_SCHEMES uses "Ag".
const JSON_TO_APP: Record<string, string> = { Agi: 'Ag' };

// Some advanced careers are entered at level 2 (their JSON T1 is null). For these, the app's
// level1 corresponds to JSON tier T2, so the level→tier mapping is offset by one.
const OFFSET_CAREERS = new Set(['Smith-Priest of Vaul', 'Storm Weaver', 'Loremaster of Hoeth']);

type Scheme = Record<string, string | null>;

// The JSON nests careers as careers[class][career] but also has some top-level careers[career].
function flattenSchemes(): Record<string, Scheme> {
  const flat: Record<string, Scheme> = {};
  const root = (schemesJson as { careers: Record<string, unknown> }).careers;
  for (const [key, val] of Object.entries(root)) {
    if (val && typeof val === 'object' && 'advance_scheme' in (val as object)) {
      flat[key] = (val as { advance_scheme: Scheme }).advance_scheme;
    } else if (val && typeof val === 'object') {
      for (const [cName, cVal] of Object.entries(val as Record<string, unknown>)) {
        if (cVal && typeof cVal === 'object' && 'advance_scheme' in (cVal as object)) {
          flat[cName] = (cVal as { advance_scheme: Scheme }).advance_scheme;
        }
      }
    }
  }
  return flat;
}

function expectedCumulative(name: string, scheme: Scheme, appLevel: number): string[] {
  const jsonLevel = OFFSET_CAREERS.has(name) ? appLevel + 1 : appLevel;
  const out: string[] = [];
  for (const k of TIER_KEYS) {
    const t = scheme[k];
    if (!t) continue;
    const tierNum = parseInt(t.replace('T', ''), 10);
    if (tierNum <= jsonLevel) out.push(JSON_TO_APP[k] ?? k);
  }
  return out;
}

describe('Advance scheme consistency (CAREER_SCHEMES vs careeradvanceschemes.json)', () => {
  const flat = flattenSchemes();

  it('every JSON career name resolves to a career in CAREER_SCHEMES', () => {
    const unmatched = Object.keys(flat).filter((name) => !CAREER_SCHEMES[name]);
    expect(unmatched, `JSON careers with no matching CAREER_SCHEMES entry: ${unmatched.join(', ')}`).toEqual([]);
  });

  it('each career level lists exactly the characteristics whose advance-scheme tier <= that level', () => {
    const problems: string[] = [];
    for (const [name, scheme] of Object.entries(flat)) {
      const app = CAREER_SCHEMES[name];
      if (!app) continue; // covered by the test above
      const appLevels = [app.level1, app.level2, app.level3, app.level4, app.level5].filter(Boolean);
      for (let i = 0; i < appLevels.length; i++) {
        const level = i + 1;
        const exp = expectedCumulative(name, scheme, level);
        const got = appLevels[i]!.characteristics as string[];
        const missing = exp.filter((c) => !got.includes(c));
        const extra = got.filter((c) => !exp.includes(c));
        if (missing.length) problems.push(`${name} L${level} missing: ${missing.join(', ')} (has [${got.join(',')}])`);
        if (extra.length) problems.push(`${name} L${level} extra: ${extra.join(', ')} (has [${got.join(',')}])`);
      }
    }
    expect(problems, `\n${problems.join('\n')}`).toEqual([]);
  });
});
