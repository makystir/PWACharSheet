import type { Character, CharacteristicKey } from '../../types/character';
import { Tooltip } from '../shared/Tooltip';
import { SkillBreakdownContent } from './SkillBreakdownContent';
import { CBBreakdownContent } from './CBBreakdownContent';
import { EncumbranceBreakdownContent } from './EncumbranceBreakdownContent';
import { CoinWeightBreakdownContent } from './CoinWeightBreakdownContent';
import { TrappingsBreakdownContent } from './TrappingsBreakdownContent';
import {
  getSkillBreakdown,
  getCBBreakdown,
  getEncumbranceBreakdown,
  getCoinWeightBreakdown,
  getTrappingEncBreakdown,
} from '../../logic/breakdown-helpers';
import { CHAR_FULL_NAMES } from './characterConstants';

/**
 * Which "calculated total" breakdown tooltip is open, if any. Only one is shown
 * at a time (Req 6.3). Each variant carries the anchor element it points at.
 */
export type BreakdownTooltipState =
  | null
  | { type: 'skill'; index: number; anchorEl: HTMLElement }
  | { type: 'cb'; key: CharacteristicKey; anchorEl: HTMLElement }
  | { type: 'encumbrance'; anchorEl: HTMLElement }
  | { type: 'coinWeight'; anchorEl: HTMLElement }
  | { type: 'trappingEnc'; anchorEl: HTMLElement };

interface CharacterBreakdownTooltipsProps {
  breakdownTooltip: BreakdownTooltipState;
  character: Character;
  onClose: () => void;
}

/**
 * Renders the single active "how was this total calculated" tooltip for the
 * character sheet (skill total, characteristic bonus, max encumbrance, coin
 * weight, or carried-trappings encumbrance). Extracted from CharacterPage,
 * where these were five near-identical inline IIFEs.
 */
export function CharacterBreakdownTooltips({
  breakdownTooltip,
  character,
  onClose,
}: CharacterBreakdownTooltipsProps) {
  if (!breakdownTooltip) return null;

  if (breakdownTooltip.type === 'skill') {
    const isAdvanced = breakdownTooltip.index >= character.bSkills.length;
    const skill = isAdvanced
      ? character.aSkills[breakdownTooltip.index - character.bSkills.length]
      : character.bSkills[breakdownTooltip.index];
    if (!skill) return null;
    const breakdown = getSkillBreakdown(skill.c as CharacteristicKey, character.chars, skill.a);
    return (
      <Tooltip
        anchorEl={breakdownTooltip.anchorEl}
        title={`${skill.n} Breakdown`}
        onClose={onClose}
        id={`tooltip-breakdown-skill-${breakdownTooltip.index}`}
      >
        <SkillBreakdownContent {...breakdown} />
      </Tooltip>
    );
  }

  if (breakdownTooltip.type === 'cb') {
    const breakdown = getCBBreakdown(breakdownTooltip.key, character.chars);
    return (
      <Tooltip
        anchorEl={breakdownTooltip.anchorEl}
        title={`${CHAR_FULL_NAMES[breakdownTooltip.key]} CB`}
        onClose={onClose}
        id={`tooltip-breakdown-cb-${breakdownTooltip.key}`}
      >
        <CBBreakdownContent {...breakdown} />
      </Tooltip>
    );
  }

  if (breakdownTooltip.type === 'encumbrance') {
    const strongBackLevel = character.talents.find(t => t.n === 'Strong Back')?.lvl ?? 0;
    const sturdyLevel = character.talents.find(t => t.n === 'Sturdy')?.lvl ?? 0;
    const breakdown = getEncumbranceBreakdown(character.chars, strongBackLevel, sturdyLevel);
    return (
      <Tooltip
        anchorEl={breakdownTooltip.anchorEl}
        title="Max Encumbrance Breakdown"
        onClose={onClose}
        id="tooltip-breakdown-encumbrance"
      >
        <EncumbranceBreakdownContent {...breakdown} />
      </Tooltip>
    );
  }

  if (breakdownTooltip.type === 'coinWeight') {
    const breakdown = getCoinWeightBreakdown(character.wGC || 0, character.wSS || 0, character.wD || 0);
    return (
      <Tooltip
        anchorEl={breakdownTooltip.anchorEl}
        title="Coin Weight Breakdown"
        onClose={onClose}
        id="tooltip-breakdown-coinWeight"
      >
        <CoinWeightBreakdownContent {...breakdown} />
      </Tooltip>
    );
  }

  // breakdownTooltip.type === 'trappingEnc'
  const breakdown = getTrappingEncBreakdown(character.trappings, character.houseRules.ignoreBackpackEnc);
  return (
    <Tooltip
      anchorEl={breakdownTooltip.anchorEl}
      title="Trappings Encumbrance"
      onClose={onClose}
      id="tooltip-breakdown-trappingEnc"
    >
      <TrappingsBreakdownContent {...breakdown} />
    </Tooltip>
  );
}
