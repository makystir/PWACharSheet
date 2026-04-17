import { useState } from 'react';
import type { Character, ArmourPoints, EndeavourEntry } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Picker } from '../shared/Picker';
import { CalendarCheck, Trash2, AlertTriangle, Info, Check } from 'lucide-react';
import styles from './EndeavoursPage.module.css';
import {
  GENERAL_ENDEAVOURS,
  CLASS_ENDEAVOURS,
  createDowntimePeriod,
  addDowntimePeriod,
  removeDowntimePeriod as removeDowntimePeriodFn,
  addEndeavourEntry,
  removeEndeavourEntry,
  updateEndeavourEntry,
  updateDowntimePeriod,
  isElf,
} from '../../logic/endeavours';

interface EndeavoursPageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
  totalWounds: number;
  armourPoints: ArmourPoints;
  maxEncumbrance: number;
  coinWeight: number;
}

interface PickerItem {
  group: string;
  label: string;
}

export function EndeavoursPage({ character, updateCharacter }: EndeavoursPageProps) {
  const [deletingPeriodId, setDeletingPeriodId] = useState<number | null>(null);
  const [addingToPeriodId, setAddingToPeriodId] = useState<number | null>(null);
  const [customForPeriodId, setCustomForPeriodId] = useState<number | null>(null);
  const [customInput, setCustomInput] = useState('');

  const endeavours = character.endeavours || [];
  const elfChar = isElf(character.species);

  // Build grouped picker items for endeavour selection
  const buildPickerItems = (): PickerItem[] => {
    const items: PickerItem[] = [];
    // General Endeavours
    for (const e of GENERAL_ENDEAVOURS) {
      items.push({ group: 'General', label: e });
    }
    // Class Endeavours filtered by character class
    const classEndeavours = CLASS_ENDEAVOURS[character.class] || [];
    for (const e of classEndeavours) {
      items.push({ group: `${character.class} Class`, label: e });
    }
    // Elf Obligation if applicable
    if (elfChar) {
      items.push({ group: 'Species', label: 'Elf Obligation' });
    }
    // Custom option
    items.push({ group: 'Other', label: '✏️ Custom (free text)' });
    return items;
  };

  const handleNewPeriod = () => {
    const period = createDowntimePeriod(character.status, endeavours.length);
    updateCharacter((c) => ({
      ...c,
      endeavours: addDowntimePeriod(c.endeavours, period),
    }));
  };

  const handleDeletePeriod = (periodId: number) => {
    updateCharacter((c) => ({
      ...c,
      endeavours: removeDowntimePeriodFn(c.endeavours, periodId),
    }));
    setDeletingPeriodId(null);
  };

  const handleSelectEndeavour = (periodId: number, item: PickerItem) => {
    if (item.label === '✏️ Custom (free text)') {
      setAddingToPeriodId(null);
      setCustomForPeriodId(periodId);
      setCustomInput('');
      return;
    }
    const entry: EndeavourEntry = {
      id: Date.now(),
      type: item.label,
      notes: '',
      completed: false,
    };
    updateCharacter((c) => ({
      ...c,
      endeavours: addEndeavourEntry(c.endeavours, periodId, entry),
    }));
    setAddingToPeriodId(null);
  };

  const handleAddCustom = () => {
    if (!customInput.trim() || customForPeriodId === null) return;
    const entry: EndeavourEntry = {
      id: Date.now(),
      type: customInput.trim(),
      notes: '',
      completed: false,
    };
    const pid = customForPeriodId;
    updateCharacter((c) => ({
      ...c,
      endeavours: addEndeavourEntry(c.endeavours, pid, entry),
    }));
    setCustomInput('');
    setCustomForPeriodId(null);
  };

  return (
    <div className={styles.sectionGap}>
      {/* Page header with New Downtime Period button */}
      <Card>
        <SectionHeader
          icon={CalendarCheck}
          title="Endeavours Tracker"
          action={<AddButton label="New Downtime Period" onClick={handleNewPeriod} />}
        />
        {endeavours.length === 0 && (
          <p className={styles.emptyMessage}>
            No downtime periods yet. Create one to start tracking Endeavours.
          </p>
        )}
      </Card>


      {/* Render each DowntimePeriod as a Card */}
      {endeavours.map((period) => {
        const used = period.entries.length;
        const total = period.slots;
        const allFilled = used === total && total > 0;
        const exceeded = used > total;

        return (
          <Card key={period.id}>
            {/* Period header: label, slots, delete */}
            <div className={styles.periodHeader}>
              <div className={styles.periodLabelField}>
                <EditableField
                  label="Period Label"
                  value={period.label}
                  onSave={(v) =>
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'label', String(v)),
                    }))
                  }
                />
              </div>
              <div className={styles.periodSlotGroup}>
                <EditableField
                  label="Slots"
                  value={period.slots}
                  type="number"
                  onSave={(v) =>
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'slots', Math.max(0, Number(v))),
                    }))
                  }
                  style={{ width: '60px' }}
                />
                <span className={styles.slotBadge} style={{
                  background: exceeded ? 'rgba(200,80,80,0.15)' : allFilled ? 'rgba(90,154,90,0.15)' : 'var(--bg-tertiary)',
                  color: exceeded ? 'var(--danger)' : allFilled ? 'var(--success)' : 'var(--text-secondary)',
                  border: `1px solid ${exceeded ? 'var(--danger)' : allFilled ? 'var(--success)' : 'var(--border)'}`,
                }}>
                  {used}/{total}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeletingPeriodId(period.id)}
                className={styles.removeBtn}
                title="Delete period"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Status parse warning */}
            {period.statusWarning && (
              <div className={styles.warningBoxStatus}>
                <AlertTriangle size={14} />
                <span>Status could not be parsed — defaulted to 1 slot. You can edit the slot count manually.</span>
              </div>
            )}

            {/* Elf obligation reminder */}
            {elfChar && (
              <div className={styles.warningBoxElf}>
                <Info size={14} />
                <span>Elf characters must spend one Endeavour maintaining contact with their people.</span>
              </div>
            )}

            {/* All slots filled indicator */}
            {allFilled && !exceeded && (
              <div className={styles.warningBoxFilled}>
                <Check size={14} />
                <span>All slots filled.</span>
              </div>
            )}

            {/* Slots exceeded warning */}
            {exceeded && (
              <div className={styles.warningBoxExceeded}>
                <AlertTriangle size={14} />
                <span>Slots exceeded — {used} entries for {total} slot{total !== 1 ? 's' : ''}.</span>
              </div>
            )}

            {/* Endeavour entries list */}
            <div className={styles.entriesList}>
              {period.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={entry.completed ? styles.entryRowCompleted : styles.entryRow}
                >
                  <input
                    type="checkbox"
                    checked={entry.completed}
                    onChange={() =>
                      updateCharacter((c) => ({
                        ...c,
                        endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'completed', !entry.completed),
                      }))
                    }
                    className={styles.checkbox}
                    title={entry.completed ? 'Mark as pending' : 'Mark as completed'}
                  />
                  <span className={entry.completed ? styles.entryTypeCompleted : styles.entryType}>
                    {entry.type}
                  </span>
                  <input
                    type="text"
                    value={entry.notes}
                    onChange={(e) =>
                      updateCharacter((c) => ({
                        ...c,
                        endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'notes', e.target.value),
                      }))
                    }
                    placeholder="Notes..."
                    className={entry.completed ? styles.notesInputCompleted : styles.notesInput}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCharacter((c) => ({
                        ...c,
                        endeavours: removeEndeavourEntry(c.endeavours, period.id, entry.id),
                      }))
                    }
                    className={styles.removeBtn}
                    title="Remove endeavour"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {period.entries.length === 0 && (
                <p className={styles.emptyEntries}>
                  No endeavours yet. Add one below.
                </p>
              )}
            </div>

            {/* Add Endeavour button */}
            <AddButton label="Add Endeavour" onClick={() => setAddingToPeriodId(period.id)} />

            {/* Endeavour type picker */}
            {addingToPeriodId === period.id && (
              <Picker<PickerItem>
                items={buildPickerItems()}
                getLabel={(item) => `[${item.group}] ${item.label}`}
                onSelect={(item) => handleSelectEndeavour(period.id, item)}
                onClose={() => setAddingToPeriodId(null)}
                title="Select Endeavour Type"
              />
            )}
          </Card>
        );
      })}

      {/* Custom free-text input dialog */}
      {customForPeriodId !== null && (
        <div className={styles.customOverlay} onClick={() => setCustomForPeriodId(null)} role="dialog" aria-label="Custom Endeavour">
          <div className={styles.customDialog} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.customTitle}>Custom Endeavour</h3>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); if (e.key === 'Escape') setCustomForPeriodId(null); }}
              placeholder="Enter endeavour type..."
              autoFocus
              className={styles.customInput}
            />
            <div className={styles.customActions}>
              <button type="button" onClick={() => setCustomForPeriodId(null)} className={styles.cancelBtn}>Cancel</button>
              <button type="button" onClick={handleAddCustom} className={styles.addBtn}>Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete period confirmation dialog */}
      {deletingPeriodId !== null && (
        <ConfirmDialog
          message="Delete this downtime period and all its endeavour entries?"
          onConfirm={() => handleDeletePeriod(deletingPeriodId)}
          onCancel={() => setDeletingPeriodId(null)}
          confirmLabel="Delete"
          cancelLabel="Cancel"
        />
      )}
    </div>
  );
}
