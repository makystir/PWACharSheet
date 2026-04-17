import { useState, useEffect, useCallback } from 'react';
import type { CSSProperties } from 'react';
import type { CombatState, Condition } from '../../types/character';
import type { FortuneSpendReason, ResolveSpendReason } from '../../logic/fortune-resolve';
import { CONDITIONS } from '../../data/conditions';
import { resolveConditionTooltip } from '../../logic/tooltip-content';
import { Tooltip } from '../shared/Tooltip';
import { Heart, Zap, Star, Shield } from 'lucide-react';
import styles from './CombatDashboard.module.css';

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
  onUpdateWounds: (delta: number) => void;
  onUpdateAdvantage: (delta: number) => void;
  onUpdateRound: (delta: number) => void;
  onToggleEngaged: () => void;
  onRemoveCondition: (name: string) => void;
  onSpendFortune: (reason: FortuneSpendReason) => void;
  onSpendResolve: (reason: ResolveSpendReason) => void;
  onOpenConditionPicker: () => void;
}

// ─── Fortune / Resolve spend reasons ─────────────────────────────────────────

const FORTUNE_REASONS: FortuneSpendReason[] = ['Reroll', 'Add +1 SL', 'Special Ability'];
const RESOLVE_REASONS: ResolveSpendReason[] = ['Immunity to Psychology', 'Remove Conditions', 'Special Ability'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWoundColor(wCur: number, totalWounds: number): string {
  if (totalWounds <= 0) return 'var(--danger)';
  const pct = (wCur / totalWounds) * 100;
  if (pct > 50) return 'var(--success)';
  if (pct > 20) return 'var(--accent-gold)';
  return 'var(--danger)';
}

function getWoundPct(wCur: number, totalWounds: number): number {
  if (totalWounds <= 0) return 0;
  return Math.max(0, Math.min(100, (wCur / totalWounds) * 100));
}

function getWoundClass(wCur: number, totalWounds: number): string {
  if (totalWounds <= 0) return styles.woundLow;
  const pct = (wCur / totalWounds) * 100;
  if (pct > 50) return styles.woundHigh;
  if (pct > 20) return styles.woundMedium;
  return styles.woundLow;
}

function getProgressFillClass(wCur: number, totalWounds: number): string {
  if (totalWounds <= 0) return styles.progressFillLow;
  const pct = (wCur / totalWounds) * 100;
  if (pct > 50) return styles.progressFillHigh;
  if (pct > 20) return styles.progressFillMedium;
  return styles.progressFillLow;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function CombatDashboard(props: CombatDashboardProps) {
  const {
    wCur, totalWounds, advantage, combatState, conditions,
    fortune, fate, resolve, resilience, inCombat,
    onUpdateWounds, onUpdateAdvantage, onUpdateRound,
    onToggleEngaged, onRemoveCondition,
    onSpendFortune, onSpendResolve, onOpenConditionPicker,
  } = props;

  const [conditionTooltip, setConditionTooltip] = useState<{ name: string; anchorEl: HTMLElement } | null>(null);
  const [showFortunePopover, setShowFortunePopover] = useState(false);
  const [showResolvePopover, setShowResolvePopover] = useState(false);

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

  // Sticky positioning remains inline because tests assert on style.position
  const stickyStyle: CSSProperties | undefined = inCombat
    ? { position: 'sticky', top: 0, zIndex: 50 }
    : undefined;

  return (
    <div className={styles.dashboard} style={stickyStyle} data-testid="combat-dashboard">
      <div className={styles.mainRow}>
        {/* ── Wounds ── */}
        <div className={styles.woundsSection}>
          <div className={styles.iconLabel}>
            <Heart size={14} color={woundColor} />
            <span className={styles.label}>Wounds</span>
          </div>
          <div className={styles.woundNumbers}>
            <span className={`${styles.bigNumber} ${woundClass}`}>{wCur}</span>
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
              <span className={styles.label}>Advantage</span>
            </div>
            <span className={`${styles.bigNumber} ${styles.accentGold}`}>{advantage}</span>
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
      <div className={conditions.length > 0 || inCombat ? styles.conditionRowSpaced : styles.conditionRow}>
        {conditions.map((cond) => {
          const condData = CONDITIONS.find((c) => c.name === cond.name);
          const isStackable = condData?.stackable ?? false;
          return (
            <div key={cond.name} className={styles.conditionBadge}>
              <button
                type="button"
                aria-label={`Info for ${cond.name}`}
                aria-describedby={conditionTooltip?.name === cond.name ? `tooltip-condition-${cond.name}` : undefined}
                onClick={(e) => {
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
              <button
                type="button"
                aria-label={`Remove ${cond.name}`}
                onClick={() => onRemoveCondition(cond.name)}
                className={styles.conditionRemoveBtn}
              >✕</button>
            </div>
          );
        })}
        {inCombat && (
          <button
            type="button"
            aria-label="Add condition"
            onClick={onOpenConditionPicker}
            className={styles.addConditionBtn}
          >+</button>
        )}
      </div>

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
