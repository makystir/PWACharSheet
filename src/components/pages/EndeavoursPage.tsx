import { useState, useCallback } from 'react';
import type { Character, EntryStatus, DowntimePeriod, EndeavourEntry } from '../../types/character';
import { Card } from '../shared/Card';
import { SectionHeader } from '../shared/SectionHeader';
import { EditableField } from '../shared/EditableField';
import { AddButton } from '../shared/AddButton';
import { ConfirmDialog } from '../shared/ConfirmDialog';
import { Picker } from '../shared/Picker';
import { CalendarCheck, Trash2, AlertTriangle, Info, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { EmptyState } from '../shared/EmptyState';
import { HelpPopover } from '../shared/HelpPopover';
import { getHelpContent } from '../../logic/help-content';
import styles from './EndeavoursPage.module.css';
import { Toast } from '../shared/Toast';
import { useUndoToast } from '../../hooks/useUndoToast';
import { removeAtIndex, restoreAtIndex } from '../../logic/undo';
import {
  createDowntimePeriod,
  addDowntimePeriod,
  removeDowntimePeriod as removeDowntimePeriodFn,
  addEndeavourEntry,
  removeEndeavourEntry,
  updateEndeavourEntry,
  updateDowntimePeriod,
  movePeriodUp,
  movePeriodDown,
  moveEntryUp,
  moveEntryDown,
  validateSessionNumber,
  isElf,
  cycleStatus,
  migrateEntryStatus,
  getCostSummary,
  buildPickerItems,
  createEndeavourEntry,
  getMaxSessionNumber,
} from '../../logic/endeavours';
import type { PickerItem } from '../../logic/endeavours';

interface EndeavoursPageProps {
  character: Character;
  update: (field: string, value: unknown) => void;
  updateCharacter: (mutator: (char: Character) => Character) => void;
}

/** Get the CSS class for an entry row based on its status */
function getEntryRowClass(status: EntryStatus): string {
  if (status === 'in_progress') return styles.entryRowInProgress;
  if (status === 'completed') return styles.entryRowCompleted;
  return styles.entryRow;
}

/** Get the CSS class for the status cycling button */
function getStatusBtnClass(status: EntryStatus): string {
  if (status === 'in_progress') return styles.statusBtnInProgress;
  if (status === 'completed') return styles.statusBtnCompleted;
  return styles.statusBtn;
}

/** Get the visual indicator for a status */
function getStatusIndicator(status: EntryStatus): string {
  if (status === 'in_progress') return '◐';
  if (status === 'completed') return '✓';
  return '○';
}

/** Get accessible title for the status button */
function getStatusTitle(status: EntryStatus): string {
  if (status === 'pending') return 'Status: Pending — click to set In Progress';
  if (status === 'in_progress') return 'Status: In Progress — click to set Completed';
  return 'Status: Completed — click to set Pending';
}

const TOOLTIP_STORAGE_KEY = 'wfrp-hint-dismissed-status-tooltip';

export function EndeavoursPage({ character, updateCharacter }: EndeavoursPageProps) {
  const [deletingPeriodId, setDeletingPeriodId] = useState<string | null>(null);
  const [addingToPeriodId, setAddingToPeriodId] = useState<string | null>(null);
  const [customForPeriodId, setCustomForPeriodId] = useState<string | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { show: showUndo, undo, pending: undoPending } = useUndoToast();

  const [firstUseDismissed, setFirstUseDismissed] = useState(() => {
    try {
      return localStorage.getItem('wfrp-hint-dismissed-endeavours-first-use') === 'true';
    } catch {
      return false;
    }
  });

  const dismissFirstUseBanner = () => {
    setFirstUseDismissed(true);
    try {
      localStorage.setItem('wfrp-hint-dismissed-endeavours-first-use', 'true');
    } catch {
      // Graceful fallback
    }
  };
  const [statusTooltipDismissed, setStatusTooltipDismissed] = useState(() => {
    try {
      return localStorage.getItem(TOOLTIP_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const dismissStatusTooltip = useCallback(() => {
    setStatusTooltipDismissed(true);
    try {
      localStorage.setItem(TOOLTIP_STORAGE_KEY, 'true');
    } catch {
      // localStorage unavailable — dismiss for this session only
    }
  }, []);

  const endeavours = character.endeavours || [];
  const elfChar = isElf(character.species);

  const handleNewPeriod = () => {
    const period = createDowntimePeriod(character.status, endeavours);
    updateCharacter((c) => ({
      ...c,
      endeavours: addDowntimePeriod(c.endeavours, period),
    }));
    setToastMessage('Period added');
  };

  const handleDeletePeriod = (periodId: string) => {
    const periodIndex = endeavours.findIndex((p) => p.id === periodId);
    const period = endeavours[periodIndex];

    if (period && period.entries.length > 0) {
      // Multi-item deletion: period has entries, use ConfirmDialog
      updateCharacter((c) => ({
        ...c,
        endeavours: removeDowntimePeriodFn(c.endeavours, periodId),
      }));
      setDeletingPeriodId(null);
      setToastMessage('Period removed');
    } else if (period) {
      // Single-item deletion: period with 0 entries, use undo toast
      updateCharacter((c) => ({
        ...c,
        endeavours: removeAtIndex(c.endeavours || [], periodIndex),
      }));
      setDeletingPeriodId(null);
      showUndo('Period removed', period, periodIndex, (item, index) => {
        updateCharacter((c) => ({
          ...c,
          endeavours: restoreAtIndex(c.endeavours || [], item as DowntimePeriod, index),
        }));
      });
    }
  };

  const handleDeleteEntry = (periodId: string, entryId: string) => {
    const period = endeavours.find((p) => p.id === periodId);
    if (!period) return;
    const entryIndex = period.entries.findIndex((e) => e.id === entryId);
    const entry = period.entries[entryIndex];
    if (entryIndex < 0 || !entry) return;

    // Single-item deletion: use undo toast
    updateCharacter((c) => ({
      ...c,
      endeavours: removeEndeavourEntry(c.endeavours, periodId, entryId),
    }));
    showUndo('Entry removed', entry, entryIndex, (item, index) => {
      updateCharacter((c) => ({
        ...c,
        endeavours: (c.endeavours || []).map((p) =>
          p.id === periodId
            ? { ...p, entries: restoreAtIndex(p.entries, item as EndeavourEntry, index) }
            : p
        ),
      }));
    });
  };

  const handleSelectEndeavour = (periodId: string, item: PickerItem) => {
    if (item.label === '✏️ Custom (free text)') {
      setAddingToPeriodId(null);
      setCustomForPeriodId(periodId);
      setCustomInput('');
      return;
    }
    const entry = createEndeavourEntry(item.label);
    updateCharacter((c) => ({
      ...c,
      endeavours: addEndeavourEntry(c.endeavours, periodId, entry),
    }));
    setAddingToPeriodId(null);
    setToastMessage('Endeavour added');
  };

  const handleAddCustom = () => {
    if (!customInput.trim() || customForPeriodId === null) return;
    const entry = createEndeavourEntry(customInput.trim());
    const pid = customForPeriodId;
    updateCharacter((c) => ({
      ...c,
      endeavours: addEndeavourEntry(c.endeavours, pid, entry),
    }));
    setCustomInput('');
    setCustomForPeriodId(null);
    setToastMessage('Endeavour added');
  };

  return (
    <div className={styles.sectionGap}>
      {/* First-use banner explaining Status → slots relationship */}
      {!firstUseDismissed && (
        <div className={styles.firstUseBanner}>
          <Info size={16} aria-hidden="true" />
          <span className={styles.firstUseBannerText}>
            Your Status tier determines how many endeavour slots you get per downtime period: Gold = 3, Silver = 2, Brass = 1.
          </span>
          <button
            type="button"
            className={styles.firstUseBannerClose}
            onClick={dismissFirstUseBanner}
            aria-label="Dismiss hint"
          >
            ✕
          </button>
        </div>
      )}

      {/* Page header with New Downtime Period button */}
      <Card>
        <SectionHeader
          icon={CalendarCheck}
          title="Endeavours Tracker"
          action={<AddButton label="New Downtime Period" onClick={handleNewPeriod} />}
        />
        {getMaxSessionNumber(endeavours) != null && (
          <div className={styles.lastSessionLabel}>
            Last session: {getMaxSessionNumber(endeavours)}
          </div>
        )}
        {endeavours.length === 0 && (
          <EmptyState
            icon={CalendarCheck}
            heading="No downtime periods"
            description="Create one to start tracking Endeavours."
            action={{ label: 'New Period', onClick: handleNewPeriod }}
          />
        )}
      </Card>


      {/* Render each DowntimePeriod as a Card */}
      {endeavours.map((period) => {
        const used = period.entries.length;
        const total = period.slots;
        const allFilled = used === total && total > 0;
        const exceeded = used > total;
        const costSummary = getCostSummary(period.entries);

        return (
          <Card key={period.id}>
            {/* Period header: label, date, session, slots, delete */}
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
              <span className={styles.slotBadge} style={{
                background: exceeded ? 'rgba(200,80,80,0.15)' : allFilled ? 'rgba(90,154,90,0.15)' : 'var(--bg-tertiary)',
                color: exceeded ? 'var(--danger)' : allFilled ? 'var(--success)' : 'var(--text-secondary)',
                border: `1px solid ${exceeded ? 'var(--danger)' : allFilled ? 'var(--success)' : 'var(--border)'}`,
              }}>
                {used}/{total}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (period.entries.length > 0) {
                    // Multi-item: show confirm dialog
                    setDeletingPeriodId(period.id);
                  } else {
                    // Single-item (empty period): use undo toast directly
                    handleDeletePeriod(period.id);
                  }
                }}
                className={styles.removeBtn}
                title="Delete period"
              >
                <Trash2 size={16} />
              </button>
              <input
                type="date"
                value={period.date || ''}
                onChange={(e) =>
                  updateCharacter((c) => ({
                    ...c,
                    endeavours: updateDowntimePeriod(c.endeavours, period.id, 'date', e.target.value || undefined),
                  }))
                }
                className={styles.periodDateInput}
                title="Period date"
                aria-label="Period date"
              />
              <input
                type="number"
                min={1}
                max={9999}
                value={period.sessionNumber ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') {
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'sessionNumber', undefined),
                    }));
                  } else {
                    const validated = validateSessionNumber(val);
                    if (validated !== null) {
                      updateCharacter((c) => ({
                        ...c,
                        endeavours: updateDowntimePeriod(c.endeavours, period.id, 'sessionNumber', validated),
                      }));
                    }
                  }
                }}
                placeholder="Session #"
                className={styles.periodSessionInput}
                title="Session number"
                aria-label="Session number"
              />
              <div className={styles.periodSlotsField}>
                <EditableField
                  label="Slots"
                  value={period.slots}
                  type="number"
                  mode="always-editable"
                  onSave={(v) =>
                    updateCharacter((c) => ({
                      ...c,
                      endeavours: updateDowntimePeriod(c.endeavours, period.id, 'slots', Math.max(0, Number(v))),
                    }))
                  }
                  style={{ width: '60px' }}
                />
                <HelpPopover concept="slot-calculation">{getHelpContent('slot-calculation')}</HelpPopover>
              </div>
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
            {/* Status legend — always visible above entries */}
            <div className={styles.statusLegend}>
              <span className={styles.statusLegendItem}>
                <span className={styles.statusLegendIcon}>○</span> Pending
              </span>
              <span className={styles.statusLegendItem}>
                <span className={styles.statusLegendIcon}>◐</span> In Progress
              </span>
              <span className={styles.statusLegendItem}>
                <span className={styles.statusLegendIcon}>✓</span> Completed
              </span>
            </div>

            {/* First-entry tooltip — shown once when first entry exists and not dismissed */}
            {period.entries.length > 0 && !statusTooltipDismissed && (
              <div className={styles.statusTooltipWrapper}>
                <div className={styles.statusTooltip}>
                  <span className={styles.statusTooltipText}>
                    ○ Pending → ◐ In Progress → ✓ Completed. Click to cycle.
                  </span>
                  <button
                    type="button"
                    className={styles.statusTooltipClose}
                    onClick={dismissStatusTooltip}
                    title="Dismiss hint"
                    aria-label="Dismiss status cycling hint"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            <div className={styles.entriesList}>
              {period.entries.map((rawEntry) => {
                const entry = migrateEntryStatus(rawEntry);
                return (
                  <div
                    key={entry.id}
                    className={getEntryRowClass(entry.status)}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'status', cycleStatus(entry.status)),
                        }))
                      }
                      className={getStatusBtnClass(entry.status)}
                      title={getStatusTitle(entry.status)}
                      aria-label={getStatusTitle(entry.status)}
                    >
                      {getStatusIndicator(entry.status)}
                    </button>
                    <span className={entry.status === 'completed' ? styles.entryTypeCompleted : styles.entryType}>
                      {entry.type}
                    </span>
                    <input
                      type="text"
                      value={entry.cost || ''}
                      onChange={(e) =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: updateEndeavourEntry(c.endeavours, period.id, entry.id, 'cost', e.target.value),
                        }))
                      }
                      maxLength={50}
                      placeholder="Cost..."
                      className={entry.status === 'completed' ? styles.costInputCompleted : styles.costInput}
                    />
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
                      className={entry.status === 'completed' ? styles.notesInputCompleted : styles.notesInput}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: moveEntryUp(c.endeavours, period.id, entry.id),
                        }))
                      }
                      className={styles.moveBtn}
                      title="Move up"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateCharacter((c) => ({
                          ...c,
                          endeavours: moveEntryDown(c.endeavours, period.id, entry.id),
                        }))
                      }
                      className={styles.moveBtn}
                      title="Move down"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(period.id, entry.id)}
                      className={styles.removeBtn}
                      title="Remove endeavour"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
              {period.entries.length === 0 && (
                <p className={styles.emptyEntries}>
                  No endeavours yet. Add one below.
                </p>
              )}
            </div>

            {/* Cost summary line */}
            {costSummary && (
              <div className={styles.costSummary}>
                Costs: {costSummary}
              </div>
            )}

            {/* Add Endeavour button */}
            <AddButton label="Add Endeavour" onClick={() => setAddingToPeriodId(period.id)} />

            {/* Endeavour type picker */}
            {addingToPeriodId === period.id && (
              <Picker<PickerItem>
                items={buildPickerItems(character.class, elfChar)}
                getLabel={(item) => item.label}
                getGroup={(item) => item.group}
                isDisabled={(item) => item.disabled === true}
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

      <Toast
        message={undoPending ? undoPending.message : toastMessage}
        duration={undoPending ? 5000 : 3000}
        action={undoPending ? { label: 'Undo', onAction: undo } : undefined}
      />
    </div>
  );
}

export default EndeavoursPage;
