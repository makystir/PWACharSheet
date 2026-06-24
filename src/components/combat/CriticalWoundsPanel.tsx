import { useState } from 'react';
import type { CriticalWound } from '../../types/character';
import type { HitLocation } from './hitLocationTable';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { RollCriticalFlow } from './RollCriticalFlow';
import { Activity } from 'lucide-react';
import styles from './CriticalWoundsPanel.module.css';

interface CriticalWoundsPanelProps {
  criticalWounds: CriticalWound[];
  onAdd: () => void;
  onHeal: (woundId: number) => void;
  onUpdate: (index: number, field: string, value: string | number) => void;
  defaultCollapsed?: boolean;
  preselectedLocation?: HitLocation;
  onAddWound?: (wound: Omit<CriticalWound, 'id' | 'timestamp'>) => void;
}

function getSeverityClass(severity: number): string {
  if (severity >= 4) return styles.severityHigh;
  if (severity >= 2) return styles.severityMedium;
  return styles.severityLow;
}

export function CriticalWoundsPanel({ criticalWounds, onAdd, onHeal, onUpdate, defaultCollapsed = false, preselectedLocation, onAddWound }: CriticalWoundsPanelProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [showRollFlow, setShowRollFlow] = useState(false);
  const activeWounds = criticalWounds.filter((w) => !w.healed);

  function handleRollCriticalConfirm(wound: Omit<CriticalWound, 'id' | 'timestamp'>) {
    if (onAddWound) {
      onAddWound(wound);
    } else {
      onAdd();
    }
    setShowRollFlow(false);
  }

  function handleRollCriticalCancel() {
    setShowRollFlow(false);
  }

  return (
    <Card>
      <SectionHeader
        icon={Activity}
        title="Critical Wounds"
        action={
          <div className={styles.headerActions}>
            <AddButton label="Add" onClick={onAdd} />
            <button
              type="button"
              className={styles.rollCriticalBtn}
              onClick={() => setShowRollFlow(true)}
            >
              Roll Critical
            </button>
          </div>
        }
        collapsible
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((prev) => !prev)}
      />
      {!collapsed && (
        <>
          {showRollFlow && (
            <RollCriticalFlow
              preselectedLocation={preselectedLocation}
              onConfirm={handleRollCriticalConfirm}
              onCancel={handleRollCriticalCancel}
            />
          )}
          {activeWounds.length === 0 && (
            <div className={styles.emptyMessage}>
              No active critical wounds
            </div>
          )}
          {activeWounds.map((w) => {
            const idx = criticalWounds.indexOf(w);
            return (
              <div key={w.id} className={styles.woundRow}>
                <div className={styles.woundHeader}>
                  <div className={styles.woundHeaderLeft}>
                    <span className={getSeverityClass(w.severity)}>{w.severity}</span>
                    <span className={styles.locationText}>{w.location}</span>
                    <span className={styles.descriptionText}>{w.description}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onHeal(w.id)}
                    className={styles.healBtn}
                    style={{ minWidth: '44px', minHeight: '44px' }}
                  >
                    Heal
                  </button>
                </div>
                <div className={styles.fieldsGrid}>
                  <EditableField
                    label="Location"
                    value={w.location}
                    onSave={(v) => onUpdate(idx, 'location', v)}
                  />
                  <EditableField
                    label="Description"
                    value={w.description}
                    onSave={(v) => onUpdate(idx, 'description', v)}
                  />
                  <EditableField
                    label="Effects"
                    value={w.effects}
                    onSave={(v) => onUpdate(idx, 'effects', v)}
                  />
                  <EditableField
                    label="Duration"
                    value={w.duration}
                    onSave={(v) => onUpdate(idx, 'duration', v)}
                  />
                  <EditableField
                    label="Severity"
                    value={w.severity}
                    type="number"
                    onSave={(v) => onUpdate(idx, 'severity', v)}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}
    </Card>
  );
}
