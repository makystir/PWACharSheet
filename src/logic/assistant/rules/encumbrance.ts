import type { Character } from '../../../types/character';
import { calculateCarriedEncumbrance, calculateArmourEncumbrance } from '../../encumbrance';
import { calculateMaxEncumbrance, calculateCoinWeight } from '../../calculators';
import { getTrappingEncBreakdown, getEncumbranceBreakdown } from '../../breakdown-helpers';
import type { Suggestion } from '../types';

/**
 * Overburdened suggestion (FR-8.3). Reuses the shared encumbrance calculators —
 * `calculateCarriedEncumbrance` (current) and `calculateMaxEncumbrance` (max) —
 * so it never recomputes the mechanic a second way. The Strong Back / Sturdy
 * talent levels are read the SAME way sheet-totals.ts reads them.
 *
 * Core p.293 (Encumbrance): base max = SB + TB; p.146 Strong Back (+1/level) and
 * Sturdy (+2/level). A character whose carried Encumbrance exceeds their maximum
 * is Overburdened and suffers the p.293 penalties.
 */
export function encumbranceSuggestions(character: Character): Suggestion[] { // Core p.293
  // Talent levels read identically to sheet-totals.ts (single source of truth).
  const strongBackLevel = character.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
  const sturdyLevel = character.talents.find(t => t.n === 'Sturdy')?.lvl ?? 0;

  const max = calculateMaxEncumbrance(character.chars, strongBackLevel, sturdyLevel);
  const current = calculateCarriedEncumbrance(character);

  if (current <= max) return []; // emit iff current > max

  // Breakdown lines mirror the Gear-tab components, sourced from the shared
  // breakdown helpers — never recomputed in the UI (FR-11).
  const eW = character.weapons.reduce((s, w) => s + (parseFloat(w.enc) || 0), 0);
  const eA = character.armour.reduce((s, a) => s + calculateArmourEncumbrance(a.enc, a.worn), 0);
  const trappingBreakdown = getTrappingEncBreakdown(character.trappings, character.houseRules.ignoreBackpackEnc);
  const eCoin = calculateCoinWeight(character.wGC, character.wSS, character.wD);
  const maxBreakdown = getEncumbranceBreakdown(character.chars, strongBackLevel, sturdyLevel);

  return [
    {
      id: 'encumbrance:overburdened',
      title: 'You are Overburdened',
      rationale:
        'Your carried Encumbrance exceeds your maximum — reduce Movement by 1 and suffer the Overburdened penalties (Core p.293).',
      category: 'encumbrance',
      urgency: 'critical',
      action: { kind: 'navigate', page: 'character', subTab: 'gear' },
      citation: 'Core p.293: Overburdened',
      totals: [
        {
          label: 'Encumbrance',
          display: `${current} / ${max}`,
          lines: [
            `Weapons ${eW}`,
            `Armour ${eA}`,
            `Trappings ${trappingBreakdown.total}`,
            `Coins ${eCoin}`,
            `Max SB ${maxBreakdown.sb} + TB ${maxBreakdown.tb} + Strong Back ${maxBreakdown.strongBackLevel} + Sturdy ${maxBreakdown.sturdyLevel}×2 = ${maxBreakdown.total}`,
          ],
        },
      ],
    },
  ];
}
