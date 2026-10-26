import type { Character } from '../../../types/character';
import type { CareerLevel } from '../../../types/character';
import type { Suggestion, SuggestionContext } from '../types';
import { getBonus } from '../../calculators';
import { CAREER_SCHEMES } from '../../../data/careers';
import { RITUAL_LIST } from '../../../data/rituals';
import {
  hasSpellcastingTalent,
  getSpellcastingTypes,
  countMemorizedByType,
  getSpellLearningCost,
  hasRitualMagicTalent,
  getCharacterLore,
  getCurrentLevelTalents,
  getAdvancementCost,
} from '../../advancement';

/**
 * Learnable-options-you-can-afford suggestion (Character Assistant catalog §4).
 * REUSES the advancement.ts eligibility + cost helpers verbatim — it never
 * recomputes a cost or reinvents eligibility. Emits ONE compact summary (not one
 * per option) listing only the affordable KINDS, to avoid noise.
 *
 * Out-of-combat ONLY: learning is a downtime/advancement activity and would be
 * noise mid-fight, so the module returns [] when `ctx.inCombat` is true.
 *
 * Costs come from advancement.ts (Core p.44-45 cost tables; Core p.140/142 spell
 * costs); current-level talent gating is Core p.47 ("Talents are only available
 * when you are in the level of the Career that lists them").
 */
export function learnableSuggestions(
  character: Character,
  ctx: SuggestionContext,
): Suggestion[] { // Core p.44-45 / p.47
  if (ctx.inCombat) return []; // downtime/advancement activity — suppressed in combat
  if (character.xpCur <= 0) return [];

  const xpCur = character.xpCur;
  const affordable: string[] = [];

  // ─── Spells / miracles (Core p.140/142 via getSpellLearningCost) ───────────
  if (hasSpellcastingTalent(character)) {
    const counts = countMemorizedByType(character);
    const wpBonus = getBonus(character.chars.WP.i + character.chars.WP.a + character.chars.WP.b);
    const intBonus = getBonus(character.chars.Int.i + character.chars.Int.a + character.chars.Int.b);
    for (const type of getSpellcastingTypes(character)) {
      // bonus = WPB for petty, IntB otherwise; miracle/chaos ignore it inside
      // getSpellLearningCost (mirrors AdvancementPage.handleLearnSpell).
      const bonus = type === 'petty' ? wpBonus : intBonus;
      const cost = getSpellLearningCost(type, counts[type], bonus);
      if (xpCur >= cost) {
        affordable.push(
          type === 'petty'
            ? 'a Petty spell'
            : type === 'arcane'
              ? 'an Arcane spell'
              : type === 'miracle'
                ? 'a Miracle'
                : 'a Chaos spell',
        );
        break; // one spell mention is enough for a summary
      }
    }
  }

  // ─── Rituals (filter predicate verbatim from AdvancementPage) ──────────────
  if (hasRitualMagicTalent(character)) {
    const characterLore = getCharacterLore(character);
    const learnedRitualNames = new Set((character.rituals ?? []).map(r => r.name));
    const hasAffordableRitual = RITUAL_LIST.some(r => {
      if (learnedRitualNames.has(r.name)) return false;
      let eligible = false;
      if (r.type === 'Any' || r.type === 'Any Lore') {
        eligible = true;
      } else if (r.type === 'Any Lore of the Eight Winds') {
        eligible = character.talents.some(t => t.n.startsWith('Arcane Magic'));
      } else if (characterLore) {
        eligible = r.type.includes(characterLore) || r.type.includes(`Lore of ${characterLore}`);
      }
      return eligible && xpCur >= r.learningXP;
    });
    if (hasAffordableRitual) affordable.push('a Ritual');
  }

  // ─── Talents (generic nudge; current-level candidates only, Core p.47) ─────
  const scheme = CAREER_SCHEMES[character.career];
  if (scheme) {
    const allLevels = [scheme.level1, scheme.level2, scheme.level3, scheme.level4, scheme.level5]
      .filter(Boolean) as CareerLevel[];
    const careerLevelNum = allLevels.findIndex(l => l.title === character.careerLevel) + 1;
    if (careerLevelNum > 0) {
      const candidates = getCurrentLevelTalents(character.career, careerLevelNum);
      const hasAffordableTalent = candidates.some(tn => {
        const owned = character.talents.find(
          t => t.n === tn || t.n.startsWith(tn + ' (') || tn.startsWith(t.n + ' ('),
        );
        const lvl = owned ? owned.lvl : 0;
        // Current-level career talents are always in-career (Core p.47).
        const cost = getAdvancementCost('talent', lvl, true);
        return xpCur >= cost;
      });
      if (hasAffordableTalent) affordable.push('an eligible Talent');
    }
  }

  if (affordable.length === 0) return [];

  return [
    {
      id: 'advancement:learnable',
      title: 'You can afford to learn something new',
      rationale: `You have XP for: ${formatList(affordable)}.`,
      category: 'advancement',
      urgency: 'info',
      action: { kind: 'navigate', page: 'advancement' },
      citation: 'Core p.44-45: Spell/Talent XP Costs',
    },
  ];
}

/** Join a short list with Oxford-style "and" for the summary prose. */
function formatList(items: string[]): string {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}
