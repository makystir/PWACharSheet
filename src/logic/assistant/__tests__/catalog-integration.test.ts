import { describe, it, expect } from 'vitest';
import { BLANK_CHARACTER } from '../../../types/character';
import type { Character } from '../../../types/character';
import type { ActiveDisease } from '../../diseases';
import type { SuggestionAction, SuggestionContext } from '../types';
import { diseaseSuggestions } from '../rules/diseases';
import { fortuneResolveSuggestions } from '../rules/fortune-resolve';
import { criticalWoundSuggestions } from '../rules/critical-wounds';
import { learnableSuggestions } from '../rules/learnable';
import { downtimeSuggestions } from '../rules/downtime';
import { resolveReminderBaseTarget } from '../../reminders-target';
import { getSymptomTestBaseTarget } from '../../diseases';

function makeCharacter(overrides: Partial<Character> = {}): Character {
  return { ...structuredClone(BLANK_CHARACTER), ...overrides };
}

function disease(diseaseName: string): ActiveDisease {
  return { id: 1, diseaseName, contracted: 0, notes: '' };
}

const CTX_PEACE: SuggestionContext = { inCombat: false };

/** Real page/sub-tab pairs the corresponding pages actually honour. */
function assertValidRoute(action: SuggestionAction | undefined): void {
  if (!action || action.kind !== 'navigate') return;
  const route = `${action.page}:${action.subTab ?? ''}`;
  const valid = new Set(['combat:', 'character:notes', 'advancement:', 'endeavours:']);
  expect(valid.has(route)).toBe(true);
}

describe('catalog integration — seeded-roll base-target parity (Core p.187-188)', () => {
  it('Endurance disease: seeded def target equals getSymptomTestBaseTarget', () => {
    // Blood Rot's first symptom "Blight" → Endurance Test.
    const character = makeCharacter({ diseases: [disease('Blood Rot')] });
    const out = diseaseSuggestions(character);
    const action = out[0].action;
    expect(action.kind).toBe('roll');
    if (action.kind !== 'roll') return;
    const seeded = resolveReminderBaseTarget(character, action.test.def);
    const direct = getSymptomTestBaseTarget(character, 'Endurance');
    expect(seeded).toBe(direct);
  });

  it('Cool disease (Pox): seeded def target equals getSymptomTestBaseTarget', () => {
    const character = makeCharacter({ diseases: [disease('Itching Pox')] });
    const out = diseaseSuggestions(character);
    const action = out[0].action;
    expect(action.kind).toBe('roll');
    if (action.kind !== 'roll') return;
    const seeded = resolveReminderBaseTarget(character, action.test.def);
    const direct = getSymptomTestBaseTarget(character, 'Cool');
    expect(seeded).toBe(direct);
  });
});

describe('catalog integration — every emitted navigate route is real', () => {
  it('all new modules emit only valid page/sub-tab routes', () => {
    const character = makeCharacter({
      fortune: 1,
      resolve: 1,
      diseases: [disease('Blood Rot'), disease('The Yellow Skull')],
      criticalWounds: [
        { id: 1, timestamp: 0, location: 'Body', description: '', effects: '', duration: '', severity: 1, healed: false },
      ],
      endeavours: [],
      xpCur: 500,
      talents: [{ n: 'Petty Magic', lvl: 1, desc: '' }],
    });

    const all = [
      ...fortuneResolveSuggestions(character),
      ...diseaseSuggestions(character),
      ...criticalWoundSuggestions(character),
      ...learnableSuggestions(character, CTX_PEACE),
      ...downtimeSuggestions(character, CTX_PEACE),
    ];

    for (const s of all) {
      assertValidRoute(s.action);
      assertValidRoute(s.secondaryAction);
    }
  });
});
