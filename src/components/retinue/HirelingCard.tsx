import { useState } from 'react';
import type { Hireling } from '../../types/character';
import { clampWounds } from '../../logic/hirelings';
import { EditableField } from '../shared/EditableField';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import styles from './HirelingCard.module.css';

interface HirelingCardProps {
  hireling: Hireling;
  onUpdate: (id: number, field: string, value: unknown) => void;
  onDelete: (id: number) => void;
}

const CHAR_KEYS = ['M', 'WS', 'BS', 'S', 'T', 'I', 'Ag', 'Dex', 'Int', 'WP', 'Fel', 'W'] as const;

export function HirelingCard({ hireling, onUpdate, onDelete }: HirelingCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [newCondition, setNewCondition] = useState('');

  const h = hireling;
  const maxW = h.W || 0;
  const curW = h.wCur ?? maxW;
  const pct = maxW > 0 ? (curW / maxW) * 100 : 0;
  const wColor = pct > 50 ? 'var(--success)' : pct > 20 ? 'var(--accent-gold)' : 'var(--danger)';
  const wCountClass = pct > 50 ? styles.woundCountHigh : pct > 20 ? styles.woundCountMedium : styles.woundCountLow;
  const headerWoundsClass = pct > 50 ? styles.headerWoundsHigh : pct > 20 ? styles.headerWoundsMedium : styles.headerWoundsLow;
  const incapacitated = curW <= 0;

  const handleWoundChange = (delta: number) => {
    const newVal = clampWounds(curW + delta, maxW);
    onUpdate(h.id, 'wCur', newVal);
  };

  const handleAddCondition = () => {
    const name = newCondition.trim();
    if (!name) return;
    const updated = [...h.conditions, { name, level: 1 }];
    onUpdate(h.id, 'conditions', updated);
    setNewCondition('');
  };

  const handleRemoveCondition = (index: number) => {
    const updated = h.conditions.filter((_, i) => i !== index);
    onUpdate(h.id, 'conditions', updated);
  };

  return (
    <div className={incapacitated ? styles.cardIncapacitated : styles.card}>
      {/* Collapsed header — always visible */}
      <div className={styles.header} onClick={() => setExpanded(!expanded)}>
        <div className={styles.headerLeft}>
          <span className={styles.nameDisplay}>{h.name || 'Unnamed'}</span>
          {h.role && <span className={styles.roleBadge}>{h.role}</span>}
          {h.status && <span className={styles.statusBadge}>{h.status}</span>}
        </div>
        <span className={headerWoundsClass}>{curW}/{maxW}</span>
        <span className={expanded ? styles.expandIconOpen : styles.expandIcon}>▼</span>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className={styles.body}>
          {/* Editable identity fields */}
          <div className={styles.identityRow}>
            <EditableField label="Name" value={h.name} onSave={(v) => onUpdate(h.id, 'name', v)} />
            <EditableField label="Role" value={h.role} onSave={(v) => onUpdate(h.id, 'role', v)} />
            <EditableField label="Status" value={h.status} onSave={(v) => onUpdate(h.id, 'status', v)} />
          </div>

          {/* Template display */}
          {h.template && (
            <div className={styles.templateBadge}>Template: {h.template}</div>
          )}

          {/* Characteristic grid */}
          <div className={styles.charGrid}>
            {CHAR_KEYS.map((k) => (
              <div key={k} className={styles.charCell}>
                <div className={styles.charLabel}>{k}</div>
                <EditableField label="" value={h[k]} type="number" onSave={(v) => onUpdate(h.id, k, v)} style={{ minWidth: '32px' }} />
              </div>
            ))}
          </div>

          {/* Wound tracker */}
          <div className={styles.woundBar}>
            <div className={styles.woundRow}>
              <span className={styles.woundLabel}>Wounds</span>
              <button type="button" onClick={() => handleWoundChange(-1)} className={styles.woundMinusBtn}>−</button>
              <div className={styles.woundProgressContainer}>
                <div className={styles.woundProgressTrack}>
                  <div className={styles.woundProgressFill} style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: wColor }} />
                </div>
              </div>
              <span className={wCountClass}>{curW}/{maxW}</span>
              <button type="button" onClick={() => handleWoundChange(1)} className={styles.woundPlusBtn}>+</button>
              <button type="button" onClick={() => onUpdate(h.id, 'wCur', maxW)} className={styles.woundFullBtn}>Full</button>
            </div>
          </div>

          {/* Skills, Talents, Traits, Trappings */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Skills</label>
            <textarea
              className={styles.textareaField}
              value={h.skills}
              onChange={(e) => onUpdate(h.id, 'skills', e.target.value)}
              placeholder="Skills..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Talents</label>
            <textarea
              className={styles.textareaField}
              value={h.talents}
              onChange={(e) => onUpdate(h.id, 'talents', e.target.value)}
              placeholder="Talents..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Traits</label>
            <textarea
              className={styles.textareaField}
              value={h.traits}
              onChange={(e) => onUpdate(h.id, 'traits', e.target.value)}
              placeholder="Traits..."
            />
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Trappings</label>
            <textarea
              className={styles.textareaField}
              value={h.trappings}
              onChange={(e) => onUpdate(h.id, 'trappings', e.target.value)}
              placeholder="Trappings..."
            />
          </div>

          {/* Quirks section */}
          <div className={styles.quirksSection}>
            <div className={styles.quirksSectionTitle}>Quirks</div>
            <div className={styles.quirkRow}>
              <span className={styles.quirkLabel}>Physical</span>
              <EditableField label="" value={h.physicalQuirk} onSave={(v) => onUpdate(h.id, 'physicalQuirk', v)} />
            </div>
            <div className={styles.quirkRow}>
              <span className={styles.quirkLabel}>Work Ethic</span>
              <EditableField label="" value={h.workEthic} onSave={(v) => onUpdate(h.id, 'workEthic', v)} />
            </div>
            <div className={styles.quirkRow}>
              <span className={styles.quirkLabel}>Personality</span>
              <EditableField label="" value={h.personalityQuirk} onSave={(v) => onUpdate(h.id, 'personalityQuirk', v)} />
            </div>
          </div>

          {/* Upkeep fields */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Upkeep</label>
            <div className={styles.upkeepRow}>
              <div className={styles.upkeepField}>
                <span className={styles.upkeepLabel}>GC</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={styles.upkeepInput}
                  value={h.upkeep.gc}
                  onChange={(e) => onUpdate(h.id, 'upkeep', { ...h.upkeep, gc: Number(e.target.value) || 0 })}
                />
              </div>
              <div className={styles.upkeepField}>
                <span className={styles.upkeepLabel}>SS</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={styles.upkeepInput}
                  value={h.upkeep.ss}
                  onChange={(e) => onUpdate(h.id, 'upkeep', { ...h.upkeep, ss: Number(e.target.value) || 0 })}
                />
              </div>
              <div className={styles.upkeepField}>
                <span className={styles.upkeepLabel}>D</span>
                <input
                  type="number"
                  inputMode="numeric"
                  className={styles.upkeepInput}
                  value={h.upkeep.d}
                  onChange={(e) => onUpdate(h.id, 'upkeep', { ...h.upkeep, d: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          {/* Conditions */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Conditions</label>
            {h.conditions.length > 0 && (
              <div className={styles.conditionsList}>
                {h.conditions.map((cond, i) => (
                  <span key={i} className={styles.conditionBadge}>
                    {cond.name}{cond.level > 1 ? ` ×${cond.level}` : ''}
                    <button type="button" className={styles.conditionRemoveBtn} onClick={() => handleRemoveCondition(i)}>✕</button>
                  </span>
                ))}
              </div>
            )}
            <div className={styles.addConditionRow}>
              <input
                type="text"
                className={styles.conditionInput}
                value={newCondition}
                onChange={(e) => setNewCondition(e.target.value)}
                placeholder="Add condition..."
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddCondition(); }}
              />
              <button type="button" className={styles.addConditionBtn} onClick={handleAddCondition}>+</button>
            </div>
          </div>

          {/* Notes */}
          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>Notes</label>
            <textarea
              className={styles.textareaField}
              value={h.notes}
              onChange={(e) => onUpdate(h.id, 'notes', e.target.value)}
              placeholder="Notes..."
            />
          </div>

          {/* Delete button */}
          <div className={styles.footer}>
            <button type="button" className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
              Delete Hireling
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          message={`Remove ${h.name || 'this hireling'} permanently?`}
          confirmLabel="Delete"
          cancelLabel="Cancel"
          onConfirm={() => { setShowDeleteConfirm(false); onDelete(h.id); }}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
