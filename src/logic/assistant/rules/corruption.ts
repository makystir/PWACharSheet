import type { Character } from '../../../types/character';
import { getCorruptionThreshold, getPureSoulLevel } from '../../corruption';
import { getBonus } from '../../calculators';
import type { Suggestion } from '../types';

/**
 * Corruption-Test-due suggestion (FR-8.4). Reuses `getCorruptionThreshold`
 * (TB + WPB + Pure Soul) and `getPureSoulLevel` — the engine does not recompute
 * the threshold a second way.
 *
 * Core p.183 (Corrupting): a character gains a Corruption point; when their
 * Corruption exceeds WPB + TB they must immediately attempt a Challenging (+0)
 * Endurance Test to resist corrupting (a mutation is rolled only on a failure).
 * Pure Soul talent (Core p.182): allows extra Corruption points equal to its
 * level before a Test is required — i.e. it raises the trigger point, which the
 * app models as getCorruptionThreshold(chars, pureSoul) = TB + WPB + Pure Soul.
 *
 * The trigger is a strict `>` (Core p.183: a Test is due once Corruption is
 * MORE THAN the threshold), consistent with getCorruptionStatus's danger band.
 */
export function corruptionSuggestions(character: Character): Suggestion[] { // Core p.183 + Pure Soul p.182
  const pureSoul = getPureSoulLevel(character.talents);
  const threshold = getCorruptionThreshold(character.chars, pureSoul); // TB + WPB + Pure Soul
  const corr = character.corr;

  if (!(corr > threshold)) return []; // strict > per Core p.183

  const TB = getBonus(character.chars.T.i + character.chars.T.a + character.chars.T.b);
  const WPB = getBonus(character.chars.WP.i + character.chars.WP.a + character.chars.WP.b);

  return [
    {
      id: 'corruption:test-due',
      title: 'Corruption Test due',
      rationale:
        'You have more Corruption than your WPB + TB (+ Pure Soul) — attempt a Challenging (+0) Endurance Test to resist corrupting (Core p.183).',
      category: 'corruption',
      urgency: 'critical',
      // Primary: seeded Challenging (+0) Endurance Test (Core p.183).
      action: {
        kind: 'roll',
        test: {
          def: { kind: 'skill', skillName: 'Endurance', fallbackChar: 'T' },
          difficulty: 'Challenging',
          rollName: 'Endurance (resist Corruption)',
        },
      },
      // Secondary: view the Corruption panel (CorruptionCard lives on
      // character/notes — there is no 'corruption' PageSection).
      secondaryAction: { kind: 'navigate', page: 'character', subTab: 'notes' },
      citation: 'Core p.183: Corrupting (+ Pure Soul talent, p.182)',
      totals: [
        {
          label: 'Corruption',
          display: `${corr} / ${threshold}`,
          lines: [`TB ${TB}`, `WPB ${WPB}`, `Pure Soul ${pureSoul}`],
        },
      ],
    },
  ];
}
