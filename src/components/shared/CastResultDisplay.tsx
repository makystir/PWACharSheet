import type { CSSProperties } from 'react';
import type { Character } from '../../types/character';
import {
  type CastingResult,
  type MiscastResult,
  computeOvercastOptions,
} from '../../logic/spell-casting';
import { OvercastAllocator } from './OvercastAllocator';

interface CastResultDisplayProps {
  castingResult: CastingResult;
  character: Character;
  miscastResult?: MiscastResult | null;
  onOvercastAllocated?: (allocations: Record<string, number>) => void;
  onCriticalChoice?: (choice: 'critical_wound' | 'total_power' | 'unstoppable_force') => void;
  onMiscastRoll?: (table: 'minor' | 'major') => void;
  onClose: () => void;
}

const overlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.6)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const dialogStyle: CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--card-border)',
  borderRadius: 'var(--radius-lg)',
  padding: '24px',
  width: '90%',
  maxWidth: '360px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  alignItems: 'center',
  maxHeight: '85vh',
  overflowY: 'auto',
};

const headerStyle: CSSProperties = {
  color: 'var(--text-primary)',
  fontSize: '16px',
  fontWeight: 600,
  margin: 0,
  fontFamily: "'Cinzel', serif",
  textAlign: 'center',
};

const rollValueStyle: CSSProperties = {
  fontSize: '48px',
  fontWeight: 700,
  fontFamily: "'Cinzel', serif",
  margin: 0,
  lineHeight: 1,
};

const targetStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '13px',
};

const slStyle: CSSProperties = {
  fontSize: '20px',
  fontWeight: 700,
};

const cnComparisonStyle: CSSProperties = {
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
};

const criticalLabelStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '18px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

const fumbleLabelStyle: CSSProperties = {
  color: 'var(--danger)',
  fontSize: '18px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '2px',
};

const sectionStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  alignItems: 'center',
};

const separatorStyle: CSSProperties = {
  width: '100%',
  height: '1px',
  background: 'var(--border)',
  margin: 0,
};

const choiceBtnStyle: CSSProperties = {
  padding: '6px 14px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--text-primary)',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
};

const miscastBtnStyle: CSSProperties = {
  padding: '6px 14px',
  background: 'var(--bg-tertiary)',
  border: '1px solid var(--danger)',
  borderRadius: 'var(--radius-sm)',
  color: 'var(--danger)',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: 600,
};

const dismissBtnStyle: CSSProperties = {
  padding: '8px 24px',
  background: 'var(--accent-gold)',
  border: 'none',
  borderRadius: 'var(--radius-sm)',
  color: '#000',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 600,
  marginTop: '4px',
};

const goldTextStyle: CSSProperties = {
  color: 'var(--accent-gold)',
  fontSize: '14px',
  fontWeight: 600,
  textAlign: 'center',
};

const miscastResultStyle: CSSProperties = {
  width: '100%',
  padding: '10px',
  background: 'var(--bg-tertiary)',
  borderRadius: 'var(--radius-sm)',
  border: '1px solid var(--danger)',
};

const miscastNameStyle: CSSProperties = {
  color: 'var(--danger)',
  fontSize: '14px',
  fontWeight: 700,
  marginBottom: '4px',
};

const miscastEffectStyle: CSSProperties = {
  color: 'var(--text-secondary)',
  fontSize: '12px',
  lineHeight: 1.4,
};

function formatSL(sl: number): string {
  return sl >= 0 ? `+${sl}` : `${sl}`;
}

export function CastResultDisplay({
  castingResult,
  character: _character,
  miscastResult,
  onOvercastAllocated,
  onCriticalChoice,
  onMiscastRoll,
  onClose,
}: CastResultDisplayProps) {
  const {
    rollResult,
    spell,
    cn,
    slAchieved,
    castSuccess,
    overcastSlots,
    isCriticalCast,
    isFumbledCast,
    triggerMinorMiscast,
    isMagicMissile,
    hitLocation,
    damage,
    isFullyChannelled,
    isUndispellable,
  } = castingResult;

  const passColor = castSuccess ? 'var(--success)' : 'var(--danger)';

  return (
    <div style={overlayStyle} onClick={onClose} role="dialog" aria-label="Cast Result">
      <div style={dialogStyle} onClick={(e) => e.stopPropagation()}>
        {/* 1. Header — Spell name */}
        <div style={headerStyle}>{spell.name}</div>

        {/* 2. Roll info — d100 value, target, SL */}
        <div style={{ ...rollValueStyle, color: passColor }}>{rollResult.roll}</div>
        <div style={targetStyle}>Target: {rollResult.targetNumber}</div>
        <div style={{ ...slStyle, color: passColor }}>SL {formatSL(slAchieved)}</div>

        {/* 3. CN comparison */}
        <div style={separatorStyle} />
        {isFullyChannelled ? (
          <div style={{ ...cnComparisonStyle, color: 'var(--success)' }}>
            Channelled Cast — Success!
          </div>
        ) : castSuccess ? (
          <div style={{ ...cnComparisonStyle, color: 'var(--success)' }}>
            SL {formatSL(slAchieved)} vs CN {cn} — Cast!
          </div>
        ) : (
          <div style={{ ...cnComparisonStyle, color: 'var(--danger)' }}>
            SL {formatSL(slAchieved)} vs CN {cn} — Failed to reach CN
          </div>
        )}

        {/* 4. Critical Cast section */}
        {isCriticalCast && (
          <>
            <div style={separatorStyle} />
            <div style={sectionStyle}>
              <div style={criticalLabelStyle}>Critical Cast</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button
                  type="button"
                  style={choiceBtnStyle}
                  onClick={() => onCriticalChoice?.('critical_wound')}
                >
                  Critical Wound
                </button>
                <button
                  type="button"
                  style={choiceBtnStyle}
                  onClick={() => onCriticalChoice?.('total_power')}
                >
                  Total Power
                </button>
                <button
                  type="button"
                  style={choiceBtnStyle}
                  onClick={() => onCriticalChoice?.('unstoppable_force')}
                >
                  Unstoppable Force
                </button>
              </div>
            </div>
          </>
        )}

        {/* 5. Fumble section */}
        {isFumbledCast && (
          <>
            <div style={separatorStyle} />
            <div style={sectionStyle}>
              <div style={fumbleLabelStyle}>Fumble</div>
              <button
                type="button"
                style={miscastBtnStyle}
                onClick={() => onMiscastRoll?.('minor')}
              >
                Roll Minor Miscast
              </button>
            </div>
          </>
        )}

        {/* 6. Minor Miscast prompt (from critical, not fumble) */}
        {triggerMinorMiscast && !isFumbledCast && (
          <>
            <div style={separatorStyle} />
            <div style={sectionStyle}>
              <div style={{ color: 'var(--danger)', fontSize: '13px', fontWeight: 600 }}>
                Minor Miscast triggered
              </div>
              <button
                type="button"
                style={miscastBtnStyle}
                onClick={() => onMiscastRoll?.('minor')}
              >
                Roll Minor Miscast
              </button>
            </div>
          </>
        )}

        {/* 7. Undispellable indicator */}
        {isUndispellable && (
          <>
            <div style={separatorStyle} />
            <div style={goldTextStyle}>
              UNSTOPPABLE FORCE — Cannot be dispelled
            </div>
          </>
        )}

        {/* 8. Overcast section */}
        {overcastSlots > 0 && castSuccess && onOvercastAllocated && (
          <>
            <div style={separatorStyle} />
            <div style={{ width: '100%' }}>
              <OvercastAllocator
                options={computeOvercastOptions(spell)}
                availableSlots={overcastSlots}
                onAllocate={onOvercastAllocated}
              />
            </div>
          </>
        )}

        {/* 9. Magic missile section */}
        {isMagicMissile && castSuccess && (
          <>
            <div style={separatorStyle} />
            <div style={sectionStyle}>
              <div style={{ color: 'var(--parchment)', fontSize: '14px', fontWeight: 600 }}>
                Hit: {hitLocation}
              </div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Damage: {damage}
              </div>
            </div>
          </>
        )}

        {/* 10. Miscast result */}
        {miscastResult && (
          <>
            <div style={separatorStyle} />
            <div style={miscastResultStyle}>
              <div style={miscastNameStyle}>{miscastResult.entry.name}</div>
              <div style={miscastEffectStyle}>{miscastResult.entry.effect}</div>
              {miscastResult.entry.special === 'cascading_chaos' && (
                <button
                  type="button"
                  style={{ ...miscastBtnStyle, marginTop: '8px' }}
                  onClick={() => onMiscastRoll?.('major')}
                >
                  Roll Major Miscast
                </button>
              )}
              {miscastResult.entry.special === 'multiplying_misfortune' && (
                <button
                  type="button"
                  style={{ ...miscastBtnStyle, marginTop: '8px' }}
                  onClick={() => onMiscastRoll?.('minor')}
                >
                  Roll 2 Minor Miscasts
                </button>
              )}
            </div>
          </>
        )}

        {/* 11. Dismiss button */}
        <button type="button" onClick={onClose} style={dismissBtnStyle}>
          Dismiss
        </button>
      </div>
    </div>
  );
}
