import type { Character } from '../types/character';

/**
 * Keys for the optional sheet sections that are only rendered when the
 * character has relevant data (and any gating house rule is enabled).
 *
 * Extracted VERBATIM from the former module-private copy in
 * src/components/layout/PrintLayout.tsx so the print sheet and the GM viewer
 * share one source of truth for section visibility (AC2 "reuse, don't fork").
 */
export type SectionKey =
  | 'spells' | 'companions' | 'mutations' | 'criticalWounds'
  | 'hirelings' | 'enterprises' | 'grudgeBook' | 'psychologyTraits'
  | 'rituals' | 'yenlui' | 'estate' | 'conditions' | 'ammunition';

/**
 * Whether the given optional section should be rendered for this character.
 * Copied verbatim from PrintLayout.tsx (no behaviour change); PrintLayout now
 * imports this function instead of keeping its own copy.
 */
export function shouldRenderSection(character: Character, key: SectionKey): boolean {
  switch (key) {
    case 'spells': return character.spells.length > 0;
    case 'companions': return character.companions.length > 0;
    case 'mutations': return character.mutations.length > 0;
    case 'criticalWounds': return character.criticalWounds.length > 0;
    case 'hirelings': return character.hirelings.length > 0;
    case 'enterprises':
      return character.houseRules.useEnterprises && (character.enterprises?.length ?? 0) > 0;
    case 'grudgeBook':
      return character.houseRules.useGrudgeBook && (character.grudges?.length ?? 0) > 0;
    case 'psychologyTraits':
      return character.houseRules.usePsychologyTracker && (character.psychologyTraits?.length ?? 0) > 0;
    case 'rituals': return (character.rituals?.length ?? 0) > 0;
    case 'yenlui': return character.houseRules.useYenlui;
    case 'estate': return character.estate.name.length > 0;
    case 'conditions': return character.conditions.filter(c => c.level > 0).length > 0;
    case 'ammunition': return character.ammo.length > 0;
  }
}
