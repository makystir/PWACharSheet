import { useState } from 'react';
import type { Hireling } from '../../types/character';
import { clampWounds, isIncapacitated } from '../../logic/hirelings';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { Users } from 'lucide-react';
import styles from './HirelingCombatPanel.module.css';

// ─── Props ───────────────────────────────────────────────────────────────────

export interface HirelingCombatPanelProps {
  hirelings: Hireling[];
  onUpdateWounds: (id: number, wCur: number) => void;
  onAddCondition: (id: number, condition: { name: string; level: number }) => void;
  onRemoveCondition: (id: number, conditionIndex: number) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function HirelingCombatPanel({ hirelings, onUpdateWounds, onAddCondition, onRemoveCondition }: HirelingCombatPanelProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [conditionInputs, setConditionInputs] = useState<Record<number, string>>({});

  const handleAddCondition = (hirelingId: number) => {
    const value = (conditionInputs[hirelingId] ?? '').trim();
    if (!value) return;
    onAddCondition(hirelingId, { name: value, level: 1 });
    setConditionInputs((prev) => ({ ...prev, [hirelingId]: '' }));
  };

  const handleConditionKeyDown = (e: React.KeyboardEvent, hirelingId: number) => {
    if (e.key === 'Enter') {
      handleAddCondition(hirelingId);
    }
  };

  return (
    <Card>
      <SectionHeader
        icon={Users}
        title="Hirelings"
        collapsible
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />
      {!collapsed && (
        <>
          {hirelings.length === 0 && (
            <div className={styles.emptyMessage}>No hirelings in retinue</div>
          )}
          {hirelings.map((hireling) => {
            const incap = isIncapacitated(hireling);
            return (
              <div
                key={hireling.id}
                className={`${styles.hirelingRow} ${incap ? styles.incapacitated : ''}`}
              >
                {/* Header: Name + incapacitated badge */}
                <div className={styles.hirelingHeader}>
                  <span className={styles.hirelingName}>{hireling.name || 'Unnamed'}</span>
                  {incap && <span className={styles.incapacitatedBadge}>Incapacitated</span>}
                </div>

                {/* Wounds: current/max with +/- */}
                <div className={styles.woundsRow}>
                  <span className={styles.woundsLabel}>W</span>
                  <button
                    type="button"
                    aria-label={`Decrease wounds for ${hireling.name}`}
                    className={styles.woundBtnDecrease}
                    onClick={() => onUpdateWounds(hireling.id, clampWounds(hireling.wCur - 1, hireling.W))}
                  >−</button>
                  <span className={styles.woundsValue}>{hireling.wCur}</span>
                  <span className={styles.woundsMax}>/ {hireling.W}</span>
                  <button
                    type="button"
                    aria-label={`Increase wounds for ${hireling.name}`}
                    className={styles.woundBtnIncrease}
                    onClick={() => onUpdateWounds(hireling.id, clampWounds(hireling.wCur + 1, hireling.W))}
                  >+</button>
                </div>

                {/* Active Conditions */}
                {hireling.conditions.length > 0 && (
                  <div className={styles.conditionsRow}>
                    {hireling.conditions.map((cond, idx) => (
                      <div key={`${cond.name}-${idx}`} className={styles.conditionBadge}>
                        <span className={styles.conditionName}>
                          {cond.name}{cond.level > 1 ? ` (${cond.level})` : ''}
                        </span>
                        <button
                          type="button"
                          aria-label={`Remove ${cond.name} from ${hireling.name}`}
                          className={styles.conditionRemoveBtn}
                          onClick={() => onRemoveCondition(hireling.id, idx)}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Condition */}
                <div className={styles.addConditionRow}>
                  <input
                    type="text"
                    className={styles.conditionInput}
                    placeholder="Add condition..."
                    value={conditionInputs[hireling.id] ?? ''}
                    onChange={(e) => setConditionInputs((prev) => ({ ...prev, [hireling.id]: e.target.value }))}
                    onKeyDown={(e) => handleConditionKeyDown(e, hireling.id)}
                  />
                  <button
                    type="button"
                    aria-label={`Add condition to ${hireling.name}`}
                    className={styles.addConditionBtn}
                    onClick={() => handleAddCondition(hireling.id)}
                  >Add</button>
                </div>
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
}
