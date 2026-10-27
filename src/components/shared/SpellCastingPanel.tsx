import { useEffect, useImperativeHandle, useReducer, useState, type Ref } from 'react';
import type { Character, SpellItem, MagicSaturation, FieldPath, FieldValue } from '../../types/character';
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
import { guidedCastReducer, initialGuidedCastState } from '../../logic/guided-cast/reducer';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { RollDialog } from '../shared/RollDialog';
import { CastResultDisplay } from './CastResultDisplay';
import { GuidedCastTrigger } from './GuidedCastTrigger';
import { GuidedCastPanel } from './GuidedCastPanel';
import { EmptyState } from '../shared/EmptyState';
import { CantPanel } from '../shared/CantPanel';
import { HelpPopover } from '../shared/HelpPopover';
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
  onGuide: () => void;
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
  onGuide,
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
              {/* Opt-in guided-cast trigger — the ONLY new default-render element. */}
              <GuidedCastTrigger onOpen={onGuide} />
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

/**
 * Imperative seam for the (opt-in) guided-cast overlay. Each method delegates to
 * the panel's existing private handlers so the guide drives the SAME casting /
 * channelling / critical / miscast logic as the normal flow (no forked math).
 * There is intentionally NO read-back method: results reach the guide only via
 * the onCastResolved / onOvercastResolved push callbacks below.
 */
export interface SpellCastingGuideHandle {
  openCast(spell: SpellItem): void;
  openChannel(spell: SpellItem): void;
  chooseCritical(choice: 'critical_wound' | 'total_power' | 'unstoppable_force'): void;
  rollMiscast(table: 'minor' | 'major'): void;
  dismissResult(): void;
}

interface SpellCastingPanelProps {
  character: Character;
  update: <P extends FieldPath<Character>>(field: P, value: FieldValue<Character, P>) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  addRoll?: (result: RollResult) => void;
  /** Opt-in guided-cast seam. All default-path behaviour is unchanged when these are absent. */
  guideHandleRef?: Ref<SpellCastingGuideHandle>;
  onCastResolved?: (result: CastingResult) => void;
  onOvercastResolved?: (allocations: Record<string, number>) => void;
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

export function SpellCastingPanel({ character, update: _update, updateCharacter, addRoll, guideHandleRef, onCastResolved, onOvercastResolved }: SpellCastingPanelProps) {
  const [rollDialogState, setRollDialogState] = useState<RollDialogInfo | null>(null);
  const [castingResult, setCastingResult] = useState<CastingResult | null>(null);
  const [showManageSpells, setShowManageSpells] = useState(false);
  const [miscastResult, setMiscastResult] = useState<MiscastResult | null>(null);
  const [expandedSpell, setExpandedSpell] = useState<string | null>(null);
  const [saturationExpanded, setSaturationExpanded] = useState(false);

  // Opt-in guided-cast flow. The panel OWNS the reducer; the overlay only
  // renders while a spell is bound (guideSpellName != null). When off (the
  // default), this adds exactly one trigger per memorized row and nothing else.
  const [guideState, dispatchGuide] = useReducer(guidedCastReducer, initialGuidedCastState);
  const [guideSpellName, setGuideSpellName] = useState<string | null>(null);

  const canCastSpells = hasSpellcastingTalent(character);

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
      onCastResolved?.(castResult);
      // Push the resolved result into the guide reducer (single authoritative
      // push path — the guide never reads back a stale handle value).
      if (guideSpellName) dispatchGuide({ kind: 'castResolved', result: castResult });
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
      onCastResolved?.(reResolved);
      if (guideSpellName) dispatchGuide({ kind: 'castResolved', result: reResolved });
    } else if (choice === 'unstoppable_force') {
      const reResolved = resolveCastingResult(
        castingResult.rollResult,
        castingResult.spell,
        character,
        { unstoppableForce: true },
      );
      setCastingResult(reResolved);
      onCastResolved?.(reResolved);
      if (guideSpellName) dispatchGuide({ kind: 'castResolved', result: reResolved });
    }
    // critical_wound: just display, no re-resolve needed — do NOT fire onCastResolved
  };

  const handleMiscastRoll = (table: 'minor' | 'major') => {
    const roll = Math.floor(Math.random() * 100) + 1;
    const entry = lookupMiscast(roll, table);
    setMiscastResult({ roll, entry });
    if (guideSpellName) dispatchGuide({ kind: 'miscastCompleted' });
  };

  const handleOvercastAllocated = (allocations: Record<string, number>) => {
    if (onOvercastResolved) {
      // Guided-cast seam: forward allocations and keep the result alive
      // (the guide owns dismissal); do NOT close the result here.
      onOvercastResolved(allocations);
      return;
    }
    // Default path: allocations are informational — just close.
    setCastingResult(null);
    setMiscastResult(null);
  };

  const handleCloseCastResult = () => {
    setCastingResult(null);
    setMiscastResult(null);
  };

  // ── Guided-cast wiring (opt-in). The panel owns the reducer and drives its
  // OWN private handlers from the overlay callbacks — no forked logic. ──
  const guideSpell = guideSpellName != null
    ? memorizedSpells.find((s) => s.name === guideSpellName) ?? null
    : null;
  const guideActive = guideSpell != null;

  const openGuide = (spell: SpellItem) => {
    setGuideSpellName(spell.name);
    dispatchGuide({ kind: 'start', spellName: spell.name });
  };

  const closeGuide = () => {
    setGuideSpellName(null);
    dispatchGuide({ kind: 'reset' });
    // Clear any cast state the guide was hosting so nothing persists after close.
    setCastingResult(null);
    setMiscastResult(null);
  };

  // Step 2 Cast: record the route, advance to 'resolve', and open the EXISTING
  // cast RollDialog (the guide renders no dice).
  const handleGuideOpenCast = () => {
    if (!guideSpell) return;
    dispatchGuide({ kind: 'chooseRoute', route: 'cast' });
    dispatchGuide({ kind: 'goto', step: 'resolve' });
    openCastDialog(guideSpell);
  };

  // Step 2 Channel: record the route and open the EXISTING channel RollDialog.
  const handleGuideOpenChannel = () => {
    if (!guideSpell) return;
    dispatchGuide({ kind: 'chooseRoute', route: 'channel' });
    openChannelDialog(guideSpell);
  };

  // Step 4 allocator confirm: capture allocations into the reducer and keep the
  // result alive (the guide owns dismissal).
  const handleGuideOvercastResolved = (allocations: Record<string, number>) => {
    dispatchGuide({ kind: 'overcastResolved', allocations });
  };

  const handleArcaneMarkAcquired = (mark: string) => {
    updateCharacter((c) => ({
      ...c,
      arcaneMarks: [...(c.arcaneMarks ?? []), mark],
    }));
  };

  // Reset the guide if the bound spell is un-memorized / removed while open.
  // Mirrors the sanctioned set-state-in-effect pattern (Tooltip.tsx / CombatPage.tsx):
  // this reacts to an external data change (the character's spell list), not to
  // our own render output.
  useEffect(() => {
    if (guideSpellName != null && !memorizedSpells.some((s) => s.name === guideSpellName)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuideSpellName(null);
      dispatchGuide({ kind: 'reset' });
    }
  }, [guideSpellName, memorizedSpells]);

  // Opt-in guided-cast seam: expose an imperative handle delegating to the
  // panel's existing handlers so the guide drives the SAME logic (no fork).
  // Declared after the handlers it references (avoids access-before-declare).
  // No deps array: the factory re-runs each render so the handle always
  // delegates to the latest handler closures (avoids stale casting state).
  useImperativeHandle(guideHandleRef, (): SpellCastingGuideHandle => ({
    openCast: (spell) => openCastDialog(spell),
    openChannel: (spell) => openChannelDialog(spell),
    chooseCritical: (choice) => handleCriticalChoice(choice),
    rollMiscast: (table) => handleMiscastRoll(table),
    dismissResult: () => handleCloseCastResult(),
  }));

  const toggleMemorized = (spellIndex: number) => {
    updateCharacter((c) => ({
      ...c,
      spells: c.spells.map((s, i) =>
        i === spellIndex ? { ...s, memorized: !s.memorized } : s,
      ),
    }));
  };

  // Gating: no talent and no spells — show message and return early.
  // (After all hooks, so hook order stays stable across renders.)
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

        {/* Contextual help for Channelling */}
        {canCastSpells && (
          <HelpPopover concept="channelling">
            Channelling lets you accumulate SL over multiple rounds before casting. Once accumulated SL meets the spell's CN, you can cast it without needing to meet the CN again.
          </HelpPopover>
        )}

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
                  onGuide={() => openGuide(spell)}
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

      {/* Cast Result Display (only when talent is present). Suppressed while the
          guide is open so exactly one aria-modal dialog is ever active — the
          guide hosts the allocator/miscast controls in-body (design MEDIUM-2). */}
      {canCastSpells && !guideActive && castingResult && (
        <CastResultDisplay
          castingResult={castingResult}
          character={character}
          miscastResult={miscastResult}
          onCriticalChoice={handleCriticalChoice}
          onMiscastRoll={handleMiscastRoll}
          onOvercastAllocated={handleOvercastAllocated}
          onOvercastResolved={onOvercastResolved}
          onArcaneMarkAcquired={handleArcaneMarkAcquired}
          onClose={handleCloseCastResult}
        />
      )}

      {/* Guided Cast overlay (opt-in). YIELDS while the RollDialog is open so the
          RollDialog is the single top aria-modal and the guide's trap/backdrop
          go inert, resuming when the dialog closes (design MEDIUM-2). */}
      {canCastSpells && guideActive && guideSpell && rollDialogState == null && (
        <GuidedCastPanel
          state={guideState}
          dispatch={dispatchGuide}
          character={character}
          spell={guideSpell}
          armourPenalty={getArmourCastingPenalty(character)}
          saturation={character.sessionState.magicSaturation ?? 'normal'}
          miscastResult={miscastResult}
          onOpenCast={handleGuideOpenCast}
          onOpenChannel={handleGuideOpenChannel}
          onChooseCritical={handleCriticalChoice}
          onRollMiscast={handleMiscastRoll}
          onOvercastResolved={handleGuideOvercastResolved}
          onArcaneMarkAcquired={handleArcaneMarkAcquired}
          onClose={closeGuide}
        />
      )}
    </>
  );
}
