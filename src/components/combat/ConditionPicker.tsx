import { useState, useEffect, useRef, useCallback } from 'react';
import type { Condition } from '../../types/character';
import { CONDITIONS } from '../../data/conditions';
import { resolveConditionTooltip } from '../../logic/tooltip-content';
import { Tooltip } from '../shared/Tooltip';
import { Info, X } from 'lucide-react';
import styles from './ConditionPicker.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ConditionPickerProps {
  conditions: Condition[];
  onApply: (conditionName: string) => void;
  onRemove: (conditionName: string) => void;
  onClose: () => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ConditionPicker({ conditions, onApply, onRemove, onClose }: ConditionPickerProps) {
  const [conditionTooltip, setConditionTooltip] = useState<{ name: string; anchorEl: HTMLElement } | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Focus trap: focus modal on mount
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    // Close when tapping outside the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleApply = (conditionName: string) => {
    onApply(conditionName);
  };

  const handleRemove = (conditionName: string) => {
    onRemove(conditionName);
  };

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} data-testid="condition-picker-overlay">
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Condition Picker"
        tabIndex={-1}
      >
        {/* Header */}
        <div className={styles.header}>
          <h2 className={styles.title}>Conditions</h2>
          <button
            type="button"
            aria-label="Close condition picker"
            onClick={onClose}
            className={styles.closeBtn}
          >
            <X size={18} />
          </button>
        </div>

        {/* Condition Grid */}
        <div className={styles.grid} data-testid="condition-grid">
          {CONDITIONS.map((cond) => {
            const active = conditions.find((c) => c.name === cond.name);
            const isActive = !!active;

            return (
              <div
                key={cond.name}
                className={isActive ? styles.conditionBtnActive : styles.conditionBtn}
                style={{
                  background: isActive ? 'rgba(200,80,80,0.3)' : 'var(--bg-tertiary)',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--danger)' : 'var(--border)'}`,
                }}
                data-testid={`condition-${cond.name}`}
              >
                {/* Info button */}
                <button
                  type="button"
                  aria-label={`Info for ${cond.name}`}
                  aria-describedby={conditionTooltip?.name === cond.name ? `tooltip-picker-${cond.name}` : undefined}
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
                  className={styles.infoBtn}
                >
                  <Info size={14} />
                </button>

                {/* Condition name — tap to add/increment */}
                <button
                  type="button"
                  aria-label={isActive ? `Increment ${cond.name}` : `Apply ${cond.name}`}
                  onClick={() => handleApply(cond.name)}
                  className={styles.nameBtn}
                >
                  {cond.name}
                  {isActive && active.level > 1 ? ` (${active.level})` : ''}
                </button>

                {/* Remove button — only when active */}
                {isActive && (
                  <button
                    type="button"
                    aria-label={`Remove ${cond.name}`}
                    onClick={() => handleRemove(cond.name)}
                    className={styles.removeBtn}
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Condition Tooltip */}
      {conditionTooltip && (() => {
        const content = resolveConditionTooltip(conditionTooltip.name);
        if (!content) return null;
        return (
          <Tooltip
            anchorEl={conditionTooltip.anchorEl}
            title={content.title}
            onClose={() => setConditionTooltip(null)}
            id={`tooltip-picker-${conditionTooltip.name}`}
          >
            {content.sections.map((s, idx) => (
              <div key={idx} className={idx < content!.sections.length - 1 ? styles.tooltipSection : styles.tooltipSectionLast}>
                <div className={styles.tooltipLabel}>{s.label}</div>
                <div>{s.text}</div>
              </div>
            ))}
          </Tooltip>
        );
      })()}
    </div>
  );
}
