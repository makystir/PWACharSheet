import { useState } from 'react';
import type { CSSProperties } from 'react';
import type { Character, ArmourPoints, EndeavourEntry } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Picker } from '../shared/Picker';
import { CalendarCheck, Trash2, AlertTriangle, Info, Check } from 'lucide-react';
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

const sectionGap: CSSProperties = { display: 'flex', flexDirection: 'column', gap: '16px' };

const slotBadge: CSSProperties = {
  fontSize: '12px',
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 'var(--radius-sm)',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
};

const warningBox: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '12px',
  marginBottom: '8px',
};

const entryRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 10px',
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-sm)',
};

const removeBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--danger)',
  cursor: 'pointer',
  padding: '4px',
  display: 'flex',
  alignItems: 'center',
};

const checkboxStyle: CSSProperties = {
  width: '18px',
  height: '18px',
  cursor: 'pointer',
  accentColor: 'var(--success)',
};

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
    <div style={sectionGap}>
      {/* Page header with New Downtime Period button */}
      <Card>
        <SectionHeader
          icon={CalendarCheck}
          title="Endeavours Tracker"
          action={<AddButton label="New Downtime Period" onClick={handleNewPeriod} />}
        />
        {endeavours.length === 0 && (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
              <div style={{ flex: 1 }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                <span style={{
                  ...slotBadge,
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
                style={removeBtnStyle}
                title="Delete period"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* Status parse warning */}
            {period.statusWarning && (
              <div style={{ ...warningBox, background: 'rgba(200,168,50,0.1)', border: '1px solid rgba(200,168,50,0.3)', color: 'var(--warning, #c8a832)' }}>
                <AlertTriangle size={14} />
                <span>Status could not be parsed — defaulted to 1 slot. You can edit the slot count manually.</span>
              </div>
            )}

            {/* Elf obligation reminder */}
            {elfChar && (
              <div style={{ ...warningBox, background: 'rgba(100,140,200,0.1)', border: '1px solid rgba(100,140,200,0.3)', color: 'var(--text-secondary)' }}>
                <Info size={14} />
                <span>Elf characters must spend one Endeavour maintaining contact with their people.</span>
              </div>
            )}

            {/* All slots filled indicator */}
            {allFilled && !exceeded && (
              <div style={{ ...warningBox, background: 'rgba(90,154,90,0.1)', border: '1px solid rgba(90,154,90,0.3)', color: 'var(--success)' }}>
                <Check size={14} />
                <span>All slots filled.</span>
              </div>
            )}

            {/* Slots exceeded warning */}
            {exceeded && (
              <div style={{ ...warningBox, background: 'rgba(200,80,80,0.1)', border: '1px solid rgba(200,80,80,0.3)', color: 'var(--danger)' }}>
                <AlertTriangle size={14} />
                <span>Slots exceeded — {used} entries for {total} slot{total !== 1 ? 's' : ''}.</span>
              </div>
            )}

            {/* Endeavour entries list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
              {period.entries.map((entry) => (
                <div
                  key={entry.id}
                  style={{
                    ...entryRow,
                    opacity: entry.completed ? 0.6 : 1,
                  }}
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
                    style={checkboxStyle}
                    title={entry.completed ? 'Mark as pending' : 'Mark as completed'}
                  />
                  <span style={{
                    fontWeight: 600,
                    fontSize: '13px',
                    color: 'var(--parchment)',
                    minWidth: '100px',
                    textDecoration: entry.completed ? 'line-through' : 'none',
                  }}>
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
                    style={{
                      flex: 1,
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: entry.completed ? 'var(--text-muted)' : 'var(--text-primary)',
                      padding: '4px 8px',
                      fontSize: '12px',
                      textDecoration: entry.completed ? 'line-through' : 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateCharacter((c) => ({
                        ...c,
                        endeavours: removeEndeavourEntry(c.endeavours, period.id, entry.id),
                      }))
                    }
                    style={removeBtnStyle}
                    title="Remove endeavour"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {period.entries.length === 0 && (
                <p style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', textAlign: 'center', padding: '8px' }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setCustomForPeriodId(null)} role="dialog" aria-label="Custom Endeavour">
          <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--card-border)', borderRadius: 'var(--radius-lg)', padding: '16px', width: '90%', maxWidth: '360px', display: 'flex', flexDirection: 'column', gap: '12px' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontFamily: 'var(--font-heading)', color: 'var(--parchment)', margin: 0, fontSize: '16px' }}>Custom Endeavour</h3>
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); if (e.key === 'Escape') setCustomForPeriodId(null); }}
              placeholder="Enter endeavour type..."
              autoFocus
              style={{ padding: '8px 12px', background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setCustomForPeriodId(null)} style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Cancel</button>
              <button type="button" onClick={handleAddCustom} style={{ padding: '8px 16px', background: 'var(--accent-gold-dark)', border: 'none', borderRadius: 'var(--radius-sm)', color: 'var(--bg-primary)', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Add</button>
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
