import type { Character } from '../../../types/character';
import type { ActiveDisease } from '../../diseases';
import { getDiseaseSymptoms, getSymptomTest, getDiseaseProgress, type SymptomTest } from '../../diseases';
import type { Suggestion } from '../types';

/**
 * Active-disease-needing-attention suggestions (Character Assistant catalog §2).
 * REUSES the already-cited `diseases.ts` helpers (`getDiseaseSymptoms`,
 * `getSymptomTest`, `getDiseaseProgress`) — it invents no mechanic and only
 * surfaces what those helpers computed.
 *
 * Core p.186 (Using Diseases: Incubation/Duration) and Core p.187-188 (Disease
 * Symptoms): a symptom may call for a recurring Endurance or Cool Test; the
 * skill/difficulty/cadence come straight from `getSymptomTest`.
 *
 * Emission (noise control): one suggestion per DISTINCT active disease name.
 * `addDisease` enforces no uniqueness on `diseaseName`, so same-name records are
 * collapsed (order-preserving) to keep a single stable `id` per name. When
 * same-name records differ in progress, the most-progressed record (largest
 * `elapsedDays`, first-in-array on a tie) drives the `durationReached`
 * escalation so a due test is never hidden behind a duplicate.
 *
 * A roll-backed disease (first symptom whose `getSymptomTest` is non-null) seeds
 * the symptom Test via the shared reminder shape (primary), with a navigate to
 * the Diseases panel as the secondary. A non-roll disease navigates to the panel
 * only.
 */

/** Lethal symptom cadences (verbatim from diseases.ts) that escalate to critical. */
const LETHAL_CADENCES = new Set<string>([
  'Daily (or die)', // Blight (Core p.187)
  'Daily (fail > TB times = lose location)', // Gangrene (Core p.187)
]);

/** Deterministic slug from a disease name so the `id` is stable across saves. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** The most-progressed record among same-name diseases (ties: first in order). */
function mostProgressed(records: ActiveDisease[]): ActiveDisease {
  return records.reduce((best, d) =>
    (d.elapsedDays ?? 0) > (best.elapsedDays ?? 0) ? d : best,
  );
}

export function diseaseSuggestions(character: Character): Suggestion[] { // Core p.186-188
  const diseases = character.diseases ?? [];
  if (diseases.length === 0) return [];

  // Collapse to distinct disease names, order-preserving (Core p.186-188 copy
  // is name-derived, so same-name duplicates would be pure noise).
  const seen = new Set<string>();
  const distinctNames: string[] = [];
  for (const d of diseases) {
    if (!seen.has(d.diseaseName)) {
      seen.add(d.diseaseName);
      distinctNames.push(d.diseaseName);
    }
  }

  const out: Suggestion[] = [];
  for (const diseaseName of distinctNames) {
    const records = diseases.filter(d => d.diseaseName === diseaseName);
    const record = mostProgressed(records);
    const durationReached = getDiseaseProgress(record).durationReached;
    const slug = slugify(diseaseName);

    // Find the first symptom that calls for a recurring Test. Pass the base
    // symptom name + severity (NOT displayName, whose severity suffix never
    // matches the getSymptomTest switch).
    const symptoms = getDiseaseSymptoms(diseaseName) ?? [];
    let symptomTest: SymptomTest | null = null;
    for (const s of symptoms) {
      const test = getSymptomTest(s.name, s.severity);
      if (test) {
        symptomTest = test;
        break;
      }
    }

    if (symptomTest) {
      const lethal = LETHAL_CADENCES.has(symptomTest.cadence);
      out.push({
        // Core p.187-188: Disease Symptoms (recurring Test); Core p.186 when progress drives it.
        id: `health:disease:${slug}`,
        title: `${diseaseName}: ${symptomTest.skill} Test (${symptomTest.cadence})`,
        rationale: `A ${symptomTest.difficulty} ${symptomTest.skill} Test is due (${symptomTest.cadence}).`,
        category: 'health',
        urgency: durationReached || lethal ? 'critical' : 'recommended',
        // Primary: seeded symptom Test, reusing the reminder test shape exactly
        // as corruption.ts/reminders.ts do (no new roll math).
        action: {
          kind: 'roll',
          test: {
            def: {
              kind: 'skill',
              skillName: symptomTest.skill,
              fallbackChar: symptomTest.skill === 'Endurance' ? 'T' : 'WP',
            },
            difficulty: symptomTest.difficulty,
            rollName: `${symptomTest.skill} (${diseaseName})`,
          },
        },
        // Secondary: view the Diseases panel (DiseasePanel lives on character/notes).
        secondaryAction: { kind: 'navigate', page: 'character', subTab: 'notes' },
        citation: durationReached
          ? 'Core p.186: Using Diseases'
          : 'Core p.187-188: Disease Symptoms',
      });
    } else {
      out.push({
        // Core p.186-188: Using Diseases (flat effects / GM-triggered — no self-contained roll).
        id: `health:disease:${slug}`,
        title: `${diseaseName}: review disease progress`,
        rationale: 'This disease has no recurring Test of its own — review its progress and effects.',
        category: 'health',
        urgency: durationReached ? 'recommended' : 'info',
        action: { kind: 'navigate', page: 'character', subTab: 'notes' },
        citation: 'Core p.186-188: Using Diseases',
      });
    }
  }

  return out;
}
