import type { AmmoItem } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { Target } from 'lucide-react';
import styles from './AmmoTracker.module.css';

interface AmmoTrackerProps {
  ammo: AmmoItem[];
  onUpdate: (index: number, field: string, value: string | number) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}

export function AmmoTracker({ ammo, onUpdate, onAdd, onRemove }: AmmoTrackerProps) {
  return (
    <Card>
      <SectionHeader
        icon={Target}
        title="Ammunition"
        action={<AddButton label="Add" onClick={onAdd} />}
      />
      {ammo.length === 0 && (
        <div className={styles.emptyMessage}>
          No ammunition tracked
        </div>
      )}
      <div className={styles.ammoGrid}>
        {ammo.map((a, i) => {
          const maxAmmo = a.max || a.quantity;
          return (
            <div key={i} className={styles.ammoCard}>
              <div className={styles.ammoHeader}>
                <EditableField
                  label=""
                  value={a.name}
                  onSave={(v) => onUpdate(i, 'name', v)}
                />
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className={styles.removeBtn}
                >
                  ✕
                </button>
              </div>
              <div className={styles.ammoCount}>
                <span
                  className={a.quantity <= 3 ? styles.ammoCountLow : styles.ammoCountNormal}
                >
                  {a.quantity}
                </span>
                <span className={styles.separator}>/</span>
                <input
                  type="number"
                  value={maxAmmo}
                  onChange={(e) => onUpdate(i, 'max', Number(e.target.value) || 0)}
                  className={styles.maxInput}
                />
              </div>
              <div className={styles.btnRow}>
                <button
                  type="button"
                  onClick={() => {
                    if (a.quantity > 0) onUpdate(i, 'quantity', a.quantity - 1);
                  }}
                  className={styles.fireBtn}
                >
                  FIRE
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (a.quantity < maxAmmo) onUpdate(i, 'quantity', Math.min(maxAmmo, a.quantity + 1));
                  }}
                  className={styles.addOneBtn}
                >
                  +1
                </button>
                <button
                  type="button"
                  onClick={() => onUpdate(i, 'quantity', maxAmmo)}
                  className={styles.refillBtn}
                >
                  REFILL
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
