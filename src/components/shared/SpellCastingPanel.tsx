import { useState } from 'react';
import type { Character, SpellItem, MagicSaturation } from '../../types/character';
import type { RollResult } from '../../logic/dice-roller';
import {
  computeCastingTarget,
  computeChannellingTarget,
  resolveCastingResult,
  resolveChannellingResult,
  lookupMiscast,
  getArmourCastingPenalty,
  formatDamageBreakdown,
  type CastingResult,
  type MiscastResult,
} from '../../logic/spell-casting';
import { hasSpellcastingTalent } from '../../logic/advancement';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { RollDialog } from '../shared/RollDialog';
import { CastResultDisplay } from './CastResultDisplay';
import { EmptyState } from '../shared/EmptyState';
import { CantPanel } from '../shared/CantPanel';
import { COLOUR_LORES } from '../../data/cants';
import { SPELL_LIST } from '../../data/spells';
import { Sparkles, Settings } from 'lucide-react';
import styles from './SpellCastingPanel.module.css';

export function SpellCard({ spell }: { spell: SpellItem }) {
  return (
    <article className={styles.spellCard} role="article" aria-label={`Spell: ${spell.name}`}>
      <header className={styles.cardHeader}>
        <span className={styles.spellName}>{spell.name}</span>
        <span className={styles.spellCN}>CN {spell.cn}</span>
      </header>
      <dl className={styles.cardFields}>
        <dt>Range</dt><dd>{spell.range}</dd>
        <dt>Target</dt><dd>{spell.target}</dd>
        <dt>Duration</dt><dd>{spell.duration}</dd>
        <dt>Effect</dt><dd>{spell.effect}</dd>
      </dl>
    </article>
  );
}

interface CompactSpellRowProps {
  spell: SpellItem;
  isExpanded: boolean;
  onToggle: () => void;
  canCast: boolean;
  onCast: () => void;
  onChannel: () => void;
  onCancelChannel: () => void;
  channelProgress: { accumulatedSL: number } | undefined;
  cn: number;
  isReady: boolean;
  damageBreakdown: string | null;
}

function CompactSpellRow({
  spell,
  isExpanded,
  onToggle,
  canCast,
  onCast,
  onChannel,
  onCancelChannel,
  channelProgress,
  cn,
  isReady,
  damageBreakdown,
}: CompactSpellRowProps) {
  const isPetty = spell.cn === '0' || spell.cn === '-';

  return (
    <div className={styles.compactSpellItem} role="button" aria-expanded={isExpanded}>
      <div className={styles.compactSpellHeader} onClick={onToggle}>
        <span className={isReady ? styles.spellNameReady : styles.spellNameDefault}>
          {spell.name}
        </span>
        <span className={styles.spellCN}>CN {spell.cn}</span>
        {isReady && <span className={styles.readyBadge}>Ready</span>}
        {channelProgress && channelProgress.accumulatedSL > 0 && !isReady && (
          <span className={styles.channelProgress}>
            {channelProgress.accumulatedSL} / {cn}
          </span>
        )}
      </div>

      {isExpanded && (
        <div className={styles.expandedDetails}>
          <dl className={styles.expandedMeta}>
            <dt>Range</dt><dd>{spell.range}</dd>
            <dt>Target</dt><dd>{spell.target}</dd>
            <dt>Duration</dt><dd>{spell.duration}</dd>
            <dt>Effect</dt>
            <dd>
              {spell.effect}
              {damageBreakdown && (
                <span className={styles.damageAnnotation}> {damageBreakdown}</span>
              )}
            </dd>
          </dl>

          {canCast && (
            <div className={styles.expandedActions}>
              <button
                type="button"
                className={styles.castBtn}
                onClick={(e) => { e.stopPropagation(); onCast(); }}
                aria-label={`Cast ${spell.name}`}
              >
                🎲 Cast
              </button>
              {!isPetty && (
                <button
                  type="button"
                  className={styles.channelBtn}
                  onClick={(e) => { e.stopPropagation(); onChannel(); }}
                  aria-label={`Channel ${spell.name}`}
                >
                  ⚡ Channel
                </button>
              )}
              {channelProgress && channelProgress.accumulatedSL > 0 && (
                <button
                  type="button"
                  className={styles.cancelChannelBtn}
                  onClick={(e) => { e.stopPropagation(); onCancelChannel(); }}
                  title="Cancel channelling"
                  aria-label={`Cancel channelling ${spell.name}`}
                >
                  ✕ Cancel
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SATURATION_LABELS: Record<MagicSaturation, string> = {
  low: 'Low',
  normal: 'Normal',
  heavy: 'Heavy',
  extreme: 'Extreme',
  corrupted: 'Corrupted',
};

const SATURATION_MODIFIERS: Record<MagicSaturation, string> = {
  low: '−1 SL on Casting/Channelling tests',
  normal: 'No modifier',
  heavy: '+1 SL for dominant Lore',
  extreme: '+2 SL dominant Lore / +1 SL other Lores',
  corrupted: 'Special — consult GM',
};

interface SpellCastingPanelProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  addRoll?: (result: RollResult) => void;
}

interface RollDialogInfo {
  name: string;
  baseTarget: number;
  spell: SpellItem;
  isChannelling: boolean;
}

/** Check if a character has at least one colour magic spell (matched against the static catalogue) */
function hasColourMagicSpell(character: Character): boolean {
  const colourLoreSet = new Set<string>(COLOUR_LORES);
  const colourSpellNames = new Set(
    SPELL_LIST.filter((s) => colourLoreSet.has(s.lore)).map((s) => s.name)
  );
  return character.spells.some((s) => colourSpellNames.has(s.name));
}

export function SpellCastingPanel({ character, update: _update, updateCharacter, addRoll }: SpellCastingPanelProps) {
  const [rollDialogState, setRollDialogState] = useState<RollDialogInfo | null>(null);
  const [castingResult, setCastingResult] = useState<CastingResult | null>(null);
  const [showManageSpells, setShowManageSpells] = useState(false);
  const [miscastResult, setMiscastResult] = useState<MiscastResult | null>(null);
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);
  const [saturationExpanded, setSaturationExpanded] = useState(false);

  const canCastSpells = hasSpellcastingTalent(character);

  // Gating: no talent and no spells — show message and return early
  if (!canCastSpells && character.spells.length === 0) {
    return (
      <Card>
        <SectionHeader icon={Sparkles} title="Spells & Prayers" />
        <div className={styles.noTalentMessage}>
          No spellcasting talent — acquire Arcane Magic, Petty Magic, Bless, or Invoke to use spells.
        </div>
      </Card>
    );
  }

  const memorizedSpells = character.spells.filter((s) => s.memorized);

  const getChannellingProgress = (spellName: string) => {
    return character.channellingProgress.find((cp) => cp.spellName === spellName);
  };

  const openCastDialog = (spell: typeof character.spells[number]) => {
    const baseTarget = computeCastingTarget(character);
    setRollDialogState({
      name: 'Language (Magick)',
      baseTarget,
      spell,
      isChannelling: false,
    });
  };

  const openChannelDialog = (spell: typeof character.spells[number]) => {
    const baseTarget = computeChannellingTarget(character);
    setRollDialogState({
      name: 'Channelling',
      baseTarget,
      spell,
      isChannelling: true,
    });
  };

  const cancelChannelling = (spellName: string) => {
    updateCharacter((c) => ({
      ...c,
      channellingProgress: c.channellingProgress.map((cp) =>
        cp.spellName === spellName ? { ...cp, accumulatedSL: 0 } : cp,
      ).filter((cp) => cp.spellName !== spellName),
    }));
  };

  const handleRollResult = (result: RollResult) => {
    if (!rollDialogState) return;
    const { spell, isChannelling } = rollDialogState;
    setRollDialogState(null);

    if (isChannelling) {
      // Channelling resolution
      const cn = parseInt(spell.cn, 10) || 0;
      const currentProgress = getChannellingProgress(spell.name)?.accumulatedSL ?? 0;
      const channelResult = resolveChannellingResult(result, currentProgress, cn, character);

      updateCharacter((c) => {
        const existing = c.channellingProgress.find((cp) => cp.spellName === spell.name);
        if (existing) {
          return {
            ...c,
            channellingProgress: c.channellingProgress.map((cp) =>
              cp.spellName === spell.name
                ? { ...cp, accumulatedSL: channelResult.accumulatedSL }
                : cp,
            ),
          };
        }
        return {
          ...c,
          channellingProgress: [
            ...c.channellingProgress,
            { spellName: spell.name, accumulatedSL: channelResult.accumulatedSL },
          ],
        };
      });
      addRoll?.(result);
    } else {
      // Casting resolution
      const cp = getChannellingProgress(spell.name);
      const cn = parseInt(spell.cn, 10) || 0;
      const isFullyChannelled = cp != null && cp.accumulatedSL >= cn && cn > 0;
      const options = isFullyChannelled ? { channelledCN: 0 } : undefined;

      const castResult = resolveCastingResult(result, spell, character, options);
      setCastingResult(castResult);
      addRoll?.(result);

      // Reset channelling on cast (success or failure) if was channelling
      if (isFullyChannelled) {
        updateCharacter((c) => ({
          ...c,
          channellingProgress: c.channellingProgress.filter((p) => p.spellName !== spell.name),
        }));
      }
    }
  };

  const handleCriticalChoice = (choice: 'critical_wound' | 'total_power' | 'unstoppable_force') => {
    if (!castingResult) return;

    if (choice === 'total_power') {
      const reResolved = resolveCastingResult(
        castingResult.rollResult,
        castingResult.spell,
        character,
        { totalPower: true },
      );
      setCastingResult(reResolved);
    } else if (choice === 'unstoppable_force') {
      const reResolved = resolveCastingResult(
        castingResult.rollResult,
        castingResult.spell,
        character,
        { unstoppableForce: true },
      );
      setCastingResult(reResolved);
    }
    // critical_wound: just display, no re-resolve needed
  };

  const handleMiscastRoll = (table: 'minor' | 'major') => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const entry = lookupMiscast(roll, table);
    setMiscastResult({ roll, entry });
  };

  const handleOvercastAllocated = () => {
    // Allocations are informational — just close
    setCastingResult(null);
    setMiscastResult(null);
  };

  const handleCloseCastResult = () => {
    setCastingResult(null);
    setMiscastResult(null);
  };

  const toggleMemorized = (spellIndex: number) => {
    updateCharacter((c) => ({
      ...c,
      spells: c.spells.map((s, i) =>
        i === spellIndex ? { ...s, memorized: !s.memorized } : s,
      ),
    }));
  };

  return (
    <>
      <Card>
        <SectionHeader
          icon={Sparkles}
          title="Spells & Prayers"
          action={
            canCastSpells ? (
              <button
                type="button"
                className={styles.manageIconBtn}
                onClick={() => setShowManageSpells(!showManageSpells)}
                title={showManageSpells ? 'Hide manage spells' : 'Manage Spells'}
                aria-label={showManageSpells ? 'Hide manage spells' : 'Manage Spells'}
                aria-pressed={showManageSpells}
              >
                <Settings size={16} />
              </button>
            ) : undefined
          }
        />

        {/* Read-only banner when character has spells but no spellcasting talent */}
        {!canCastSpells && (
          <div className={styles.readOnlyBanner}>
            Spellcasting talent required — spells shown in read-only mode.
          </div>
        )}

        {/* Armour casting penalty note */}
        {canCastSpells && (() => {
          const armourPenalty = getArmourCastingPenalty(character);
          return armourPenalty > 0 ? (
            <div className={styles.armourPenaltyNote}>
              ⚠️ Armour Penalty: −{armourPenalty} SL on Casting/Channelling tests (highest AP location: {armourPenalty} AP)
            </div>
          ) : null;
        })()}

        {/* Environmental Saturation — compact single-line, expands on tap */}
        {canCastSpells && (
          <div className={styles.saturationRow}>
            <button
              type="button"
              className={styles.saturationToggle}
              onClick={() => setSaturationExpanded(!saturationExpanded)}
              aria-expanded={saturationExpanded}
              aria-controls="saturation-selector"
            >
              <span className={styles.saturationLabel}>Magic Saturation:</span>
              <span className={styles.saturationValue}>
                {SATURATION_LABELS[character.sessionState.magicSaturation ?? 'normal']}
              </span>
              {(character.sessionState.magicSaturation ?? 'normal') !== 'normal' && (
                <span className={styles.saturationModifier}>
                  {SATURATION_MODIFIERS[character.sessionState.magicSaturation ?? 'normal']}
                </span>
              )}
            </button>
            {saturationExpanded && (
              <div id="saturation-selector" className={styles.saturationSelector}>
                {(Object.keys(SATURATION_LABELS) as MagicSaturation[]).map((level) => (
                  <button
                    key={level}
                    type="button"
                    className={`${styles.saturationOption} ${
                      (character.sessionState.magicSaturation ?? 'normal') === level
                        ? styles.saturationOptionActive
                        : ''
                    }`}
                    onClick={() => {
                      updateCharacter((c) => ({
                        ...c,
                        sessionState: { ...c.sessionState, magicSaturation: level },
                      }));
                      setSaturationExpanded(false);
                    }}
                  >
                    <span className={styles.saturationOptionLabel}>{SATURATION_LABELS[level]}</span>
                    <span className={styles.saturationOptionDesc}>{SATURATION_MODIFIERS[level]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Memorized spells list — compact with tap-to-expand */}
        {memorizedSpells.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            heading="No Spells"
            description={character.spells.length === 0
              ? "No spells on character sheet — add spells on the Character page (Abilities tab), then return here to memorize and cast them."
              : "No spells memorized — tap Manage Spells to toggle memorization."}
            action={character.spells.length > 0 && canCastSpells ? { label: 'Manage Spells', onClick: () => setShowManageSpells(true) } : undefined}
          />
        ) : (
          <div className={styles.compactSpellList}>
            {memorizedSpells.map((spell) => {
              const cp = getChannellingProgress(spell.name);
              const cn = parseInt(spell.cn, 10) || 0;
              const isReady = cp != null && cp.accumulatedSL >= cn && cn > 0;
              const wpChar = character.chars.WP;
              const wpBonus = Math.floor((wpChar.i + wpChar.a + wpChar.b) / 10);
              const tChar = character.chars.T;
              const tbBonus = Math.floor((tChar.i + tChar.a + tChar.b) / 10);
              const breakdown = formatDamageBreakdown(spell, wpBonus, tbBonus);

              return (
                <CompactSpellRow
                  key={spell.name}
                  spell={spell}
                  isExpanded={expandedSpell === spell.name}
                  onToggle={() => setExpandedSpell(expandedSpell === spell.name ? null : spell.name)}
                  canCast={canCastSpells}
                  onCast={() => openCastDialog(spell)}
                  onChannel={() => openChannelDialog(spell)}
                  onCancelChannel={() => cancelChannelling(spell.name)}
                  channelProgress={cp}
                  cn={cn}
                  isReady={isReady}
                  damageBreakdown={breakdown}
                />
              );
            })}
          </div>
        )}

        {/* Alternative Channelling Cants panel — shown when enabled and character has colour magic spells */}
        {character.houseRules.useCants && hasColourMagicSpell(character) && (
          <CantPanel
            character={character}
            updateCharacter={updateCharacter}
            currentRound={character.combatState.currentRound}
          />
        )}

        {/* Expandable memorization section (only when talent is present) */}
        {canCastSpells && showManageSpells && (
          <div className={styles.manageSection}>
            <div className={styles.manageSectionTitle}>
              Toggle Memorized Spells
            </div>
            {character.spells.length === 0 ? (
              <div className={styles.noSpells}>
                No spells on character sheet
              </div>
            ) : (
              character.spells.map((spell, i) => (
                <label key={spell.name + i} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={spell.memorized === true}
                    onChange={() => toggleMemorized(i)}
                    className={styles.checkboxInput}
                  />
                  <span className={spell.memorized ? styles.spellMemorized : styles.spellNotMemorized}>
                    {spell.name}
                  </span>
                  <span className={styles.spellCn}>
                    (CN {spell.cn})
                  </span>
                </label>
              ))
            )}
          </div>
        )}
      </Card>

      {/* Roll Dialog (only when talent is present) */}
      {canCastSpells && rollDialogState && (
        <RollDialog
          skillOrCharName={rollDialogState.name}
          baseTarget={rollDialogState.baseTarget}
          onRoll={handleRollResult}
          onClose={() => setRollDialogState(null)}
        />
      )}

      {/* Cast Result Display (only when talent is present) */}
      {canCastSpells && castingResult && (
        <CastResultDisplay
          castingResult={castingResult}
          character={character}
          miscastResult={miscastResult}
          onCriticalChoice={handleCriticalChoice}
          onMiscastRoll={handleMiscastRoll}
          onOvercastAllocated={handleOvercastAllocated}
          onArcaneMarkAcquired={(mark: string) => {
            updateCharacter((c) => ({
              ...c,
              arcaneMarks: [...(c.arcaneMarks ?? []), mark],
            }));
          }}
          onClose={handleCloseCastResult}
        />
      )}
    </>
  );
}
