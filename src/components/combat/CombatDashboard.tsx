import { useState, useEffect, useCallback, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { Character, CombatState, Condition } from '../../types/character';
import type { FortuneSpendReason, ResolveSpendReason } from '../../logic/fortune-resolve';
import { CONDITIONS } from '../../data/conditions';
import { CONDITION_COLORS, CONDITION_COLOR_FALLBACK, getConditionIntensity } from '../../data/condition-colors';
import { resolveConditionTooltip } from '../../logic/tooltip-content';
import { processEndOfTurn, type EndOfTurnResult } from '../../logic/end-of-turn';
import { Tooltip } from '../shared/Tooltip';
import { InitiativeTracker } from './InitiativeTracker';
import { Heart, Zap, Star, Shield, AlertTriangle, Skull } from 'lucide-react';
import styles from './CombatDashboard.module.css';

/** Get brief effect text for a condition */
function getConditionEffectText(conditionName: string): string {
  const cond = CONDITIONS.find((c) => c.name === conditionName);
  return cond?.effects ?? '';
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface CombatDashboardProps {
  wCur: number;
  totalWounds: number;
  advantage: number;
  combatState: CombatState;
  conditions: Condition[];
  fortune: number;
  fate: number;
  resolve: number;
  resilience: number;
  inCombat: boolean;
  useGroupAdvantage?: boolean;
  character?: Character;
  updateCharacter?: (mutator: (char: Character) => Character) => void;
  onUpdateWounds: (delta: number) => void;
  onUpdateAdvantage: (delta: number) => void;
  onUpdateRound: (delta: number) => void;
  onToggleEngaged: () => void;
  onRemoveCondition: (name: string) => void;
  onSpendFortune: (reason: FortuneSpendReason) => void;
  onSpendResolve: (reason: ResolveSpendReason) => void;
  onOpenConditionPicker: () => void;
  onEndTurn?: (result: EndOfTurnResult) => void;
}

// ─── Fortune / Resolve spend reasons ─────────────────────────────────────────

const FORTUNE_REASONS: FortuneSpendReason[] = ['Reroll', 'Add +1 SL', 'Special Ability'];
const RESOLVE_REASONS: ResolveSpendReason[] = ['Immunity to Psychology', 'Remove Conditions', 'Special Ability'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

export type WoundThreshold = 'healthy' | 'caution' | 'danger' | 'critical';

export function getWoundThreshold(wCur: number, totalWounds: number): WoundThreshold {
  if (totalWounds <= 0) return 'critical';
  if (wCur <= 0) return 'critical';
  const pct = (wCur / totalWounds) * 100;
  if (pct > 50) return 'healthy';
  if (pct > 25) return 'caution';
  return 'danger';
}

function getWoundColor(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return 'var(--success)';
    case 'caution': return 'var(--accent-gold)';
    case 'danger': return 'var(--danger)';
    case 'critical': return 'var(--danger)';
  }
}

function getWoundPct(wCur: number, totalWounds: number): number {
  if (totalWounds <= 0) return 0;
  return Math.max(0, Math.min(100, (wCur / totalWounds) * 100));
}

function getWoundClass(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return styles.woundHigh;
    case 'caution': return styles.woundMedium;
    case 'danger': return `${styles.woundLow} ${styles.woundDangerPulse}`;
    case 'critical': return `${styles.woundLow} ${styles.woundCritical}`;
  }
}

function getProgressFillClass(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return styles.progressFillHigh;
    case 'caution': return styles.progressFillMedium;
    case 'danger': return styles.progressFillLow;
    case 'critical': return styles.progressFillLow;
  }
}

function getWoundSectionClass(wCur: number, totalWounds: number): string {
  const threshold = getWoundThreshold(wCur, totalWounds);
  switch (threshold) {
    case 'healthy': return styles.woundsSection;
    case 'caution': return `${styles.woundsSection} ${styles.woundsSectionCaution}`;
    case 'danger': return `${styles.woundsSection} ${styles.woundsSectionDanger}`;
    case 'critical': return `${styles.woundsSection} ${styles.woundsSectionCritical}`;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CombatDashboard(props: CombatDashboardProps) {
  const {
    wCur, totalWounds, advantage, combatState, conditions,
    fortune, fate, resolve, resilience, inCombat, useGroupAdvantage,
    character, updateCharacter,
    onUpdateWounds, onUpdateAdvantage, onUpdateRound,
    onToggleEngaged, onRemoveCondition,
    onSpendFortune, onSpendResolve, onOpenConditionPicker,
    onEndTurn,
  } = props;

  const [conditionTooltip, setConditionTooltip] = useState<{ name: string; anchorEl: HTMLElement } | null>(null);
  const [showFortunePopover, setShowFortunePopover] = useState(false);
  const [showResolvePopover, setShowResolvePopover] = useState(false);
  const [expandedCondition, setExpandedCondition] = useState<string | null>(null);
  const [endTurnSummary, setEndTurnSummary] = useState<EndOfTurnResult | null>(null);

  // ── State change transition tracking (Req 14) ──
  const prevWoundsRef = useRef(wCur);
  const prevAdvantageRef = useRef(advantage);
  const prevConditionNamesRef = useRef<Set<string>>(new Set(conditions.map((c) => c.name)));
  const [woundBump, setWoundBump] = useState(false);
  const [advantageBump, setAdvantageBump] = useState(false);
  const [enteringConditions, setEnteringConditions] = useState<Set<string>>(new Set());
  const [exitingConditions, setExitingConditions] = useState<Condition[]>([]);

  // Detect wound changes and trigger bump animation
  useEffect(() => {
    if (prevWoundsRef.current !== wCur) {
      prevWoundsRef.current = wCur;
      setWoundBump(true);
      const timer = setTimeout(() => setWoundBump(false), 250);
      return () => clearTimeout(timer);
    }
  }, [wCur]);

  // Detect advantage changes and trigger bump animation
  useEffect(() => {
    if (prevAdvantageRef.current !== advantage) {
      prevAdvantageRef.current = advantage;
      setAdvantageBump(true);
      const timer = setTimeout(() => setAdvantageBump(false), 250);
      return () => clearTimeout(timer);
    }
  }, [advantage]);

  // Detect condition additions and removals for animations
  useEffect(() => {
    const currentNames = new Set(conditions.map((c) => c.name));
    const prevNames = prevConditionNamesRef.current;

    // Newly added conditions
    const added = new Set<string>();
    for (const name of currentNames) {
      if (!prevNames.has(name)) {
        added.add(name);
      }
    }

    // Removed conditions — find ones in prev but not current
    const removed: Condition[] = [];
    for (const name of prevNames) {
      if (!currentNames.has(name)) {
        // Reconstruct a minimal condition for exit animation
        removed.push({ name, level: 1 });
      }
    }

    if (added.size > 0) {
      setEnteringConditions(added);
      const timer = setTimeout(() => setEnteringConditions(new Set()), 250);
      // Clean up on next change
      prevConditionNamesRef.current = currentNames;
      return () => clearTimeout(timer);
    }

    if (removed.length > 0) {
      setExitingConditions(removed);
      const timer = setTimeout(() => setExitingConditions([]), 250);
      prevConditionNamesRef.current = currentNames;
      return () => clearTimeout(timer);
    }

    prevConditionNamesRef.current = currentNames;
  }, [conditions]);

  // Clear initiative list when combat ends (Req 19.7)
  const prevInCombatRef = useRef(inCombat);
  useEffect(() => {
    if (prevInCombatRef.current && !inCombat && updateCharacter) {
      updateCharacter((char) => ({
        ...char,
        initiativeList: [],
        activeInitiativeIndex: 0,
      }));
    }
    prevInCombatRef.current = inCombat;
  }, [inCombat, updateCharacter]);

  // Close popovers on outside click
  const handleDocClick = useCallback(() => {
    setShowFortunePopover(false);
    setShowResolvePopover(false);
  }, []);

  useEffect(() => {
    if (showFortunePopover || showResolvePopover) {
      // Delay to avoid closing immediately from the same click
      const timer = setTimeout(() => {
        document.addEventListener('click', handleDocClick);
      }, 0);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('click', handleDocClick);
      };
    }
  }, [showFortunePopover, showResolvePopover, handleDocClick]);

  const woundColor = getWoundColor(wCur, totalWounds);
  const woundPct = getWoundPct(wCur, totalWounds);
  const woundClass = getWoundClass(wCur, totalWounds);
  const progressClass = getProgressFillClass(wCur, totalWounds);
  const woundThreshold = getWoundThreshold(wCur, totalWounds);
  const woundSectionClass = getWoundSectionClass(wCur, totalWounds);

  // ── End Turn handler (Req 8) ──
  const handleEndTurn = useCallback(() => {
    // Compute Toughness Bonus from character characteristics
    const tb = character
      ? Math.floor((character.chars.T.i + character.chars.T.a + character.chars.T.b) / 10)
      : 0;

    // Compute lowest AP across body locations (excluding shield)
    const lowestAP = character
      ? Math.min(character.ap.head, character.ap.lArm, character.ap.rArm, character.ap.body, character.ap.lLeg, character.ap.rLeg)
      : 0;

    const result = processEndOfTurn({
      currentWounds: wCur,
      conditions,
      currentRound: combatState.currentRound,
      tb,
      lowestAP,
    });
    // Show summary
    setEndTurnSummary(result);
    // Apply effects via parent callbacks
    if (onEndTurn) {
      onEndTurn(result);
    } else {
      // Fallback: apply via individual callbacks
      const woundDelta = result.newWounds - wCur;
      if (woundDelta !== 0) onUpdateWounds(woundDelta);
      for (const name of result.removedConditions) {
        onRemoveCondition(name);
      }
      onUpdateRound(1);
    }
    // Auto-dismiss summary after 5 seconds
    setTimeout(() => setEndTurnSummary(null), 5000);
  }, [wCur, conditions, combatState.currentRound, character, onEndTurn, onUpdateWounds, onRemoveCondition, onUpdateRound]);

  // Sticky positioning remains inline because tests assert on style.position
  const stickyStyle: CSSProperties | undefined = inCombat
    ? { position: 'sticky', top: 0, zIndex: 50 }
    : undefined;

  return (
    <div className={styles.dashboard} style={stickyStyle} data-testid="combat-dashboard">
      <div className={styles.mainRow}>
        {/* ── Wounds ── */}
        <div className={woundSectionClass} data-wound-threshold={woundThreshold}>
          <div className={styles.iconLabel}>
            {woundThreshold === 'critical' ? (
              <Skull size={14} color={woundColor} aria-hidden="true" />
            ) : woundThreshold === 'caution' ? (
              <AlertTriangle size={14} color={woundColor} aria-hidden="true" />
            ) : (
              <Heart size={14} color={woundColor} aria-hidden="true" />
            )}
            <span className={styles.label}>Wounds</span>
          </div>
          <div className={styles.woundNumbers}>
            <span className={`${styles.bigNumber} ${woundClass} ${styles.numberTransition}${woundBump ? ` ${styles.numberBump}` : ''}`}>{wCur}</span>
            <span className={styles.woundTotal}>/ {totalWounds}</span>
          </div>
          <div className={styles.progressBar}>
            <div
              data-testid="wound-progress"
              className={progressClass}
              style={{ '--wound-pct': `${woundPct}%` } as CSSProperties}
            />
          </div>
          <div className={styles.btnRow}>
            <button
              type="button"
              aria-label="Decrease wounds"
              onClick={() => onUpdateWounds(-1)}
              className={styles.tapButtonDecrease}
            >−</button>
            <button
              type="button"
              aria-label="Increase wounds"
              onClick={() => onUpdateWounds(1)}
              className={styles.tapButtonIncrease}
            >+</button>
            <button
              type="button"
              aria-label="Full wounds"
              onClick={() => onUpdateWounds(totalWounds - wCur)}
              className={styles.smallTapButton}
            >Full</button>
          </div>
          {wCur <= 0 && (
            <div data-testid="down-alert" className={styles.downAlert}>⚠ Down!</div>
          )}
        </div>

        {/* ── Advantage (combat only) ── */}
        {inCombat && (
          <div className={styles.fixedSection}>
            <div className={styles.iconLabel}>
              <Zap size={14} color="var(--accent-gold)" />
              <span className={styles.label}>{useGroupAdvantage ? 'Group Advantage' : 'Advantage'}</span>
            </div>
            <span className={`${styles.bigNumber} ${styles.accentGold} ${styles.numberTransition}${advantageBump ? ` ${styles.numberBump}` : ''}`}>{advantage}</span>
            <div className={styles.btnRow}>
              <button
                type="button"
                aria-label="Decrease advantage"
                onClick={() => onUpdateAdvantage(-1)}
                className={styles.tapButton}
              >−</button>
              <button
                type="button"
                aria-label="Increase advantage"
                onClick={() => onUpdateAdvantage(1)}
                className={styles.tapButton}
              >+</button>
              <button
                type="button"
                aria-label="Reset advantage"
                onClick={() => onUpdateAdvantage(-advantage)}
                className={styles.smallTapButton}
              >Reset</button>
            </div>
          </div>
        )}

        {/* ── Round Counter (combat only) ── */}
        {inCombat && (
          <div className={styles.fixedSection}>
            <span className={styles.label}>Round</span>
            <span className={`${styles.bigNumber} ${styles.accentGold}`}>{combatState.currentRound}</span>
            <div className={styles.btnRow}>
              <button
                type="button"
                aria-label="Decrease round"
                onClick={() => onUpdateRound(-1)}
                className={styles.tapButton}
              >−</button>
              <button
                type="button"
                aria-label="Increase round"
                onClick={() => onUpdateRound(1)}
                className={styles.tapButton}
              >+</button>
            </div>
          </div>
        )}

        {/* ── Engaged Toggle (combat only) ── */}
        {inCombat && (
          <div className={styles.engagedSection}>
            <button
              type="button"
              aria-label={combatState.engaged ? 'Disengage' : 'Engage'}
              onClick={onToggleEngaged}
              className={combatState.engaged ? styles.engagedBtnActive : styles.engagedBtnInactive}
            >
              {combatState.engaged ? '⚔ Engaged' : 'Not Engaged'}
            </button>
          </div>
        )}

        {/* ── Fortune / Resolve compact display ── */}
        <div className={styles.fortuneResolveRow}>
          {/* Fortune */}
          <div className={styles.sectionRelative}>
            <div className={styles.iconLabelSmall}>
              <Star size={12} color="var(--accent-gold)" />
              <span className={styles.label}>Fortune</span>
            </div>
            <button
              type="button"
              aria-label="Toggle fortune popover"
              onClick={(e) => {
                e.stopPropagation();
                setShowFortunePopover((v) => !v);
                setShowResolvePopover(false);
              }}
              className={fortune > 0 ? styles.fortuneBtnActive : styles.fortuneBtnInactive}
            >
              {fortune}<span className={styles.fortuneSuffix}>/{fate}</span>
            </button>
            {showFortunePopover && (
              <div className={styles.popover} onClick={(e) => e.stopPropagation()} data-testid="fortune-popover">
                <div className={styles.popoverLabel}>Spend Fortune</div>
                <div className={styles.popoverList}>
                  {FORTUNE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={fortune <= 0}
                      className={fortune <= 0 ? styles.spendBtnDisabled : styles.spendBtn}
                      onClick={() => {
                        onSpendFortune(reason);
                        setShowFortunePopover(false);
                      }}
                    >{reason}</button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Resolve */}
          <div className={styles.sectionRelative}>
            <div className={styles.iconLabelSmall}>
              <Shield size={12} color="var(--accent-gold)" />
              <span className={styles.label}>Resolve</span>
            </div>
            <button
              type="button"
              aria-label="Toggle resolve popover"
              onClick={(e) => {
                e.stopPropagation();
                setShowResolvePopover((v) => !v);
                setShowFortunePopover(false);
              }}
              className={resolve > 0 ? styles.fortuneBtnActive : styles.fortuneBtnInactive}
            >
              {resolve}<span className={styles.fortuneSuffix}>/{resilience}</span>
            </button>
            {showResolvePopover && (
              <div className={styles.popover} onClick={(e) => e.stopPropagation()} data-testid="resolve-popover">
                <div className={styles.popoverLabel}>Spend Resolve</div>
                <div className={styles.popoverList}>
                  {RESOLVE_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      disabled={resolve <= 0}
                      className={resolve <= 0 ? styles.spendBtnDisabled : styles.spendBtn}
                      onClick={() => {
                        onSpendResolve(reason);
                        setShowResolvePopover(false);
                      }}
                    >{reason}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Condition Badges ── */}
      <div className={conditions.length > 0 || inCombat || exitingConditions.length > 0 ? styles.conditionRowSpaced : styles.conditionRow}>
        {/* Exiting conditions (fade-out animation) */}
        {exitingConditions.map((cond) => {
          const colorDef = CONDITION_COLORS[cond.name] ?? CONDITION_COLOR_FALLBACK;
          const exitStyle: CSSProperties = {
            backgroundColor: colorDef.bg,
            color: colorDef.text,
            borderColor: colorDef.bg,
          };
          return (
            <div key={`exit-${cond.name}`} className={styles.conditionBadgeWrapper}>
              <div className={`${styles.conditionBadge} ${styles.conditionBadgeExit}`} style={exitStyle}>
                <span className={styles.conditionInfoBtn}>
                  {cond.name}
                </span>
              </div>
            </div>
          );
        })}
        {conditions.map((cond) => {
          const condData = CONDITIONS.find((c) => c.name === cond.name);
          const isStackable = condData?.stackable ?? false;
          const maxLevel = condData?.maxLevel ?? 1;
          const colorDef = CONDITION_COLORS[cond.name] ?? CONDITION_COLOR_FALLBACK;
          const intensity = getConditionIntensity(cond.level, maxLevel, isStackable);
          const badgeStyle: CSSProperties = {
            backgroundColor: colorDef.bg,
            color: colorDef.text,
            borderColor: colorDef.bg,
            opacity: intensity,
          };
          const effectText = getConditionEffectText(cond.name);
          const isExpanded = expandedCondition === cond.name;
          const isEntering = enteringConditions.has(cond.name);
          return (
            <div key={cond.name} className={styles.conditionBadgeWrapper}>
              <div className={`${styles.conditionBadge}${isEntering ? ` ${styles.conditionBadgeEnter}` : ''}`} style={badgeStyle}>
                <button
                  type="button"
                  aria-label={`Info for ${cond.name}`}
                  aria-describedby={conditionTooltip?.name === cond.name ? `tooltip-condition-${cond.name}` : undefined}
                  onClick={(e) => {
                    // Mobile: toggle inline expansion
                    setExpandedCondition(isExpanded ? null : cond.name);
                    // Also show the full tooltip on click (existing behavior)
                    if (conditionTooltip?.name === cond.name) {
                      setConditionTooltip(null);
                      return;
                    }
                    const content = resolveConditionTooltip(cond.name);
                    if (content) {
                      setConditionTooltip({ name: cond.name, anchorEl: e.currentTarget });
                    }
                  }}
                  className={styles.conditionInfoBtn}
                >
                  {cond.name}{isStackable && cond.level > 1 ? ` (${cond.level})` : ''}
                </button>
                {/* Desktop hover tooltip — inline effect text */}
                {effectText && (
                  <span className={styles.conditionEffectTooltip} aria-hidden="true">
                    {effectText}
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${cond.name}`}
                  onClick={() => onRemoveCondition(cond.name)}
                  className={styles.conditionRemoveBtn}
                >✕</button>
              </div>
              {/* Mobile tap expansion — effect text below badge */}
              {isExpanded && effectText && (
                <div className={styles.conditionEffectExpanded} aria-live="polite">
                  {effectText}
                </div>
              )}
            </div>
          );
        })}
        {inCombat && (
          <button
            type="button"
            aria-label="Add condition"
            onClick={onOpenConditionPicker}
            className={styles.addConditionBtn}
          >{conditions.length === 0 && <span className={styles.conditionLabel}>Conditions</span>}+</button>
        )}
      </div>

      {/* ── End Turn Button (Req 8.1) ── */}
      {inCombat && (
        <div className={styles.endTurnSection}>
          <button
            type="button"
            aria-label="End Turn"
            onClick={handleEndTurn}
            className={styles.endTurnBtn}
            data-testid="end-turn-btn"
          >
            End Turn
          </button>
          {endTurnSummary && endTurnSummary.effects.length > 0 && (
            <div className={styles.endTurnSummary} data-testid="end-turn-summary" aria-live="polite">
              <div className={styles.endTurnSummaryTitle}>End of Turn Effects (Round {endTurnSummary.roundAdvanced})</div>
              <ul className={styles.endTurnSummaryList}>
                {endTurnSummary.effects.map((effect, idx) => (
                  <li key={idx} className={
                    effect.type === 'damage' ? styles.endTurnEffectDamage
                    : effect.type === 'reminder' ? styles.endTurnEffectReminder
                    : styles.endTurnEffectRemove
                  }>
                    {effect.type === 'reminder' && <span className={styles.reminderIcon} aria-hidden="true">⚠ </span>}
                    {effect.type === 'reminder'
                      ? `${effect.condition}: ${effect.description}`
                      : effect.description}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {endTurnSummary && endTurnSummary.effects.length === 0 && (
            <div className={styles.endTurnSummary} data-testid="end-turn-summary" aria-live="polite">
              <div className={styles.endTurnSummaryTitle}>End of Turn (Round {endTurnSummary.roundAdvanced})</div>
              <span className={styles.endTurnNoEffects}>No automated effects applied</span>
            </div>
          )}
        </div>
      )}

      {/* ── Initiative Tracker (Req 19.1) ── */}
      {inCombat && character && updateCharacter && (
        <InitiativeTracker character={character} updateCharacter={updateCharacter} />
      )}

      {/* ── Condition Tooltip ── */}
      {conditionTooltip && (() => {
        const content = resolveConditionTooltip(conditionTooltip.name);
        if (!content) return null;
        return (
          <Tooltip
            anchorEl={conditionTooltip.anchorEl}
            title={content.title}
            onClose={() => setConditionTooltip(null)}
            id={`tooltip-condition-${conditionTooltip.name}`}
          >
            {content.sections.map((s, idx) => (
              <div key={idx} className={idx < content!.sections.length - 1 ? styles.tooltipSection : styles.tooltipSectionLast}>
                <div className={styles.tooltipSectionLabel}>{s.label}</div>
                <div>{s.text}</div>
              </div>
            ))}
          </Tooltip>
        );
      })()}
    </div>
  );
}
